import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  generateText,
  generateObject,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ChatRequestBody = { messages?: unknown };

const CONCIERGE_SYSTEM = `Du bist der Concierge von Weltweit Urlaub — warm, charmant, auf Deutsch.
Deine Aufgabe ist es, in 1–2 kurzen Fragen das Reisebriefing zu vervollständigen.
Pflichtangaben: Reiseziel ODER Urlaubsart, ungefähres Budget, Reisedauer (Tage), Anzahl Reisende, Abflughafen, Reisezeitraum.
Wenn etwas fehlt: stelle EINE freundliche, fokussierte Frage. Halte Antworten kurz und einladend.
Wenn alles vorhanden ist: bestätige knapp ("Perfekt — ich lasse mein Team jetzt 3 Pakete für dich entwerfen…") — nichts weiter.`;

const RESEARCH_SYSTEM = `You are the Research Agent. Given a German travel brief, output realistic plausible flights and hotels.
Concise bullet data only — no prose.

FLIGHTS:
- <airline> <route> <€price> <duration>
(2-3 options across price tiers)

HOTELS:
- <name> · <neighborhood> · <€/night> · <one-line vibe> · <star rating>
(3 options: budget / mid / luxury)`;

const ITINERARY_SYSTEM = `You are the Itinerary Architect. Build a day-by-day plan in GERMAN.
Use the duration from the brief (default 5 days). For each day output:
Tag N — <Thema>: Vormittag · Nachmittag · Abend (1 evocative line each).`;

// Zod schema mirrors src/types/travel.ts TravelPackage
const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
});

const bookingLinksSchema = z.object({
  hotel: z.string().url().optional(),
  flight: z.string().url().optional(),
  activities: z.string().url().optional(),
});

const packageSchema = z.object({
  type: z.enum(["basic", "medium", "premium"]).optional(),
  title: z.string(),
  destination: z.string(),
  price: z.number(),
  currency: z.string().optional(),
  rating: z.number().min(0).max(5),
  reviews: z.number().int().min(0),
  matchScore: z.number().min(0).max(100),
  duration: z.string(),
  hotel: z.string(),
  flight: z.string(),
  mealPlan: z.string().optional(),
  summary: z.string(),
  whyItFits: z.string().optional(),
  badges: z.array(z.string()).min(1),
  activities: z.array(z.string()).min(1),
  itinerary: z.array(itineraryDaySchema).min(1),
});

const TIER_ORDER: Array<"basic" | "medium" | "premium"> = ["basic", "medium", "premium"];

function isPlanningRequest(text: string, history: string): boolean {
  const all = `${history}\n${text}`.toLowerCase();
  const hasBudget = /\b\d{2,5}\s?(€|eur|euro|usd|\$)/i.test(all) || /budget/i.test(all);
  const hasDestOrType =
    /\b(in|nach|to|trip|reise|urlaub|holiday|vacation|strand|berge|städt|city|insel|island)\b/.test(all);
  const longEnough = all.split(/\s+/).length > 8;
  return hasBudget && hasDestOrType && longEnough;
}

function placeholderLinks(destination: string) {
  const q = encodeURIComponent(destination);
  return {
    hotel: `https://www.booking.com/searchresults.html?ss=${q}`,
    flight: `https://www.skyscanner.de/transport/fluge-nach/${q}/`,
    activities: `https://www.getyourguide.de/s/?q=${q}`,
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");
        const uiMessages = messages as UIMessage[];

        const textOf = (m: UIMessage) =>
          m.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastUserText = lastUser ? textOf(lastUser) : "";
        const fullHistory = uiMessages.map(textOf).join("\n");

        const modelMessages = await convertToModelMessages(uiMessages);

        // Concierge mode
        if (!isPlanningRequest(lastUserText, fullHistory)) {
          const result = streamText({
            model,
            system: CONCIERGE_SYSTEM,
            messages: modelMessages,
          });
          return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
        }

        // Multi-agent: research → itinerary → packager (structured)
        const brief = `${fullHistory}\n\nLetzte Nachricht: ${lastUserText}`;

        const research = await generateText({
          model,
          system: RESEARCH_SYSTEM,
          prompt: `Travel brief:\n"""${brief}"""\nProduce flights & hotels.`,
        });

        const itinerary = await generateText({
          model,
          system: ITINERARY_SYSTEM,
          prompt: `Brief:\n${brief}\n\nResearch:\n${research.text}\n\nBuild the itinerary in German.`,
        });

        const PACKAGER_SYSTEM = `You are the Packager Agent for Weltweit Urlaub.
Produce EXACTLY 3 travel packages in this order: basic, medium, premium.
- basic price ≈ user budget × 0.85
- medium price ≈ user budget × 1.0
- premium price ≈ user budget × 1.15
All user-facing strings (title, destination, summary, whyItFits, hotel, flight, mealPlan, badges, activities, itinerary titles & descriptions) MUST be in GERMAN.
matchScore: integer 80–98, premium highest.
rating: 4.0–4.9. reviews: 200–3000.
duration: e.g. "7 Tage".
badges: short German tags like "Direktflug", "Strandnähe", "Frühstück inklusive".
itinerary length must equal duration in days.
Use realistic data drawn from the research output below.
Do NOT include bookingLinks — they are added separately.`;

        const { object } = await generateObject({
          model,
          system: PACKAGER_SYSTEM,
          schema: packagesSchema,
          prompt: `Brief:\n${brief}\n\nResearch:\n${research.text}\n\nItinerary draft:\n${itinerary.text}\n\nReturn 3 packages.`,
        });

        // Persist trip request + packages
        let tripRequestId: string | undefined;
        try {
          const { data: tr } = await supabaseAdmin
            .from("trip_requests")
            .insert({ raw_brief: brief, destination: object.packages[0]?.destination ?? null })
            .select("id")
            .single();
          tripRequestId = tr?.id;
        } catch {
          // non-fatal
        }

        const packagesWithLinks = object.packages.map((p) => ({
          ...p,
          bookingLinks: placeholderLinks(p.destination),
        }));

        const inserted: { id: string }[] = [];
        if (tripRequestId) {
          try {
            const rows = packagesWithLinks.map((p) => ({
              trip_request_id: tripRequestId,
              package_type: p.type,
              title: p.title,
              price: p.price,
              rating: p.rating,
              match_score: p.matchScore,
              summary: p.summary,
              data: p,
            }));
            const { data: ins } = await supabaseAdmin
              .from("packages")
              .insert(rows)
              .select("id");
            if (ins) inserted.push(...ins);
          } catch {
            // non-fatal
          }
        }

        const finalPackages = packagesWithLinks.map((p, i) => ({
          ...p,
          id: inserted[i]?.id ?? `${p.type}-${Date.now()}-${i}`,
        }));

        const payload = {
          status: "packages_ready" as const,
          tripRequestId,
          packages: finalPackages,
        };

        // Stream a German intro + a fenced JSON block for the client to parse.
        const intro = `Perfekt ✨ Mein Team hat **3 Pakete** für dich entworfen — Basic, Medium und Premium. Schau sie dir gleich an…`;
        const finalText = `${intro}\n\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``;

        const result = streamText({
          model,
          system: "Repeat the user's text VERBATIM. Do not add or change anything.",
          prompt: finalText,
        });
        return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
      },
    },
  },
});
