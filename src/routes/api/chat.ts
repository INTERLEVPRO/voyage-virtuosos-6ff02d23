import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  generateText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { createOpenAIProvider } from "@/lib/openai-provider";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { packageSchema, type ParsedPackage } from "@/lib/package-schema";


type ChatRequestBody = { messages?: unknown };

const CONCIERGE_SYSTEM = `Du bist der Concierge von Weltweit Urlaub — warm, charmant, auf Deutsch.
Deine Aufgabe ist es, in 1–2 kurzen Fragen das Reisebriefing zu vervollständigen.
Pflichtangaben: Reiseziel ODER Urlaubsart, ungefähres Budget, Reisedauer (Tage), Anzahl Reisende, Abflughafen.
OPTIONAL (nur fragen wenn der Nutzer es selbst erwähnt): Reisezeitraum.

WICHTIG zum Reisezeitraum:
- Der Reisezeitraum ist KEINE Pflichtangabe. Frage NICHT aktiv danach.
- Wenn der Nutzer von sich aus etwas erwähnt, akzeptiere jede vage Angabe sofort als vollständig: Monat ("Juli"), Saison ("Sommer"), Zeitraum ("Juli–August"), relativ ("nächsten Monat", "in 3 Monaten", "nächstes Jahr"), "flexibel" oder "egal".
- Frage NIEMALS nach einem exakten Datum.
- Behandle "Reisezeitraum" / "travel time" NIEMALS als fehlendes Feld. Wenn nur diese Angabe fehlt, gilt das Briefing als vollständig.

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
    flight: `https://www.skyscanner.de/`,
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

        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("OPENAI_API_KEY missing", { status: 500 });

        const openai = createOpenAIProvider(key);
        const model = openai("gpt-4o-mini");
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
Wenn der Nutzer nur einen vagen Reisezeitraum angegeben hat (Saison, Monat, Bereich oder "flexibel"), wähle intern einen plausiblen Monat innerhalb dieses Fensters für saisonale Aktivitäten — gib aber KEIN konkretes Start-/Enddatum im Paket aus. "duration" bleibt rein in Tagen.
Do NOT include bookingLinks — they are added separately.`;

        let rawPackages: ParsedPackage[] = [];
        try {
          const { text } = await generateText({
            model,
            system: `${PACKAGER_SYSTEM}\n\nReturn ONLY a valid JSON array of 3 package objects. No prose, no markdown, no code fences. Each object MUST contain: title, destination, price (number), rating (0-5), reviews (int), matchScore (0-100), duration, hotel, flight, summary, badges (string[]), activities (string[]), itinerary (array of {day:int,title,description}). Optional: type, currency, mealPlan, whyItFits.`,
            prompt: `Brief:\n${brief}\n\nResearch:\n${research.text}\n\nItinerary draft:\n${itinerary.text}\n\nReturn EXACTLY 3 packages as a JSON array, in order: basic, medium, premium.`,
          });
          // Strip optional code fences
          const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
          // Find first '[' to last ']' to be defensive
          const start = cleaned.indexOf("[");
          const end = cleaned.lastIndexOf("]");
          const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
          const parsed = JSON.parse(jsonStr);
          const arr = Array.isArray(parsed) ? parsed : [];
          rawPackages = arr
            .map((p) => packageSchema.safeParse(p))
            .filter((r) => r.success)
            .map((r) => (r as { success: true; data: ParsedPackage }).data);
          if (rawPackages.length === 0) throw new Error("No valid packages parsed");
        } catch (err) {
          console.error("[packager] generation failed", err);
          return new Response(
            "Entschuldigung, die Paketerstellung ist fehlgeschlagen. Bitte versuche es noch einmal.",
            { status: 502 },
          );
        }

        // Ensure exactly 3 packages, assign tier by index.
        const trimmed = rawPackages.slice(0, 3);
        while (trimmed.length < 3 && trimmed.length > 0) {
          trimmed.push(trimmed[trimmed.length - 1]);
        }
        const normalized = trimmed.map((p, i) => ({
          ...p,
          type: TIER_ORDER[i],
          currency: p.currency ?? "EUR",
        }));

        // Persist trip request + packages
        let tripRequestId: string | undefined;
        try {
          const { data: tr } = await supabaseAdmin
            .from("trip_requests")
            .insert({ raw_brief: brief, destination: normalized[0]?.destination ?? null })
            .select("id")
            .single();
          tripRequestId = tr?.id;
        } catch {
          // non-fatal
        }

        const packagesWithLinks = normalized.map((p) => ({
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
              price: Math.round(p.price),
              rating: p.rating,
              match_score: Math.round(p.matchScore),
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

        // Deterministic UI message stream — no model call to repeat content.
        const intro = `Perfekt ✨ Mein Team hat **3 Pakete** für dich entworfen — Basic, Medium und Premium. Schau sie dir gleich an…`;
        const finalText = `${intro}\n\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``;

        const stream = createUIMessageStream({
          execute: ({ writer }) => {
            const id = `pkg-${Date.now()}`;
            writer.write({ type: "start" });
            writer.write({ type: "start-step" });
            writer.write({ type: "text-start", id });
            writer.write({ type: "text-delta", id, delta: finalText });
            writer.write({ type: "text-end", id });
            writer.write({ type: "finish-step" });
            writer.write({ type: "finish" });
          },
          originalMessages: uiMessages,
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
