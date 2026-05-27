import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createOpenAIProvider } from "@/lib/openai-provider";
import { packageSchema, type ParsedPackage } from "@/lib/package-schema";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PRICE_THRESHOLD = 30;

const REGEN_ALL_PATTERNS = [
  /alle\s+pakete/i,
  /neue\s+vorschl/i,
  /regenerate\s+all/i,
  /மூன்றையும்/,
  /all\s+packages/i,
];

const requestSchema = z.object({
  selectedPackage: packageSchema.extend({
    id: z.string().optional(),
    bookingLinks: z
      .object({
        hotel: z.string().optional(),
        flight: z.string().optional(),
        activities: z.string().optional(),
      })
      .optional(),
  }),
  changeRequest: z.string().min(1).max(2000),
  userConfirmedBudget: z.boolean().optional().default(false),
  tripBrief: z.string().max(4000).optional(),
});

const REFINER_SYSTEM = `You are the Package Refiner for Weltweit Urlaub.
You receive ONE existing travel package and a German change request from the user.
Return the FULL refined package as a single JSON object that strictly matches the schema.
Rules:
- All user-facing strings (title, destination, summary, whyItFits, hotel, flight, mealPlan, badges, activities, itinerary titles & descriptions) MUST be in GERMAN.
- Keep the same destination unless the user explicitly asks to change it.
- Keep the same package "type" (basic/medium/premium).
- Update price realistically based on the change (cheaper hotel → lower, more luxury → higher).
- itinerary length must equal the duration in days.
- matchScore: integer 80–98. rating: 4.0–4.9. reviews: 200–3000.
- Do NOT include bookingLinks — they are added separately.
Also produce a short German "changeSummary" (1–2 sentences) describing what changed compared to the original.

Return ONLY a valid JSON object with this exact shape, no prose, no markdown, no code fences:
{ "package": { ...full package object... }, "changeSummary": "..." }`;

function placeholderLinks(destination: string) {
  const q = encodeURIComponent(destination);
  return {
    hotel: `https://www.booking.com/searchresults.html?ss=${q}`,
    flight: `https://www.skyscanner.de/`,
    activities: `https://www.getyourguide.de/s/?q=${q}`,
  };
}

function isUuid(v: string | undefined): boolean {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export const Route = createFileRoute("/api/refine-package")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { status: "error", message: "Ungültige Anfrage." },
            { status: 400 },
          );
        }
        const { selectedPackage, changeRequest, userConfirmedBudget, tripBrief } = parsed.data;

        // Block regenerate-all from detail page (per spec §10).
        if (REGEN_ALL_PATTERNS.some((re) => re.test(changeRequest))) {
          return Response.json({
            status: "rejected",
            message:
              "Um alle 3 Pakete neu zu erstellen, starte bitte einen neuen Reisewunsch im Chat.",
          });
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) {
          return Response.json(
            { status: "error", message: "OpenAI nicht konfiguriert." },
            { status: 500 },
          );
        }

        const openai = createOpenAIProvider(key);
        const model = openai("gpt-4o-mini");

        const originalForPrompt = JSON.stringify(
          { ...selectedPackage, bookingLinks: undefined, id: undefined },
          null,
          2,
        );

        let proposed: ParsedPackage | null = null;
        let changeSummary = "Das Paket wurde angepasst.";
        try {
          const { text } = await generateText({
            model,
            system: REFINER_SYSTEM,
            prompt: `Reise-Briefing (Kontext):\n${tripBrief ?? "(kein zusätzliches Briefing)"}\n\nAktuelles Paket:\n${originalForPrompt}\n\nÄnderungswunsch des Nutzers:\n"""${changeRequest}"""\n\nGib das überarbeitete Paket als JSON zurück.`,
          });
          const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
          const start = cleaned.indexOf("{");
          const end = cleaned.lastIndexOf("}");
          const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
          const obj = JSON.parse(jsonStr) as { package?: unknown; changeSummary?: unknown };
          const pkg = packageSchema.safeParse(obj.package);
          if (!pkg.success) throw new Error("Schema validation failed");
          proposed = pkg.data;
          if (typeof obj.changeSummary === "string" && obj.changeSummary.trim()) {
            changeSummary = obj.changeSummary.trim();
          }
        } catch (err) {
          console.error("[refine-package] generation failed", err);
          return Response.json(
            {
              status: "error",
              message:
                "Entschuldigung, die Anpassung ist fehlgeschlagen. Bitte versuche es noch einmal.",
            },
            { status: 502 },
          );
        }

        // Preserve identity
        const oldPrice = Math.round(selectedPackage.price);
        const newPrice = Math.round(proposed.price);
        const priceDifference = newPrice - oldPrice;

        const proposedFull = {
          ...proposed,
          type: selectedPackage.type ?? proposed.type,
          currency: proposed.currency ?? selectedPackage.currency ?? "EUR",
          bookingLinks: placeholderLinks(proposed.destination),
        };

        // Price gate
        if (Math.abs(priceDifference) >= PRICE_THRESHOLD && !userConfirmedBudget) {
          return Response.json({
            status: "needs_confirmation",
            message: `Das angepasste Paket kostet ca. ${newPrice.toLocaleString("de-DE")} €. Möchtest du diese Änderung übernehmen?`,
            proposedPackage: proposedFull,
            oldPrice,
            newPrice,
            priceDifference,
            changeSummary,
          });
        }

        // Apply update — persist if we have a real DB id
        let savedId: string | undefined = selectedPackage.id;
        if (isUuid(selectedPackage.id)) {
          try {
            await supabaseAdmin
              .from("packages")
              .update({
                title: proposedFull.title,
                price: newPrice,
                rating: proposedFull.rating,
                match_score: Math.round(proposedFull.matchScore),
                summary: proposedFull.summary,
                data: { ...proposedFull, id: selectedPackage.id },
              })
              .eq("id", selectedPackage.id!);
          } catch {
            // non-fatal
          }
        }

        return Response.json({
          status: "updated",
          updatedPackage: { ...proposedFull, id: savedId ?? `refined-${Date.now()}` },
          changeSummary,
        });
      },
    },
  },
});
