import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  generateText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  Output,
  type UIMessage,
  type LanguageModel,
} from "ai";
import { z } from "zod";
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

const ITINERARY_SYSTEM = `You are the Itinerary Architect. Build a realistic day-by-day plan in GERMAN with REAL, NAMED places/attractions for the destination — no generic filler.

RULES:
- The <Thema> MUST be a real area, neighborhood, attraction, or theme tied to the destination (e.g. "Altstadt & Kathedrale", "Taj Mahal & Agra Fort", "Strand Es Trenc & Cap de Ses Salines"). Never write "Erlebnisse in <Stadt>" or generic placeholders.
- Vormittag/Nachmittag/Abend each MUST mention concrete real place names, restaurants, viewpoints, beaches, museums, or activities that actually exist at the destination.
- Group places by geographic proximity so each day is logistically feasible (no zig-zag across the country).
- Consider the travel month: prefer attractions that are typically open/zugänglich in that season (e.g. Monsun in Indien Juli/August → mehr Indoor & überdachte Orte; Hauptsaison im Sommer → früh morgens für überlaufene Spots). Wenn etwas saisonal geschlossen / nicht empfehlenswert ist, weiche auf eine echte Alternative aus.
- Tag 1 = Ankunft + leichte Orientierung in der Nähe des Hotels. Letzter Tag = entspannter Abschluss + Rückreise.

FORMAT (EXACTLY one line per day, nothing else):
Tag N — <Thema mit echtem Ort>: Vormittag: <konkrete Orte/Aktivitäten> · Nachmittag: <konkrete Orte/Aktivitäten> · Abend: <konkrete Orte/Aktivitäten>

Include EVERY day from Tag 1 up to the requested duration.`;


const TIER_ORDER: Array<"basic" | "medium" | "premium"> = ["basic", "medium", "premium"];

// Minimum realistic total trip budget in EUR. Anything below is treated as
// missing/invalid and the concierge will ask the user to clarify.
const MIN_BUDGET_EUR = 100;

type MissingField = "destination" | "budget" | "duration" | "travelers" | "origin" | "timeframe";
type ResearchData = {
  flights: string[];
  hotels: string[];
};

// Parse the largest realistic budget amount from free text. Returns null when
// no value at or above MIN_BUDGET_EUR can be found.
function parseBudgetValue(text: string): number | null {
  const candidates: number[] = [];
  for (const m of text.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d{2,6})\s*(€|eur|euro|usd|\$)?/gi)) {
    const n = Number(m[1].replace(/[.,]/g, ""));
    if (!Number.isFinite(n)) continue;
    if (n >= MIN_BUDGET_EUR && n <= 200000) candidates.push(n);
  }
  if (candidates.length === 0) return null;
  // Prefer the last (most recent) realistic value
  return candidates[candidates.length - 1];
}

// Did the user mention a budget at all (even an unrealistically low one)?
function mentionedBudget(text: string): boolean {
  return /\bbudget\b/i.test(text) || /\d{1,5}\s*(€|eur|euro|usd|\$)/i.test(text);
}

