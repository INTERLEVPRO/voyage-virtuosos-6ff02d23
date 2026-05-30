import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  generateText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { createOpenAIProvider } from "@/lib/openai-provider";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { packageSchema, type ParsedPackage } from "@/lib/package-schema";

type ChatRequestBody = { messages?: unknown };

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
Tag N — <Thema>: Vormittag · Nachmittag · Abend (1 evocative line each).
Return one line per day and include EVERY day up to the requested duration.`;


const TIER_ORDER: Array<"basic" | "medium" | "premium"> = ["basic", "medium", "premium"];

type MissingField = "destination" | "budget" | "duration" | "travelers" | "origin" | "timeframe";

function getPlanningSignals(text: string, history: string) {
  const combined = `${history}\n${text}`.trim();
  const all = combined.toLowerCase();

  const hasBudget = /\b\d{2,5}\s?(€|eur|euro|usd|\$)/i.test(all) || /budget/i.test(all);
  const hasDestOrType =
    /\b(städtetrip|staedtetrip|citytrip|kurztrip|roadtrip|rundreise|honeymoon|flitterwochen|strandurlaub|wellnessurlaub|familienurlaub|reise|urlaub|trip|strand|berge|stadt|city|insel|island|safari|kreuzfahrt|wander|ski|kunstreise|kulinarik|wellness)\b/i.test(all) ||
    /\b(in|nach|to)\s+[a-zäöüß][a-zäöüß.'’-]{2,}(?:\s+[a-zäöüß][a-zäöüß.'’-]{2,}){0,2}\b/i.test(all) ||
    /(?:^|\n)\s*(?!budget\b|abflug\b|ab\b|von\b|\d)([a-zäöüß][a-zäöüß.'’-]*)(?:\s+[a-zäöüß][a-zäöüß.'’-]*){0,3}\s*,/i.test(combined);
  const hasDuration =
    /\b\d+\s?(tag|tage|tagen|nacht|nächte|nächten|woche|wochen)\b/.test(all);
  const hasTravelers =
    /\b\d+\s?(person|personen|erwachsene|reisende|gäste|leute|kind|kinder|pers\.?|pax|adult|adults)\b/.test(all) ||
    /\b(allein|solo|paar|pärchen|familie|zu zweit|zu dritt|zu viert|ein(e|er|s)?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\b/i.test(all) ||
    /(^|[\s,;])([1-9]|1\d|20)\s*[,;]/.test(text) ||
    /^\s*([1-9]|1\d|20)\s*$/.test(text.trim());
  const hasOrigin =
    /\b(ab|von|abflug|abflughafen|start(en)?\s+in|flughafen)\s+[a-zäöüß]{3,}/i.test(all) ||
    /\b(ab|von|abflug)\s+(münchen|berlin|hamburg|frankfurt|köln|stuttgart|düsseldorf|wien|zürich|basel|genf|hannover|nürnberg|leipzig|dresden|bremen|dortmund)\b/i.test(all);
  const hasTimeframe =
    /\b(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|jan|feb|mär|mar|apr|jun|jul|aug|sep|okt|nov|dez|january|february|march|may|june|july|october|december|frühling|fruehling|sommer|herbst|winter|ostern|weihnachten|silvester|flexibel|egal|nächst|naechst|kommend)\b/i.test(all) ||
    /\bin\s+\d+\s?(tag|tage|woche|wochen|monat|monate|monaten)\b/i.test(all);

  return {
    hasBudget,
    hasDestOrType,
    hasDuration,
    hasTravelers,
    hasOrigin,
    hasTimeframe,
  };
}

function getMissingFields(text: string, history: string): MissingField[] {
  const signals = getPlanningSignals(text, history);
  const missing: MissingField[] = [];

  if (!signals.hasDestOrType) missing.push("destination");
  if (!signals.hasBudget) missing.push("budget");
  if (!signals.hasDuration) missing.push("duration");
  if (!signals.hasTravelers) missing.push("travelers");
  if (!signals.hasOrigin) missing.push("origin");
  if (!signals.hasTimeframe) missing.push("timeframe");

  return missing;
}

function formatMissingField(field: MissingField): string {
  switch (field) {
    case "destination":
      return "**Wohin soll es gehen** oder welche Art Urlaub möchtest du?";
    case "budget":
      return "**Wie hoch ist dein ungefähres Budget?**";
    case "duration":
      return "**Wie lange möchtest du reisen?**";
    case "travelers":
      return "**Wie viele Personen reisen?**";
    case "origin":
      return "**Von wo möchtest du abfliegen?**";
    case "timeframe":
      return "**Wann ungefähr möchtest du reisen?** (Monat/Saison oder einfach „flexibel“)";
  }
}

function joinWithUnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function buildConciergeReply(missing: MissingField[]): string {
  if (missing.length === 0) {
    return "Perfekt — ich lasse mein Team jetzt 3 Pakete für dich entwerfen…";
  }

  if (missing.length === 1) {
    return `Super, fast alles da! Mir fehlt nur noch: ${formatMissingField(missing[0])}`;
  }

  return `Super, ich brauche noch kurz ${missing.length} Angaben: ${joinWithUnd(
    missing.map(formatMissingField),
  )}`;
}

function createTextStreamResponse(text: string, originalMessages: UIMessage[]) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = `msg-${Date.now()}`;
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
    originalMessages,
  });

  return createUIMessageStreamResponse({ stream });
}

function parseDurationDays(value: string): number | null {
  const match = value.match(/(\d{1,2})\s*(tag|tage|tagen|nacht|nächte|nächten|woche|wochen)/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (Number.isNaN(amount) || amount <= 0) return null;

  if (unit.startsWith("woche")) return amount * 7;
  return amount;
}

function extractRequestedDurationDays(history: string): number {
  const lines = history.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const days = parseDurationDays(lines[i]);
    if (days) return days;
  }

  return 5;
}

function parseItineraryDraft(text: string, expectedDays: number, destination: string) {
  const parsed = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^tag\s*(\d+)\s*[—-]\s*([^:]+):\s*(.+)$/i);
      if (!match) return null;

      const day = Number(match[1]);
      if (!Number.isFinite(day) || day <= 0) return null;

      return {
        day,
        title: match[2].trim(),
        description: match[3].trim(),
      };
    })
    .filter((item): item is { day: number; title: string; description: string } => Boolean(item))
    .sort((a, b) => a.day - b.day);

  const byDay = new Map(parsed.map((item) => [item.day, item]));
  const completed = [] as { day: number; title: string; description: string }[];

  for (let day = 1; day <= expectedDays; day += 1) {
    const existing = byDay.get(day);
    completed.push(
      existing ?? {
        day,
        title: day === 1 ? "Ankunft und Orientierung" : day === expectedDays ? "Abschluss und Rückreise" : `Erlebnisse in ${destination}`,
        description:
          day === 1
            ? `Vormittag: Anreise nach ${destination} · Nachmittag: entspannt ankommen und einchecken · Abend: erste Eindrücke sammeln.`
            : day === expectedDays
              ? `Vormittag: letzte freie Zeit in ${destination} · Nachmittag: Transfer und Rückreise · Abend: Heimreise.`
              : `Vormittag: entspannt in den Tag starten · Nachmittag: neue Eindrücke in ${destination} erleben · Abend: den Tag gemütlich ausklingen lassen.`,
      },
    );
  }

  return completed;
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
        const userHistory = uiMessages
          .filter((m) => m.role === "user")
          .map(textOf)
          .join("\n");
        const missingFields = getMissingFields(lastUserText, userHistory);

        // Concierge mode
        if (missingFields.length > 0) {
          return createTextStreamResponse(buildConciergeReply(missingFields), uiMessages);
        }

        // Multi-agent: research → itinerary → packager (structured)
        const brief = `${userHistory}\n\nLetzte Nachricht: ${lastUserText}`;

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

        return createTextStreamResponse(finalText, uiMessages);
      },
    },
  },
});
