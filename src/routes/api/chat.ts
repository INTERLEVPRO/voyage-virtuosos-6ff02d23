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
import { fetchPackageRatings } from "@/lib/ratings.server";

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
type ResearchData = {
  flights: string[];
  hotels: string[];
};

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

function cleanDestination(raw: string): string {
  // Stop at sentence/clause boundaries and strip filler words
  const stopped = raw.split(/[.,;:!?\n]/)[0]?.trim() ?? "";
  const words = stopped.split(/\s+/);
  // Take up to 3 words and drop trailing common verbs/fillers
  const stopWords = /^(reisen|urlaub|fliegen|fahren|machen|gehen|sein|mein|dein|budget|beträgt|ca|ungefähr|etwa|für|mit|und|oder|circa)$/i;
  const kept: string[] = [];
  for (const w of words.slice(0, 4)) {
    if (stopWords.test(w)) break;
    kept.push(w);
  }
  return (kept.join(" ") || stopped).trim();
}

function extractDestination(history: string): string {
  const lines = history.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const explicit = line.match(/(?:reiseziel|ziel)\s*:?\s*([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (explicit?.[1]) return cleanDestination(explicit[1]);

    const byPrep = line.match(/(?:nach|to|in)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (byPrep?.[1]) return cleanDestination(byPrep[1]);

    const firstChunk = line.split(",")[0]?.trim();
    if (firstChunk && !/^(budget|abflug|abflugort|reisezeit|reisedauer|anzahl)/i.test(firstChunk)) {
      const cleaned = firstChunk.replace(/^(städtetrip|staedtetrip|citytrip|honeymoon|strandurlaub|wellnessurlaub|dein urlaub in|mein urlaub in|urlaub in)\s+/i, "").trim();
      return cleanDestination(cleaned);
    }
  }

  return "deinem Reiseziel";
}

function extractBudgetAmount(history: string): number {
  // 1) Try "<amount> € / EUR / Euro"
  const withCurrency = [...history.matchAll(/(\d{1,3}(?:[.,]\d{3})*|\d{2,6})\s*(€|eur|euro)/gi)];
  const lastCur = withCurrency.at(-1);
  if (lastCur) {
    const n = Number(lastCur[1].replace(/[.,]/g, ""));
    if (n >= 100) return n;
  }
  // 2) Try "budget ... <amount>" within ~30 chars
  const budgetCtx = history.match(/budget[^\d]{0,30}(\d{1,3}(?:[.,]\d{3})*|\d{2,6})/i);
  if (budgetCtx?.[1]) {
    const n = Number(budgetCtx[1].replace(/[.,]/g, ""));
    if (n >= 100) return n;
  }
  // 3) Fallback
  return 1500;
}

function parseResearchData(text: string): ResearchData {
  const lines = text.split(/\n+/).map((line) => line.trim());
  const flights: string[] = [];
  const hotels: string[] = [];
  let section: "flights" | "hotels" | null = null;

  for (const line of lines) {
    if (/^flights:/i.test(line)) {
      section = "flights";
      continue;
    }
    if (/^hotels:/i.test(line)) {
      section = "hotels";
      continue;
    }
    if (!line.startsWith("- ")) continue;

    const value = line.replace(/^[-•]\s*/, "").trim();
    if (!value) continue;

    if (section === "flights") flights.push(value);
    if (section === "hotels") hotels.push(value);
  }

  return { flights, hotels };
}

function extractInterests(history: string): string[] {
  const lower = history.toLowerCase();
  const pool = [
    ["strand", "Strand & Entspannung"],
    ["kultur", "Kultur & Altstadt"],
    ["wellness", "Wellness & Ruhe"],
    ["essen", "Kulinarik & lokale Küche"],
    ["natur", "Natur & Aussichtspunkte"],
    ["abenteuer", "Abenteuer & Aktivität"],
    ["shopping", "Shopping & Bummeln"],
    ["kunst", "Kunst & Museen"],
  ] as const;

  const matched = pool.filter(([key]) => lower.includes(key)).map(([, label]) => label);
  return matched.length > 0 ? matched : ["Highlights entdecken", "Entspannung", "Lokales erleben"];
}

function buildDeterministicItinerary(destination: string, days: number, interests: string[]) {
  const titles = [
    "Ankunft und Orientierung",
    ...Array.from({ length: Math.max(days - 2, 0) }, (_, index) => interests[index % interests.length]),
    ...(days > 1 ? ["Abschluss und Rückreise"] : []),
  ].slice(0, days);

  return titles.map((title, index) => {
    const day = index + 1;
    if (day === 1) {
      return {
        day,
        title,
        description: `Vormittag: Anreise nach ${destination} · Nachmittag: entspannt ankommen und die Umgebung kennenlernen · Abend: erster gemütlicher Einstieg in die Reise.`,
      };
    }

    if (day === days) {
      return {
        day,
        title,
        description: `Vormittag: letzte freie Zeit in ${destination} · Nachmittag: entspannter Transfer für die Rückreise · Abend: Heimreise mit vielen Eindrücken.`,
      };
    }

    return {
      day,
      title: `${title} ${day}`,
      description: `Vormittag: entspannter Start in ${destination} · Nachmittag: ${title.toLowerCase()} mit passendem Tagesprogramm · Abend: ruhiger Ausklang mit lokalen Eindrücken.`,
    };
  });
}

function buildFallbackResearchData(destination: string): ResearchData {
  return {
    flights: [
      `Direktflug nach ${destination} · Economy Smart · ca. 11h`,
      `Linienflug nach ${destination} · Komfort Tarif · ca. 11h`,
      `Premium Linienflug nach ${destination} · flexible Zeiten · ca. 11h`,
    ],
    hotels: [
      `Solides Mittelklassehotel in ${destination} · gute Lage · Frühstück`,
      `Komforthotel in ${destination} · zentrale Lage · Frühstück inklusive`,
      `Premium Resort in ${destination} · hochwertige Ausstattung · Extras inklusive`,
    ],
  };
}

function buildPackageSummary(type: "basic" | "medium" | "premium", destination: string, durationDays: number) {
  if (type === "basic") return `Ein preisbewusstes ${durationDays}-Tage-Paket für ${destination} mit starkem Gegenwert und den wichtigsten Highlights.`;
  if (type === "medium") return `Ein ausgewogenes ${durationDays}-Tage-Paket für ${destination} mit Komfort, guter Lage und abwechslungsreichen Erlebnissen.`;
  return `Ein hochwertiges ${durationDays}-Tage-Paket für ${destination} mit mehr Komfort, stärkeren Leistungen und besonderem Reisegefühl.`;
}

function buildPackageBadges(type: "basic" | "medium" | "premium", research: ResearchData) {
  const base = ["Preis-Leistung", "Sorgfältig geplant"];
  if (research.flights.some((flight) => /direkt/i.test(flight))) base.unshift("Direktflug");
  if (type === "medium") base.push("Komfort-Upgrade");
  if (type === "premium") base.push("Premium Auswahl", "Mehr Inklusivleistungen");
  if (type === "basic") base.push("Budgetfreundlich");
  return Array.from(new Set(base)).slice(0, type === "premium" ? 4 : 3);
}

function buildPackagesFromResearch(params: {
  budget: number;
  destination: string;
  itineraryTemplate: ParsedPackage["itinerary"];
  research: ResearchData;
}): ParsedPackage[] {
  const { budget, destination, itineraryTemplate, research } = params;
  const durationDays = itineraryTemplate.length;

  return TIER_ORDER.map((type, index) => {
    const multiplier = type === "basic" ? 0.85 : type === "medium" ? 1 : 1.15;
    const hotel = research.hotels[index] ?? research.hotels.at(-1) ?? `Sorgfältig ausgewähltes Hotel in ${destination}`;
    const flight = research.flights[index] ?? research.flights.at(-1) ?? `Passender Flug nach ${destination}`;
    const badges = buildPackageBadges(type, research);
    const activities = Array.from(new Set(itineraryTemplate.map((day) => day.title))).slice(0, 8);

    return {
      type,
      title:
        type === "basic"
          ? `${destination} Smart Paket`
          : type === "medium"
            ? `${destination} Komfort Paket`
            : `${destination} Premium Paket`,
      destination,
      price: Math.round(budget * multiplier),
      requestedBudget: budget,
      currency: "EUR",
      rating: type === "basic" ? 4.2 : type === "medium" ? 4.5 : 4.8,
      reviews: type === "basic" ? 320 : type === "medium" ? 980 : 1840,
      matchScore: type === "basic" ? 86 : type === "medium" ? 92 : 97,
      duration: `${durationDays} Tage`,
      hotel,
      flight,
      mealPlan: type === "basic" ? "Frühstück" : type === "medium" ? "Frühstück inklusive" : "Frühstück & ausgewählte Extras",
      summary: buildPackageSummary(type, destination, durationDays),
      whyItFits:
        type === "basic"
          ? `Ideal, wenn du ${destination} länger erleben möchtest und dein Budget im Blick behalten willst.`
          : type === "medium"
            ? `Passt gut, wenn du für ${destination} eine starke Balance aus Preis, Lage und Komfort suchst.`
            : `Passt gut, wenn du bei ${destination} für die lange Reisedauer mehr Komfort und Qualität priorisierst.`,
      badges,
      activities: activities.length > 0 ? activities : [`Highlights in ${destination}`],
      itinerary: itineraryTemplate,
    };
  });
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

        const requestedDurationDays = extractRequestedDurationDays(userHistory);

        const destination = extractDestination(userHistory);
        const budget = extractBudgetAmount(userHistory);
        const interests = extractInterests(userHistory);

        let researchText = "";
        let itineraryTemplate: ParsedPackage["itinerary"] = buildDeterministicItinerary(
          destination,
          requestedDurationDays,
          interests,
        );

        if (requestedDurationDays <= 14) {
          const research = await generateText({
            model,
            system: RESEARCH_SYSTEM,
            prompt: `Travel brief:\n"""${brief}"""\nProduce flights & hotels.`,
          });
          researchText = research.text;

          const itinerary = await generateText({
            model,
            system: ITINERARY_SYSTEM,
            prompt: `Brief:\n${brief}\n\nResearch:\n${research.text}\n\nBuild the itinerary in German for EXACTLY ${requestedDurationDays} days. Include every day from Tag 1 to Tag ${requestedDurationDays}.`,
          });

          itineraryTemplate = parseItineraryDraft(
            itinerary.text,
            requestedDurationDays,
            destination,
          );
        }

        const researchData = researchText ? parseResearchData(researchText) : buildFallbackResearchData(destination);
        const rawPackages = buildPackagesFromResearch({
          budget,
          destination,
          itineraryTemplate,
          research: researchData,
        })
          .map((pkg) => packageSchema.safeParse(pkg))
          .filter((r) => r.success)
          .map((r) => (r as { success: true; data: ParsedPackage }).data);

        if (rawPackages.length === 0) {
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

        const ratingsPerPackage = await Promise.all(
          normalized.map((p) =>
            fetchPackageRatings({ hotel: p.hotel, destination: p.destination }),
          ),
        );

        const packagesWithLinks = normalized.map((p, i) => ({
          ...p,
          bookingLinks: placeholderLinks(p.destination),
          ratings: ratingsPerPackage[i] ?? [],
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