function getPlanningSignals(text: string, history: string) {
  const combined = `${history}\n${text}`.trim();
  const all = combined.toLowerCase();
  const hasLabeledDestination = /\b(?:ziel|reiseziel|destination)\s*:\s*[^\n,;]{2,}/i.test(combined);
  const hasLabeledBudget = /\bbudget\s*:\s*\d{1,6}/i.test(combined);
  const hasLabeledDuration = /\b(?:dauer|reisedauer|duration)\s*:\s*(?:\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|ein|eine|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn)\s*(?:tag|tage|tagen|nacht|nächte|naechte|nächten|naechten|day|days|night|nights|week|weeks|woche|wochen|month|months|monat|monate)/i.test(combined);
  const hasLabeledTravelers = /\b(?:personen|personenanzahl|reisende|travelers|travellers|guests|gäste|pax)\s*:\s*(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|ein|eine|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|solo|allein|paar|pärchen|paerchen|familie)/i.test(combined);
  const hasLabeledOrigin = /\b(?:abflug|abflughafen|abflugort|origin|departure|von|ab)\s*:\s*[^\n,;]{2,}/i.test(combined);
  const hasLabeledTimeframe = /\b(?:datum|startdatum|reisezeit|reisezeitraum|zeitraum|monat|month|date|start date|timeframe)\s*:\s*[^\n]{2,}/i.test(combined);

  // Only consider budget "present" if we can parse a realistic amount.
  const hasBudget = parseBudgetValue(combined) !== null;
  const hasDestOrType =
    hasLabeledDestination ||
    /\b(städtetrip|staedtetrip|citytrip|kurztrip|roadtrip|rundreise|honeymoon|flitterwochen|strandurlaub|wellnessurlaub|familienurlaub|reise|urlaub|trip|strand|berge|stadt|city|insel|island|safari|kreuzfahrt|wander|ski|kunstreise|kulinarik|wellness)\b/i.test(all) ||
    /\b(in|nach|to)\s+[a-zäöüß][a-zäöüß.'’-]{2,}(?:\s+[a-zäöüß][a-zäöüß.'’-]{2,}){0,2}\b/i.test(all) ||
    /(?:^|\n)\s*(?!budget\b|abflug\b|ab\b|von\b|\d)([a-zäöüß][a-zäöüß.'’-]*)(?:\s+[a-zäöüß][a-zäöüß.'’-]*){0,3}\s*,/i.test(combined) ||
    // "7 Tage Mallorca", "2 Nächte Lissabon", "eine Woche Bali"
    /\b\d+\s+(?:tag|tage|tagen|nacht|nächte|naechte|nächten|naechten|woche|wochen)\s+([a-zäöüß][a-zäöüß.'’-]{2,})/i.test(all) ||
    // Any capitalized place-like token that isn't a known origin/month/keyword
    /\b(?!Budget|Abflug|Abflughafen|Frankfurt|München|Muenchen|Berlin|Hamburg|Köln|Koeln|Stuttgart|Düsseldorf|Duesseldorf|Wien|Zürich|Zuerich|Basel|Genf|Hannover|Nürnberg|Nuernberg|Leipzig|Dresden|Bremen|Dortmund|Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Tag|Tage|Tagen|Nacht|Nächte|Naechte|Woche|Wochen|Person|Personen|Erwachsene|Reisende|Gäste|Gaeste|Strand|Wellness|Kultur|Kunst|Natur|Familie|Honeymoon|Flitterwochen|Stadt|Insel|Berge|Rundreise|Direkt|Hotel|Flug|Frühling|Fruehling|Sommer|Herbst|Winter|Ostern|Weihnachten|Silvester|Ja|Nein|Hi|Hallo|Danke|Bitte|Ok|Okay)[A-ZÄÖÜ][a-zäöüß]{2,}\b/.test(combined);
  const hasDuration =
    hasLabeledDuration ||
    /\b\d+\s?(tag|tage|tagen|nacht|nächte|nächten|woche|wochen|day|days|night|nights|week|weeks|month|months|monat|monate)\b/.test(all);
  const hasTravelers =
    hasLabeledTravelers ||
    /\b\d+\s?(person|personen|erwachsene|reisende|gäste|leute|kind|kinder|pers\.?|pax|adult|adults)\b/.test(all) ||
    /\b(allein|solo|paar|pärchen|familie|zu zweit|zu dritt|zu viert|ein(e|er|s)?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(all) ||
    /(^|[\s,;])([1-9]|1\d|20)\s*[,;]/.test(text) ||
    /^\s*([1-9]|1\d|20)\s*$/.test(text.trim());
  const hasOrigin =
    hasLabeledOrigin ||
    /\b(ab|von|abflug|abflughafen|start(en)?\s+in|flughafen)\s+[a-zäöüß]{3,}/i.test(all) ||
    /\b(ab|von|abflug)\s+(münchen|berlin|hamburg|frankfurt|köln|stuttgart|düsseldorf|wien|zürich|basel|genf|hannover|nürnberg|leipzig|dresden|bremen|dortmund)\b/i.test(all);
  const hasTimeframe =
    hasLabeledTimeframe ||
    /\b\d{1,2}\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i.test(all) ||
    /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(all) ||
    /\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/.test(all) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(all) ||
    /\b(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|april|may|june|july|august|september|october|november|december|frühling|fruehling|sommer|herbst|winter)\b/i.test(all) ||
    /\b(flexibel|egal)\b/i.test(all);

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

// Identify which fields the assistant asked about, based on the question text.
function detectAskedFields(assistantText: string): MissingField[] {
  const t = assistantText.toLowerCase();
  const fields: MissingField[] = [];
  if (/wohin soll es gehen|welche art urlaub|reiseziel/.test(t)) fields.push("destination");
  if (/budget/.test(t)) fields.push("budget");
  if (/wie lange|reisedauer|wie viele tage/.test(t)) fields.push("duration");
  if (/wie viele personen|wie viele reisende|anzahl.*reisende/.test(t)) fields.push("travelers");
  if (/von wo.*abfliegen|abflughafen|abflugort|von welchem flughafen/.test(t)) fields.push("origin");
  if (/wann.*reisen|reisezeit|monat.*saison|startdatum|reise starten/.test(t)) fields.push("timeframe");
  return Array.from(new Set(fields));
}

function extractFieldAnswer(field: MissingField, value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  const labeledMatchers: Record<MissingField, RegExp> = {
    destination: /\b(?:ziel|reiseziel|destination)\s*:\s*([^\n,;]+)/i,
    budget: /\bbudget\s*:\s*([^\n,;]+)/i,
    duration: /\b(?:dauer|reisedauer|duration)\s*:\s*([^\n,;]+)/i,
    travelers: /\b(?:personen|personenanzahl|reisende|travelers|travellers|guests|gäste|pax)\s*:\s*([^\n,;]+)/i,
    origin: /\b(?:abflug|abflughafen|abflugort|origin|departure|von|ab)\s*:\s*([^\n,;]+)/i,
    timeframe: /\b(?:datum|startdatum|reisezeit|reisezeitraum|zeitraum|monat|month|date|start date|timeframe)\s*:\s*([^\n,;]+)/i,
  };

  const labeled = v.match(labeledMatchers[field])?.[1]?.trim();
  return labeled || v;
}

// Walk the dialog: when the assistant asked about a field and the user replied
// next with non-empty text, mark that field as answered.
function isAnswerValid(field: MissingField, value: string): boolean {
  const v = extractFieldAnswer(field, value)?.trim() ?? "";
  if (!v) return false;
  switch (field) {
    case "destination":
      return /[A-Za-zÄÖÜäöüß]/.test(v) && !isDateLike(v);
    case "budget":
      return parseBudgetValue(v) !== null;
    case "duration":
      return parseAnswerDurationDays(v) !== null;
    case "travelers":
      return parseAnswerTravelers(v) !== null;
    case "origin":
      return /[A-Za-zÄÖÜäöüß]/.test(v) && !isDateLike(v);
    case "timeframe":
      return (
        /\b\d{1,2}\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i.test(v) ||
        /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(v) ||
        /\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/.test(v) ||
        /\b\d{4}-\d{2}-\d{2}\b/.test(v) ||
        /\b(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|april|may|june|july|august|september|october|november|december|frühling|fruehling|sommer|herbst|winter)\b/i.test(v) ||
        /\b(flexibel|egal)\b/i.test(v)
      );
    default:
      return true;
  }
}

function getAnsweredFieldsFromDialog(uiMessages: UIMessage[]): Set<MissingField> {
  const answered = new Set<MissingField>();
  const textOf = (m: UIMessage) =>
    m.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";

  for (let i = 0; i < uiMessages.length - 1; i += 1) {
    const m = uiMessages[i];
    if (m.role !== "assistant") continue;
    const asked = detectAskedFields(textOf(m));
    if (asked.length === 0) continue;
    for (let j = i + 1; j < uiMessages.length; j += 1) {
      const next = uiMessages[j];
      if (next.role === "user") {
        const reply = textOf(next);
        for (const field of asked) {
          if (isAnswerValid(field, reply)) answered.add(field);
        }
        break;
      }
    }
  }
  return answered;
}

// Collect the literal user reply that followed each assistant question.
// Latest answer wins if a field was asked multiple times.
function getDialogAnswers(uiMessages: UIMessage[]): Partial<Record<MissingField, string>> {
  const answers: Partial<Record<MissingField, string>> = {};
  const textOf = (m: UIMessage) =>
    m.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";

  for (let i = 0; i < uiMessages.length - 1; i += 1) {
    const m = uiMessages[i];
    if (m.role !== "assistant") continue;
    const asked = detectAskedFields(textOf(m));
    if (asked.length === 0) continue;
    for (let j = i + 1; j < uiMessages.length; j += 1) {
      const next = uiMessages[j];
      if (next.role === "user") {
        const t = textOf(next).trim();
        for (const field of asked) {
          const extracted = extractFieldAnswer(field, t)?.trim();
          if (extracted && isAnswerValid(field, extracted)) answers[field] = extracted;
        }
        break;
      }
    }
  }
  return answers;
}

const WORD_NUM_BASIC: Record<string, number> = {
  one: 1, ein: 1, eine: 1, einer: 1, eins: 1,
  two: 2, zwei: 2,
  three: 3, drei: 3,
  four: 4, vier: 4,
  five: 5, fünf: 5, fuenf: 5,
  six: 6, sechs: 6,
  seven: 7, sieben: 7,
  eight: 8, acht: 8,
  nine: 9, neun: 9,
  ten: 10, zehn: 10,
};

function parseAnswerDurationDays(value: string): number | null {
  const t = value.toLowerCase().trim();
  // numeric with unit
  const num = t.match(/(\d{1,3})\s*(tag|tage|tagen|nacht|nächte|naechte|nächten|naechten|night|nights|day|days|woche|wochen|week|weeks|monat|monate|monaten|month|months)\b/);
  if (num) {
    const n = Number(num[1]);
    const u = num[2];
    if (u.startsWith("woche") || u.startsWith("week")) return n * 7;
    if (u.startsWith("monat") || u.startsWith("month")) return n * 30;
    return n;
  }
  // word number + unit ("one month", "ein monat")
  const word = t.match(/^(one|ein|eine|two|zwei|three|drei|four|vier|five|fünf|fuenf|six|sechs|seven|sieben|eight|acht|nine|neun|ten|zehn)\s+(tag|tage|nacht|nächte|day|days|night|nights|woche|wochen|week|weeks|monat|monate|month|months)\b/);
  if (word) {
    const n = WORD_NUM_BASIC[word[1]] ?? 1;
    const u = word[2];
    if (u.startsWith("woche") || u.startsWith("week")) return n * 7;
    if (u.startsWith("monat") || u.startsWith("month")) return n * 30;
    return n;
  }
  // bare number
  const bare = t.match(/^(\d{1,3})$/);
  if (bare) {
    const n = Number(bare[1]);
    if (n > 0 && n <= 365) return n;
  }
  return null;
}

function parseAnswerTravelers(value: string): number | null {
  const t = value.toLowerCase().trim();
  const bare = t.match(/^(\d{1,2})\b/);
  if (bare) {
    const n = Number(bare[1]);
    if (n > 0 && n < 30) return n;
  }
  for (const [word, n] of Object.entries(WORD_NUM_BASIC)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return n;
  }
  if (/\b(allein|solo)\b/.test(t)) return 1;
  if (/\b(paar|pärchen|paerchen|zu zweit)\b/.test(t)) return 2;
  if (/\bfamilie\b/.test(t)) return 4;
  return null;
}

function cleanPlace(value: string): string {
  const first = value.split(/[.,;:!?\n]/)[0]?.trim() ?? "";
  // Take up to 3 words
  const words = first.split(/\s+/).slice(0, 3);
  return words
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
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
      return 'Wann möchtest du deine Reise starten? Bitte nenne ein konkretes Startdatum, z. B. 10. Juni 2026. Wenn du flexibel bist, kannst du auch „flexibel im Juni" schreiben.';
  }
}

function shortFieldLabel(field: MissingField): string {
  switch (field) {
    case "destination": return "Reiseziel";
    case "budget": return "Budget";
    case "duration": return "Reisedauer";
    case "travelers": return "Anzahl Personen";
    case "origin": return "Abflughafen";
    case "timeframe": return "Reisezeitraum";
  }
}

function joinWithUnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function buildConciergeReply(missing: MissingField[], userMessageCount: number): string {
  if (missing.length === 0) {
    return "Perfekt — ich lasse mein Team jetzt 3 Pakete für dich entwerfen…";
  }

  // First user message with nothing parsed → warm welcome
  if (userMessageCount <= 1 && missing.length >= 6) {
    return [
      "Hi! 👋 Schön, dass du da bist — ich helfe dir, deinen perfekten Urlaub zu planen.",
      "",
      "Du kannst mir z. B. einfach schreiben:",
      '> *„7 Tage Mallorca, 2 Personen, Budget 1.500 €, Strand & Entspannung, ab Frankfurt, im Juni"*',
      "",
      `Lass uns starten: ${formatMissingField(missing[0])}`,
    ].join("\n");
  }

  // Acknowledge what's already there, then ask ONLY missing fields in one message.
  const ack = "Super, danke dir! ✨ Ich hab schon das meiste — mir fehlt nur noch:";
  const bullets = missing.map((f) => `- ${formatMissingField(f)}`).join("\n");
  const labels = joinWithUnd(missing.map(shortFieldLabel));
  const tail =
    missing.length === 1
      ? "\n\n_(Sag mir kurz das eine — danach lege ich direkt los! 🚀)_"
      : `\n\n_(Schreib mir einfach ${labels} in einer Nachricht — dann starte ich sofort.)_`;

  return `${ack}\n\n${bullets}${tail}`;
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
  // Strip markdown bold/italics & bullets, then match flexible separators
  const normalized = text
    .replace(/\*\*/g, "")
    .replace(/^[\s>*-]+/gm, "")
    .replace(/[–—−-]/g, "—");

  const parsed = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^tag\s*(\d+)\s*[—:]\s*([^:]+?)\s*:\s*(.+)$/i);
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

const MONTH_RE = /^(januar|februar|m[äa]rz|april|mai|juni|juli|august|september|oktober|november|dezember|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|okt|nov|dec|dez|january|february|march|june|july|october|december)$/i;

function isDateLike(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^\d/.test(t)) return true; // starts with number
  const firstWord = t.split(/\s+/)[0] ?? "";
  return MONTH_RE.test(firstWord);
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
    if (explicit?.[1] && !isDateLike(explicit[1])) return cleanDestination(explicit[1]);

    // "7 Tage Mallorca", "2 Nächte Lissabon", "eine Woche Bali"
    const afterDuration = line.match(/\b\d+\s+(?:tag|tage|tagen|nacht|nächte|naechte|nächten|naechten|woche|wochen)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (afterDuration?.[1] && !isDateLike(afterDuration[1])) {
      const cand = cleanDestination(afterDuration[1]);
      if (cand && !isDateLike(cand)) return cand;
    }

    const byPrep = line.match(/(?:nach|to|in)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (byPrep?.[1] && !isDateLike(byPrep[1])) {
      const cand = cleanDestination(byPrep[1]);
      if (cand && !isDateLike(cand)) return cand;
    }

    const firstChunk = line.split(",")[0]?.trim();
    if (firstChunk && !/^(budget|abflug|abflugort|reisezeit|reisedauer|anzahl|im|am)/i.test(firstChunk) && !isDateLike(firstChunk)) {
      const cleaned = firstChunk.replace(/^(städtetrip|staedtetrip|citytrip|honeymoon|strandurlaub|wellnessurlaub|dein urlaub in|mein urlaub in|urlaub in)\s+/i, "").trim();
      if (cleaned && !isDateLike(cleaned)) return cleanDestination(cleaned);
    }
  }

  return "deinem Reiseziel";
}

function extractBudgetAmount(history: string): number | null {
  return parseBudgetValue(history);
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

function extractOrigin(history: string): string | undefined {
  const labeled = history.match(/\b(?:abflug|abflughafen|abflugort|origin|departure|von|ab)\s*:\s*([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\- ]{2,30})/i);
  if (labeled?.[1]) {
    const cleaned = labeled[1].split(/[,.;:!?\n]/)[0].trim().split(/\s+/).slice(0, 3).join(" ");
    return cleaned || undefined;
  }
  const m = history.match(/\b(?:ab|von|abflug(?:ort|hafen)?|start(?:en)?\s+in|flughafen)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\- ]{2,30})/i);
  if (!m) return undefined;
  // take first 1-2 words before comma/punct
  const cleaned = m[1].split(/[,.;:!?\n]/)[0].trim().split(/\s+/).slice(0, 2).join(" ");
  return cleaned || undefined;
}

const WORD_NUMS: Record<string, number> = {
  allein: 1, solo: 1, "ein": 1, "eine": 1, "einer": 1, "eins": 1,
  paar: 2, pärchen: 2, paerchen: 2, "zu zweit": 2, zwei: 2,
  "zu dritt": 3, drei: 3,
  "zu viert": 4, vier: 4, familie: 4,
  fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
};

function extractTravelers(history: string): number | undefined {
  const lower = history.toLowerCase();
  const num = lower.match(/(\d{1,2})\s?(person|personen|erwachsene|reisende|gäste|leute|pers\.?|pax|adult|adults)\b/);
  if (num) {
    const n = Number(num[1]);
    if (n > 0 && n < 30) return n;
  }
  for (const [word, n] of Object.entries(WORD_NUMS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return n;
  }
  return undefined;
}

function extractTravelMonth(history: string): string | undefined {
  const labeled = history.match(/\b(?:datum|startdatum|reisezeit|reisezeitraum|zeitraum|monat|month|date|start date|timeframe)\s*:\s*([^\n,;]+)/i);
  if (labeled?.[1]) {
    const m = labeled[1].match(/\b(januar|february|februar|märz|maerz|march|april|mai|may|juni|june|juli|july|august|september|oktober|october|november|dezember|december|january|aug|sep|sept|oct|nov|dec|jan|feb|mar|apr|jun|jul)\b/i);
    if (m?.[1]) return m[1].toLowerCase();
  }
  const m = history.match(/\b(januar|february|februar|märz|maerz|march|april|mai|may|juni|june|juli|july|august|september|oktober|october|november|dezember|december|january|aug|sep|sept|oct|nov|dec|jan|feb|mar|apr|jun|jul)\b/i);
  return m?.[1].toLowerCase();
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

const TRIP_FIELDS_SCHEMA = z.object({
  destination: z.string().nullable().describe("Reiseziel: Stadt, Region oder Land (z. B. 'Sri Lanka', 'Mallorca', 'Lissabon'). null wenn unklar."),
  budgetEur: z.number().nullable().describe("Gesamtbudget pro Person in EUR. Akzeptiere '1500 EUR', '1.500 €', '1500'. Null wenn fehlt oder < 100."),
  durationDays: z.number().nullable().describe("Reisedauer in Tagen. '12 Tage'=12, '2 Wochen'=14, '1 Monat'=30. Null wenn fehlt."),
  travelers: z.number().nullable().describe("Anzahl reisender Personen. 'Ich bin nur'/'allein'/'solo'/'1 Person'=1, 'Paar'/'zu zweit'=2, 'Familie'=4. Null wenn fehlt."),
  originCity: z.string().nullable().describe("Abflugort/Stadt/Flughafen. 'aus Frankfurt'/'ab München'/'von Berlin'/'aus Sri Lanka' → Stadtname. Null wenn fehlt."),
  timeframe: z.string().nullable().describe("Reisezeitraum: Monat ('Juni'), Saison ('Sommer'), Datum, 'flexibel'. Null wenn fehlt."),
});

type ExtractedTripFields = z.infer<typeof TRIP_FIELDS_SCHEMA>;

async function extractTripFieldsLLM(
  model: LanguageModel,
  uiMessages: UIMessage[],
): Promise<ExtractedTripFields> {
  const transcript = uiMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const t = m.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
      return `${m.role === "user" ? "USER" : "ASSISTANT"}: ${t.trim()}`;
    })
    .filter((l) => l.length > 6)
    .join("\n");

  try {
    const { experimental_output } = await generateText({
      model,
      experimental_output: Output.object({ schema: TRIP_FIELDS_SCHEMA }),
      system: `Du extrahierst Reisedaten aus einem Chat zwischen einem Reiseberater und einem Nutzer.
Berücksichtige den GESAMTEN Verlauf — Antworten können kurz und über mehrere Nachrichten verteilt sein (z. B. "Indien", "1500 EUR", "12 Tage", "Ich bin nur", "aus Sri Lanka").
Verstehe natürliche Sprache, nicht nur strikte Formate. Wenn ein Feld nicht eindeutig genannt wurde, gib null zurück.
Antworte ausschließlich gemäß Schema.`,
      prompt: `Chatverlauf:\n${transcript}\n\nExtrahiere die Reisedaten.`,
    });
    return experimental_output;
  } catch {
    return {
      destination: null,
      budgetEur: null,
      durationDays: null,
      travelers: null,
      originCity: null,
      timeframe: null,
    };
  }
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

        // LLM-based extraction — robust to natural language across the dialog.
        const extracted = await extractTripFieldsLLM(model, uiMessages);

        // Merge LLM with regex/dialog fallbacks for resilience.
        const regexMissing = getMissingFields(lastUserText, userHistory);
        const answered = getAnsweredFieldsFromDialog(uiMessages);

        // STRICT: every one of the 6 required fields must have a real value
        // from LLM extraction, dialog answers, or regex parsing. Otherwise the
        // concierge keeps asking — no package creation until everything is set.
        const dialogPreview = getDialogAnswers(uiMessages);
        const has = {
          destination: !!(extracted.destination || dialogPreview.destination || (!regexMissing.includes("destination"))),
          budget: !!((extracted.budgetEur && extracted.budgetEur >= MIN_BUDGET_EUR)
            || (dialogPreview.budget && (parseBudgetValue(dialogPreview.budget) ?? 0) >= MIN_BUDGET_EUR)
            || ((parseBudgetValue(userHistory) ?? 0) >= MIN_BUDGET_EUR)),
          duration: !!(extracted.durationDays
            || (dialogPreview.duration && parseAnswerDurationDays(dialogPreview.duration))
            || extractRequestedDurationDays(userHistory)),
          travelers: !!(extracted.travelers
            || (dialogPreview.travelers && parseAnswerTravelers(dialogPreview.travelers))
            || extractTravelers(userHistory)),
          origin: !!(extracted.originCity || dialogPreview.origin || extractOrigin(userHistory)),
          timeframe: !!(extracted.timeframe || dialogPreview.timeframe || extractTravelMonth(userHistory)),
        };
        const missingFields: MissingField[] = [];
        if (!has.destination) missingFields.push("destination");
        if (!has.budget) missingFields.push("budget");
        if (!has.duration) missingFields.push("duration");
        if (!has.travelers) missingFields.push("travelers");
        if (!has.origin) missingFields.push("origin");
        if (!has.timeframe) missingFields.push("timeframe");

        // Concierge mode
        if (missingFields.length > 0) {
          const userMessageCount = uiMessages.filter((m) => m.role === "user").length;
          let reply = buildConciergeReply(missingFields, userMessageCount);
          if (missingFields.includes("budget") && (mentionedBudget(userHistory) || (extracted.budgetEur !== null && extracted.budgetEur < MIN_BUDGET_EUR))) {
            reply = `Hmm, dein angegebenes Budget scheint **zu niedrig** für eine echte Reise (Flug + Hotel + Aktivitäten). Bitte nenne mir dein **ungefähres Gesamtbudget pro Person in Euro** — mindestens **${MIN_BUDGET_EUR} €** (z. B. 800 €, 1.500 €, 3.000 €).\n\n${reply}`;
          }
          return createTextStreamResponse(reply, uiMessages);
        }

        // Multi-agent: research → itinerary → packager (structured)
        const brief = `${userHistory}\n\nLetzte Nachricht: ${lastUserText}`;

        const dialog = getDialogAnswers(uiMessages);

        const requestedDurationDays = extracted.durationDays
          ?? (dialog.duration ? parseAnswerDurationDays(dialog.duration) : null)
          ?? extractRequestedDurationDays(userHistory);

        const destination = extracted.destination
          ? cleanPlace(extracted.destination)
          : (dialog.destination ? cleanPlace(dialog.destination) : extractDestination(userHistory));

        const budget = extracted.budgetEur && extracted.budgetEur >= MIN_BUDGET_EUR
          ? extracted.budgetEur
          : (() => {
              if (dialog.budget) {
                const v = parseBudgetValue(dialog.budget);
                if (v !== null) return v;
              }
              return parseBudgetValue(userHistory);
            })();

        if (budget === null) {
          const tooLow = mentionedBudget(userHistory) || (dialog.budget ? mentionedBudget(dialog.budget) : false);
          const msg = tooLow
            ? `Dein angegebenes Budget scheint sehr niedrig zu sein. Damit ich realistische Pakete (Flug + Hotel + Aktivitäten) zusammenstellen kann, brauche ich dein **ungefähres Gesamtbudget pro Person in Euro** — bitte mindestens **${MIN_BUDGET_EUR} €**. Wie viel möchtest du ungefähr ausgeben?`
            : `Mir fehlt noch dein **ungefähres Gesamtbudget pro Person in Euro** (z. B. 800 €, 1.500 €, 3.000 €). Wie viel möchtest du ungefähr ausgeben?`;
          return createTextStreamResponse(msg, uiMessages);
        }

        const interests = extractInterests(userHistory);
        const origin = extracted.originCity
          ? cleanPlace(extracted.originCity)
          : (dialog.origin ? cleanPlace(dialog.origin) : extractOrigin(userHistory));
        const travelers = extracted.travelers
          ?? (dialog.travelers ? parseAnswerTravelers(dialog.travelers) : null)
          ?? extractTravelers(userHistory);
        const travelMonth = extracted.timeframe
          ? (extractTravelMonth(extracted.timeframe) ?? extracted.timeframe.toLowerCase())
          : (dialog.timeframe ? (extractTravelMonth(dialog.timeframe) ?? extractTravelMonth(userHistory)) : extractTravelMonth(userHistory));




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
          durationDays: requestedDurationDays,
          origin,
          travelers,
          travelMonth,
          travelStartDate: dialog.timeframe ?? undefined,
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
