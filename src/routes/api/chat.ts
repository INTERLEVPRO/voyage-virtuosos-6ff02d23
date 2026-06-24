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
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
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

const ITINERARY_SYSTEM = `You are the Itinerary Architect. Build a realistic day-by-day plan in GERMAN with REAL, NAMED places/attractions for the destination — no generic filler.

RULES:
- The <Thema> MUST be a real area, neighborhood, attraction, or theme tied to the destination (e.g. "Altstadt & Kathedrale", "Taj Mahal & Agra Fort", "Strand Es Trenc & Cap de Ses Salines"). Never write "Erlebnisse in <Stadt>" or generic placeholders.
- Vormittag/Nachmittag/Abend each MUST mention concrete real place names, restaurants, viewpoints, beaches, museums, or activities that actually exist at the destination.
- Group places by geographic proximity so each day is logistically feasible (no zig-zag across the country).
- DISTANCE/TIME REALITY CHECK: a single day must never combine places that are more than ~150 km / 3 h apart by car/train. If a transfer between cities is needed (e.g. Delhi → Agra, Jaipur → Udaipur), dedicate the whole day to the transfer + one arrival sight; do NOT cram sightseeing in both cities into the same day. Use realistic Indian/European travel times.
- Never put attractions in different cities into the same Vormittag/Nachmittag/Abend slot.
- Consider the travel month: prefer attractions that are typically open/zugänglich in that season (e.g. Monsun in Indien Juli/August → mehr Indoor & überdachte Orte; Hauptsaison im Sommer → früh morgens für überlaufene Spots). Wenn etwas saisonal geschlossen / nicht empfehlenswert ist, weiche auf eine echte Alternative aus.
- Tag 1 = Ankunft + leichte Orientierung in der Nähe des Hotels. Letzter Tag = entspannter Abschluss + Rückreise.

FORMAT (EXACTLY one line per day, nothing else):
Tag N — <Thema mit echtem Ort>: Vormittag: <konkrete Orte/Aktivitäten> · Nachmittag: <konkrete Orte/Aktivitäten> · Abend: <konkrete Orte/Aktivitäten>

Include EVERY day from Tag 1 up to the requested duration.`;


const TIER_ORDER: Array<"basic" | "medium" | "premium"> = ["basic", "medium", "premium"];

// Minimum realistic total trip budget in EUR. Anything below is treated as
// missing/invalid and the concierge will ask the user to clarify.
const MIN_BUDGET_EUR = 100;

type MissingField = "destination" | "budget" | "duration" | "travelers" | "origin" | "timeframe" | "interests";
type ResearchData = {
  flights: string[];
  hotels: string[];
};

// Parse the largest realistic budget amount from free text. Returns null when
// no value at or above MIN_BUDGET_EUR can be found.
// IMPORTANT: bare numbers (no currency, no thousands separator) that look like
// a year (1900–2099) are ignored — they're almost certainly travel dates.
function parseBudgetValue(text: string): number | null {
  const candidates: number[] = [];
  for (const m of text.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d{2,6})\s*(€|eur|euro|usd|\$|euro?|euros?)?/gi)) {
    const raw = m[1];
    const currency = m[2];
    const n = Number(raw.replace(/[.,]/g, ""));
    if (!Number.isFinite(n)) continue;
    if (n < MIN_BUDGET_EUR || n > 200000) continue;
    if (!currency && !/[.,]/.test(raw) && n >= 1900 && n <= 2099) continue;
    candidates.push(n);
  }
  if (candidates.length === 0) return null;
  return candidates[candidates.length - 1];
}

// Did the user mention a budget at all (even an unrealistically low one)?
function mentionedBudget(text: string): boolean {
  return /\bbudget\b/i.test(text) || /\d{1,5}\s*(€|eur|euro?|euros?|usd|\$)/i.test(text);
}

// "pro Person" / "p.P." / "per person" / "je Person" / "pro Kopf" => per-person.
// Anything else with a budget amount defaults to total/group budget.
function parseBudgetType(text: string): "perPerson" | "total" {
  if (/\b(pro\s+person|p\.?\s*p\.?|per\s+person|je\s+person|pro\s+kopf|each|per\s+adult)\b/i.test(text)) {
    return "perPerson";
  }
  return "total";
}

const MONTH_TO_NUM: Record<string, number> = {
  januar: 1, jan: 1, january: 1,
  februar: 2, feb: 2, february: 2,
  märz: 3, maerz: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mai: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11,
  dezember: 12, dez: 12, dec: 12, december: 12,
};

// Detect a date range like "18. Juli 2026 – 23. Juli 2026" or
// "18.07.2026 - 23.07.2026" or "2026-07-18 to 2026-07-23".
// Returns the duration in days when both endpoints parse.
function parseDateRangeDays(text: string): number | null {
  const verbose = text.match(
    /(?:vom\s+)?(\d{1,2})\.\s*([a-zäöüA-ZÄÖÜ]+)\s*(\d{4})?\s*(?:–|—|-|bis(?:\s+zum)?|to|until)\s*(\d{1,2})\.\s*([a-zäöüA-ZÄÖÜ]+)\s*(\d{4})?/i,
  );
  if (verbose) {
    const m1 = MONTH_TO_NUM[verbose[2].toLowerCase()];
    const m2 = MONTH_TO_NUM[verbose[5].toLowerCase()];
    const y1 = Number(verbose[3] ?? verbose[6] ?? new Date().getFullYear());
    const y2 = Number(verbose[6] ?? verbose[3] ?? y1);
    if (m1 && m2) {
      const d1 = new Date(y1, m1 - 1, Number(verbose[1]));
      const d2 = new Date(y2, m2 - 1, Number(verbose[4]));
      const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
      if (diff > 0 && diff <= 365) return diff;
    }
  }

  const numeric = text.match(
    /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*(?:–|—|-|bis|to|until)\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  );
  if (numeric) {
    const parseOne = (s: string): Date | null => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
      const p = s.split(/[.\/-]/).map(Number);
      if (p.length === 3) {
        const [a, b, c] = p;
        const yyyy = c < 100 ? 2000 + c : c;
        return new Date(yyyy, b - 1, a);
      }
      return null;
    };
    const d1 = parseOne(numeric[1]);
    const d2 = parseOne(numeric[2]);
    if (d1 && d2 && !isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
      if (diff > 0 && diff <= 365) return diff;
    }
  }

  return null;
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
  // Strict: only a real place / labeled destination counts.
  const hasDestination =
    hasLabeledDestination ||
    /\b(india|indien|indya)\s*(?:→|->|to|bis|nach)\s*(sri\s*lanka|srilanka)\b/i.test(combined) ||
    /\b(nach|in|to)\s+[A-ZÄÖÜ][a-zäöüß.'’-]{2,}/.test(combined) ||
    /\b\d+\s+(?:tag|tage|tagen|nacht|nächte|naechte|nächten|naechten|woche|wochen)\s+([A-ZÄÖÜ][a-zäöüß.'’-]{2,})/.test(combined) ||
    /(?:^|\n)\s*(?!Budget|Abflug|Hi|Hallo|Hey|Ok|Okay|Ja|Nein|Danke)[A-ZÄÖÜ][a-zäöüß.'’-]{2,}\s*,/.test(combined) ||
    /\b(?!Budget|Abflug|Abflughafen|Frankfurt|München|Muenchen|Berlin|Hamburg|Köln|Koeln|Stuttgart|Düsseldorf|Duesseldorf|Wien|Zürich|Zuerich|Basel|Genf|Hannover|Nürnberg|Nuernberg|Leipzig|Dresden|Bremen|Dortmund|Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Tag|Tage|Tagen|Nacht|Nächte|Naechte|Woche|Wochen|Person|Personen|Erwachsene|Reisende|Gäste|Gaeste|Strand|Wellness|Kultur|Kunst|Natur|Familie|Honeymoon|Flitterwochen|Stadt|Insel|Berge|Rundreise|Direkt|Hotel|Flug|Frühling|Fruehling|Sommer|Herbst|Winter|Ostern|Weihnachten|Silvester|Ja|Nein|Hi|Hallo|Hey|Danke|Bitte|Ok|Okay|Städtetrip|Staedtetrip|Citytrip|Kurztrip|Roadtrip|Strandurlaub|Wellnessurlaub|Familienurlaub|Reise|Urlaub|Trip|Kreuzfahrt|Safari|Ski)[A-ZÄÖÜ][a-zäöüß]{2,}\b/.test(combined);

  // Loose: destination OR generic vacation type (used for other heuristics).
  const hasDestOrType =
    hasDestination ||
    /\b(städtetrip|staedtetrip|citytrip|kurztrip|roadtrip|rundreise|honeymoon|flitterwochen|strandurlaub|wellnessurlaub|familienurlaub|strand|berge|stadt|city|insel|island|safari|kreuzfahrt|wander|ski|kunstreise|kulinarik|wellness)\b/i.test(all);
  const hasDuration =
    hasLabeledDuration ||
    parseDateRangeDays(combined) !== null ||
    /\b\d+\s?(tag|tage|tagen|nacht|nächte|nächten|woche|wochen|day|days|night|nights|week|weeks|month|months|monat|monate)\b/.test(all);
  const hasTravelers =
    hasLabeledTravelers ||
    /\b\d+\s?(person|personen|erwachsene|reisende|gäste|leute|kind|kinder|pers\.?|pax|adult|adults)\b/.test(all) ||
    /\b(allein|solo|paar|pärchen|paerchen|familie|zu zweit|zu dritt|zu viert)\b/i.test(all);
  // Strict: avoid matching timeframe phrases like "ab Juni" / "von Mai bis Juni".
  // Only count origin when an explicit origin keyword (abflug/abflughafen/flughafen/start in)
  // is present, OR "ab|von" is followed by a known German/AT/CH city, OR a 3-letter airport code is mentioned.
  const MONTHS_RE = /(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|may|june|july|august|september|october|november|december|frühling|fruehling|sommer|herbst|winter|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|heute|jetzt|bald|nächst|kommend|monat|woche|wochen|tag|tagen|jahr|jahre)/i;
  const KNOWN_ORIGIN_CITIES = /(münchen|muenchen|berlin|hamburg|frankfurt|köln|koeln|stuttgart|düsseldorf|duesseldorf|wien|zürich|zuerich|basel|genf|geneva|hannover|nürnberg|nuernberg|leipzig|dresden|bremen|dortmund|salzburg|innsbruck|graz|linz|bern)/i;
  const hasOrigin =
    hasLabeledOrigin ||
    /\b(india|indien|indya)\s*(?:→|->|to|bis|nach)\s*(sri\s*lanka|srilanka)\b/i.test(combined) ||
    new RegExp(`\\b(abflug|abflughafen|abflugort|flughafen|start(?:en)?\\s+in)\\s+[a-zäöüß]{3,}`, "i").test(all) ||
    new RegExp(`\\b(ab|von)\\s+${KNOWN_ORIGIN_CITIES.source}\\b`, "i").test(all) ||
    /\b(fra|muc|ber|ham|cgn|str|dus|vie|zrh|bsl|gva|haj|nue|lej|drs|bre|dtm|txl|sxf)\b/i.test(all);
  void MONTHS_RE;
  const hasTimeframe =
    hasLabeledTimeframe ||
    parseDateRangeDays(combined) !== null ||
    /\b\d{1,2}\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i.test(all) ||
    /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(all) ||
    /\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/.test(all) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(all) ||
    /\b(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|april|may|june|july|august|september|october|november|december|frühling|fruehling|sommer|herbst|winter)\b/i.test(all) ||
    /\b(nächst(?:e|en|er|es)?\s+(monat|sommer|winter|frühling|fruehling|herbst)|kommend(?:e|en|er|es)?\s+(monat|sommer|winter|frühling|fruehling|herbst)|in\s+\d+\s+monat(?:en)?)\b/i.test(all) ||
    /\b(flexibel|egal)\b/i.test(all);
  const hasInterests = /\b(strand|kultur|wellness|essen|kulinarik|natur|abenteuer|aktivität|aktivitaet|shopping|kunst|museum|museen|ruhe|entspannung|wandern|safari|nightlife|nachtleben|familie|honeymoon|flitterwochen)\b/i.test(all);

  return {
    hasBudget,
    hasDestination,
    hasDestOrType,
    hasDuration,
    hasTravelers,
    hasOrigin,
    hasTimeframe,
    hasInterests,
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
  if (!signals.hasInterests) missing.push("interests");

  return missing;
}

// Identify which fields the assistant asked about, based on the question text.
function detectAskedFields(assistantText: string): MissingField[] {
  if (isTripConfirmationPrompt(assistantText)) return [];
  const t = assistantText.toLowerCase();
  const fields: MissingField[] = [];
  if (/wohin soll es gehen|welche art urlaub|reiseziel/.test(t)) fields.push("destination");
  if (/budget/.test(t)) fields.push("budget");
  if (/wie lange|reisedauer|wie viele tage/.test(t)) fields.push("duration");
  if (/wie viele personen|wie viele reisende|anzahl.*reisende/.test(t)) fields.push("travelers");
  if (/von wo.*abfliegen|abflughafen|abflugort|von welchem flughafen/.test(t)) fields.push("origin");
  if (/wann.*reisen|reisezeit|monat.*saison|startdatum|reise starten/.test(t)) fields.push("timeframe");
  if (/interessen|urlaubstyp|reiseart|was.*erleben|strand|kultur|wellness|natur|aktivität|aktivitaet/.test(t)) fields.push("interests");
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
    interests: /\b(?:interessen|urlaubstyp|reiseart|interests)\s*:\s*([^\n,;]+)/i,
  };

  const labeled = v.match(labeledMatchers[field])?.[1]?.trim();
  if (labeled) return labeled;

  // Natural-language fallbacks: replies like "10 Tage nach Indien" should still
  // yield a clean destination/origin rather than a date-like whole sentence.
  if (field === "destination") {
    const place = extractDestination(v);
    if (place && place !== "deinem Reiseziel" && !isDateLike(place)) return place;
  }
  if (field === "origin") {
    // Route text like "srilanka to indiya" is NOT a valid departure city/airport.
    if (extractRouteParts(v)) return null;
    if (/\b(to|nach|bis|->|→)\b/i.test(v)) return null;
    const o = extractOrigin(v);
    if (o) return o;
  }
  if (field === "interests") {
    // Avoid treating interest words as anything else; keep raw value.
    return v;
  }
  return v;
}

// Walk the dialog: when the assistant asked about a field and the user replied
// next with non-empty text, mark that field as answered.
function isAnswerValid(field: MissingField, value: string): boolean {
  const v = extractFieldAnswer(field, value)?.trim() ?? "";
  if (!v) return false;
  if (isGenerationCommand(v)) return false;
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
      return /[A-Za-zÄÖÜäöüß]/.test(v) && !isDateLike(v) && !extractRouteParts(v) && !/\b(to|nach|bis|->|→)\b/i.test(v) && !isCountryOnly(v);
    case "timeframe":
      return (
        /\b\d{1,2}\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i.test(v) ||
        /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(v) ||
        /\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/.test(v) ||
        /\b\d{4}-\d{2}-\d{2}\b/.test(v) ||
        /\b(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|april|may|june|july|august|september|october|november|december|frühling|fruehling|sommer|herbst|winter)\b/i.test(v) ||
        /\b(flexibel|egal)\b/i.test(v)
      );
    case "interests":
      return /[A-Za-zÄÖÜäöüß]/.test(v) && !/^\s*(ja|nein|ok|okay|passt|stimmt)\s*$/i.test(v);
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

function getAnsweredFieldsFromUserMessages(uiMessages: UIMessage[]): Set<MissingField> {
  const answered = new Set<MissingField>();
  const fields: MissingField[] = ["destination", "budget", "duration", "travelers", "origin", "timeframe", "interests"];
  const textOf = (m: UIMessage) =>
    m.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";

  for (const m of uiMessages) {
    if (m.role !== "user") continue;
    const reply = textOf(m);
    for (const field of fields) {
      if (isAnswerValid(field, reply)) answered.add(field);
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
  const range = parseDateRangeDays(value);
  if (range !== null) return range;
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
  // word number + unit ("one month", "ein monat", "eine woche", "zwei wochen")
  const word = t.match(/\b(one|ein|eine|two|zwei|three|drei|four|vier|five|fünf|fuenf|six|sechs|seven|sieben|eight|acht|nine|neun|ten|zehn)\s+(tag|tage|tagen|nacht|nächte|naechte|day|days|night|nights|woche|wochen|week|weeks|monat|monate|month|months)\b/);
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
  const routed = extractRouteDestination(value);
  if (routed) return routed;

  const first = value.split(/[.,;:!?\n]/)[0]?.trim() ?? "";
  // Take up to 3 words
  const words = first.split(/\s+/).slice(0, 3);
  const cleaned = words
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
  return normalizePlaceName(cleaned);
}

const COUNTRY_ALIASES: Record<string, string> = {
  india: "Indien", indien: "Indien", indiya: "Indien",
  "sri lanka": "Sri Lanka", srilanka: "Sri Lanka",
  germany: "Deutschland", deutschland: "Deutschland",
  turkey: "Türkei", türkei: "Türkei", tuerkei: "Türkei",
  greece: "Griechenland", griechenland: "Griechenland",
  spain: "Spanien", spanien: "Spanien",
  italy: "Italien", italien: "Italien",
  france: "Frankreich", frankreich: "Frankreich",
  thailand: "Thailand",
  malaysia: "Malaysia",
  indonesia: "Indonesien", indonesien: "Indonesien",
  egypt: "Ägypten", ägypten: "Ägypten", aegypten: "Ägypten",
  croatia: "Kroatien", kroatien: "Kroatien",
  portugal: "Portugal",
  morocco: "Marokko", marokko: "Marokko",
  japan: "Japan",
  china: "China",
  vietnam: "Vietnam",
};

// Country names (German/English) used to detect country-only origins.
const COUNTRY_ONLY_SET = new Set([
  "indien", "india", "sri lanka", "srilanka", "deutschland", "germany",
  "türkei", "turkei", "tuerkei", "turkey", "griechenland", "greece",
  "spanien", "spain", "italien", "italy", "frankreich", "france",
  "thailand", "malaysia", "indonesien", "indonesia", "ägypten", "aegypten", "egypt",
  "kroatien", "croatia", "portugal", "marokko", "morocco", "japan", "china", "vietnam",
]);

function isCountryOnly(value: string): boolean {
  const k = value.trim().toLowerCase().replace(/\s+/g, " ");
  return COUNTRY_ONLY_SET.has(k);
}

function normalizePlaceName(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  const key = compact.toLowerCase().replace(/[._-]/g, " ");
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  return compact.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Generic route parser: "von X nach Y", "from X to Y", "X to Y", "X → Y", "X -> Y".
// Captures up to 3 words per side; stops at punctuation.
function extractRouteParts(text: string): { origin: string; destination: string } | null {
  const PLACE = "[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß'’.\\- ]{1,40}?";
  // German: "von X nach Y" (optionally "Ich reise … von X nach Y")
  let m = text.match(new RegExp(`\\bvon\\s+(${PLACE})\\s+nach\\s+(${PLACE})(?=[\\s,.;:!?\\n]|$)`, "i"));
  // English: "from X to Y"
  if (!m) m = text.match(new RegExp(`\\bfrom\\s+(${PLACE})\\s+to\\s+(${PLACE})(?=[\\s,.;:!?\\n]|$)`, "i"));
  // Arrows / dashes: "X → Y" / "X -> Y"
  if (!m) m = text.match(new RegExp(`\\b(${PLACE})\\s*(?:→|->|—|–)\\s*(${PLACE})(?=[\\s,.;:!?\\n]|$)`, "i"));
  // Bare "X to Y" (English fallback; avoid matching "to" inside longer sentences)
  if (!m) m = text.match(new RegExp(`^\\s*(${PLACE})\\s+to\\s+(${PLACE})\\s*$`, "i"));
  if (!m) return null;
  const origin = normalizePlaceName(m[1].trim().split(/\s+/).slice(0, 3).join(" "));
  const destination = normalizePlaceName(m[2].trim().split(/\s+/).slice(0, 3).join(" "));
  if (!origin || !destination || origin.toLowerCase() === destination.toLowerCase()) return null;
  return { origin, destination };
}

function extractRouteDestination(text: string): string | null {
  return extractRouteParts(text)?.destination ?? null;
}

function formatMissingField(field: MissingField, ctx?: { originCountry?: string | null }): string {
  switch (field) {
    case "destination":
      return "**Wohin soll es gehen** oder welche Art Urlaub möchtest du?";
    case "budget":
      return "**Wie hoch ist dein ungefähres Budget?** (gesamt für die Gruppe oder pro Person — bitte angeben)";
    case "duration":
      return "**Wie lange möchtest du reisen?**";
    case "travelers":
      return "**Wie viele Personen reisen mit?**";
    case "origin":
      if (ctx?.originCountry) {
        return `**Von welcher Stadt oder welchem Flughafen in ${ctx.originCountry} möchtest du abfliegen?**`;
      }
      return "**Von welchem Flughafen oder welcher Stadt möchtest du abfliegen?**";
    case "timeframe":
      return '**Wann ungefähr möchtest du reisen?** (Monat, Saison oder „flexibel")';
    case "interests":
      return "**Was ist dir im Urlaub wichtig?** (z. B. Strand, Kultur, Wellness, Natur oder Abenteuer)";
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
    case "interests": return "Interessen";
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

  const prompts = missing.map(formatMissingField);

  // First user message with little parsed → warm welcome + bundled list (only once at start)
  if (userMessageCount <= 1 && missing.length >= 5) {
    return [
      "Hi! 👋 Schön, dass du da bist — ich helfe dir, deinen perfekten Urlaub zu planen.",
      "",
      "Du kannst mir z. B. einfach schreiben:",
      '> *„7 Tage Mallorca, 2 Personen, Budget 1.500 €, Strand & Entspannung, ab Frankfurt, im Juni"*',
      "",
      "Damit ich direkt loslegen kann, brauche ich noch kurz:",
      ...prompts.map((prompt) => `- ${prompt}`),
    ].join("\n");
  }

  // Bundle all remaining missing fields in ONE concise message.
  // Never say "Perfekt" or imply planning can start while fields are missing.
  if (missing.length > 1) {
    const intro =
      userMessageCount <= 2
        ? "Super, fast alles da! Mir fehlen noch:"
        : `Fast geschafft — noch ${missing.length} Angaben fehlen:`;
    return [intro, "", ...prompts.map((prompt) => `- ${prompt}`)].join("\n");
  }

  // Exactly one field left → ask that one question directly.
  return `Eine letzte Frage noch: ${prompts[0]}`;
}

function isTripConfirmationPrompt(text: string): boolean {
  return /reiseangaben.*prüfen|daten.*pakete.*erstellen|soll ich.*pakete/i.test(text);
}

function isConfirmPackageReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 80 || /\b(aber|doch|statt|instead|change|ändern|aendern|korrigier|lieber|eigentlich)\b/i.test(t)) return false;
  return /^(ja|yes|ok|okay|passt|stimmt|genau|richtig|bestätige|bestaetige|mach|machen|erstellen|create|generate|paket|pakete|pakeg)(\b|\s)/i.test(t)
    || /\b(ja.*paket|pakete.*erstellen|package.*create|pakeg.*create|create.*pakeg|mach.*pakete|passt.*pakete)\b/i.test(t);
}

function buildTripConfirmationReply(params: {
  destination: string;
  budget: number;
  durationDays: number;
  travelers: number;
  origin: string;
  timeframe: string;
  interests: string[];
}) {
  return [
    "Ich prüfe kurz deine Reiseangaben, damit keine alten Daten verwendet werden:",
    "",
    `- **Reiseziel:** ${params.destination}`,
    `- **Budget:** ${params.budget.toLocaleString("de-DE")} € pro Person`,
    `- **Reisedauer:** ${params.durationDays} Tage`,
    `- **Personen:** ${params.travelers}`,
    `- **Abflug:** ${params.origin}`,
    `- **Reisezeit:** ${params.timeframe}`,
    `- **Interessen:** ${params.interests.join(", ")}`,
    "",
    "Soll ich **mit genau diesen Daten** die 3 Pakete erstellen?",
  ].join("\n");
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
    if (isGenerationCommand(lines[i]) || isConfirmPackageReply(lines[i])) continue;
    const range = parseDateRangeDays(lines[i]);
    if (range) return range;
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

function isLikelyFieldOnlyMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (parseBudgetValue(t) !== null) return true;
  if (parseAnswerDurationDays(t) !== null) return true;
  if (parseAnswerTravelers(t) !== null && /\b(person|personen|reisende|gäste|gaeste|pax|adult|adults|allein|solo|paar|familie)\b/i.test(t)) return true;
  if (/^(ja|yes|ok|okay|passt|stimmt|genau|richtig|nein|no|danke|thanks)$/i.test(t)) return true;
  if (/^(budget|dauer|reisedauer|personen|reisende|abflug|abflughafen|reisezeit|zeitraum|interessen)\b/i.test(t)) return true;
  if (/\b(abflug|abflughafen|von|ab)\b/i.test(t) && !/\b(nach|to|in)\b/i.test(t)) return true;
  if (/\b(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|may|june|july|october|december|sommer|winter|herbst|frühling|fruehling|flexibel|egal)\b/i.test(t) && t.split(/\s+/).length <= 4) return true;
  // Interest-only replies (e.g. "Wellness", "Strand, Kultur") must not be
  // re-interpreted as a destination by extractDestination().
  if (t.split(/\s+/).length <= 5 && /^(?:[a-zäöüß&,\/\s\-]+)$/i.test(t) && /\b(wellness|strand|kultur|natur|abenteuer|luxus|entspannung|shopping|essen|kulinarik|safari|kunst|museen|sport|nightlife|familie|romantik|honeymoon)\b/i.test(t)) return true;
  return false;
}

function isGenerationCommand(text: string): boolean {
  return /\b(package|packages|paket|pakete|pakeg|create|erstellen|generieren|mach|machen|generate|build)\b/i.test(text);
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
    if (isGenerationCommand(line) || isConfirmPackageReply(line)) continue;
    const routeDestination = extractRouteDestination(line);
    if (routeDestination) return routeDestination;
    const explicit = line.match(/(?:reiseziel|ziel)\s*:?\s*([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (explicit?.[1] && !isDateLike(explicit[1])) return normalizePlaceName(cleanDestination(explicit[1]));

    // "7 Tage Mallorca", "2 Nächte Lissabon", "eine Woche Bali"
    const afterDuration = line.match(/\b\d+\s+(?:tag|tage|tagen|nacht|nächte|naechte|nächten|naechten|woche|wochen)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (afterDuration?.[1] && !isDateLike(afterDuration[1])) {
      const cand = cleanDestination(afterDuration[1]);
      if (cand && !isDateLike(cand)) return normalizePlaceName(cand);
    }

    const byPrep = line.match(/(?:nach|to|in)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß.'’\- ]{2,})/i);
    if (byPrep?.[1] && !isDateLike(byPrep[1])) {
      const cand = cleanDestination(byPrep[1]);
      if (cand && !isDateLike(cand)) return normalizePlaceName(cand);
    }

    const firstChunk = line.split(",")[0]?.trim();
    if (firstChunk && !isLikelyFieldOnlyMessage(firstChunk) && !/^(budget|abflug|abflugort|reisezeit|reisedauer|anzahl|im|am)/i.test(firstChunk) && !isDateLike(firstChunk)) {
      const cleaned = firstChunk.replace(/^(städtetrip|staedtetrip|citytrip|honeymoon|strandurlaub|wellnessurlaub|dein urlaub in|mein urlaub in|urlaub in)\s+/i, "").trim();
      if (cleaned && !isDateLike(cleaned)) return normalizePlaceName(cleanDestination(cleaned));
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
  const lines = history.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (isGenerationCommand(line)) continue;
    const routeOrigin = extractRouteParts(line)?.origin;
    if (routeOrigin) return routeOrigin;
    const labeled = line.match(/\b(?:abflug|abflughafen|abflugort|origin|departure|von|ab)\s*:\s*([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\- ]{2,30})/i);
    const direct = line.match(/\b(?:ab|von|abflug(?:ort|hafen)?|start(?:en)?\s+in|flughafen)\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\- ]{2,30})/i);
    const value = labeled?.[1] ?? direct?.[1];
    if (value) {
      const cleaned = value.split(/[,.;:!?\n]/)[0].trim().split(/\s+/).slice(0, 3).join(" ");
      if (cleaned) return normalizePlaceName(cleaned);
    }
  }
  return undefined;
}

const WORD_NUMS: Record<string, number> = {
  allein: 1, solo: 1, "ein": 1, "eine": 1, "einer": 1, "eins": 1,
  paar: 2, pärchen: 2, paerchen: 2, "zu zweit": 2, zwei: 2,
  "zu dritt": 3, drei: 3,
  "zu viert": 4, vier: 4, familie: 4,
  fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
};

function extractTravelers(history: string): number | undefined {
  const lines = history.split(/\n+/).map((line) => line.toLowerCase().trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const lower = lines[i];
    if (isGenerationCommand(lower)) continue;
    const num = lower.match(/(\d{1,2})\s?(person|personen|erwachsene|reisende|gäste|leute|pers\.?|pax|adult|adults)\b/);
    if (num) {
      const n = Number(num[1]);
      if (n > 0 && n < 30) return n;
    }
    for (const [word, n] of Object.entries(WORD_NUMS)) {
      if (new RegExp(`\\b${word}\\b`).test(lower)) return n;
    }
  }
  return undefined;
}

function extractTravelMonth(history: string): string | undefined {
  const lines = history.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (isGenerationCommand(line) || isConfirmPackageReply(line)) continue;
    const labeled = line.match(/\b(?:datum|startdatum|reisezeit|reisezeitraum|zeitraum|monat|month|date|start date|timeframe)\s*:\s*([^\n,;]+)/i);
    const source = labeled?.[1] ?? line;
    const m = source.match(/\b(januar|february|februar|märz|maerz|march|april|mai|may|juni|june|juli|july|august|september|oktober|october|november|dezember|december|january|aug|sep|sept|oct|nov|dec|jan|feb|mar|apr|jun|jul|frühling|fruehling|sommer|herbst|winter|flexibel|egal)\b/i);
    if (m?.[1]) return m[1].toLowerCase();
    const relative = source.match(/\b(nächst(?:e|en|er|es)?\s+(?:monat|sommer|winter|frühling|fruehling|herbst)|kommend(?:e|en|er|es)?\s+(?:monat|sommer|winter|frühling|fruehling|herbst)|in\s+\d+\s+monat(?:en)?)\b/i);
    if (relative?.[1]) return relative[1].toLowerCase();
  }
  return undefined;
}

function extractInterests(history: string): string[] {
  const lines = history.split(/\n+/).map((line) => line.toLowerCase().trim()).filter(Boolean);
  const pool = [
    ["strand", "Strand & Entspannung"],
    ["kultur", "Kultur & Altstadt"],
    ["wellness", "Wellness & Ruhe"],
    ["essen", "Kulinarik & lokale Küche"],
    ["kulinarik", "Kulinarik & lokale Küche"],
    ["natur", "Natur & Aussichtspunkte"],
    ["abenteuer", "Abenteuer & Aktivität"],
    ["shopping", "Shopping & Bummeln"],
    ["einkauf", "Shopping & Bummeln"],
    ["kunst", "Kunst & Museen"],
    ["museum", "Kunst & Museen"],
    ["museen", "Kunst & Museen"],
    ["tempel", "Tempel & Spiritualität"],
    ["sehenswürdig", "Sehenswürdigkeiten"],
    ["sehenswuerdig", "Sehenswürdigkeiten"],
    ["touristisch", "Sehenswürdigkeiten"],
  ] as const;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (isGenerationCommand(line)) continue;
    // Skip lines that are pure route text — they're not interests.
    if (extractRouteParts(line) || /^[a-zäöüß\s]+\s+(to|nach|bis|→|->)\s+[a-zäöüß\s]+$/i.test(line)) continue;
    const matched = Array.from(new Set(pool.filter(([key]) => line.includes(key)).map(([, label]) => label)));
    if (matched.length > 0) return matched;
  }
  return ["Highlights entdecken", "Entspannung", "Lokales erleben"];
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

function cleanHotelDescription(raw: string, destination: string): string {
  if (!raw) return raw;
  const dest = destination.trim();
  if (!dest) return raw.trim();
  const escaped = dest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Strip patterns like " in Indien", " in der Region Indien", trailing "(Indien)", etc.
  let out = raw
    .replace(new RegExp(`\\s*\\(\\s*${escaped}\\s*\\)`, "gi"), "")
    .replace(new RegExp(`\\s+in\\s+(?:der\\s+Region\\s+|den\\s+|dem\\s+|der\\s+)?${escaped}\\b`, "gi"), "")
    .replace(new RegExp(`\\b${escaped}\\s+`, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+·\s+·\s+/g, " · ")
    .trim()
    .replace(/^[·,\-\s]+|[·,\-\s]+$/g, "");
  return out || raw.trim();
}

function extractActivitiesFromItinerary(
  itinerary: ParsedPackage["itinerary"],
  destination: string,
): string[] {
  const dest = destination.trim().toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const day of itinerary) {
    // Split description by "·" and pull each segment (Vormittag/Nachmittag/Abend).
    const segments = (day.description || "").split(/·|•/g);
    for (const seg of segments) {
      const cleaned = seg
        .replace(/^\s*(Vormittag|Nachmittag|Abend|Morgens|Mittags|Abends)\s*:?\s*/i, "")
        .trim()
        .replace(/[.;]+$/, "");
      if (!cleaned) continue;
      // Skip pure arrival/departure filler
      if (/^(Anreise|Heimreise|Rückreise|Transfer|Heimflug|Abflug|Ankunft|Einchecken|Heim)/i.test(cleaned)) continue;
      // Skip if it's just the destination name
      if (cleaned.toLowerCase() === dest) continue;
      // Keep short, activity-sounding phrases
      const short = cleaned.length > 90 ? cleaned.slice(0, 87).trim() + "…" : cleaned;
      const key = short.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(short);
      if (out.length >= 8) return out;
    }
  }
  return out;
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
    const hotelRaw = research.hotels[index] ?? research.hotels.at(-1) ?? `Sorgfältig ausgewähltes Hotel`;
    const hotel = cleanHotelDescription(hotelRaw, destination);
    const flight = research.flights[index] ?? research.flights.at(-1) ?? `Passender Flug nach ${destination}`;
    const badges = buildPackageBadges(type, research);
    const extracted = extractActivitiesFromItinerary(itineraryTemplate, destination);
    const activities = extracted.length > 0 ? extracted : [`Highlights in ${destination}`];

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
      activities,
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
  destination: z.string().nullable().describe("Reiseziel: Stadt, Region oder Land. null wenn unklar."),
  budgetEur: z.number().nullable().describe("Gesamtbudget pro Person in EUR. Null wenn fehlt oder < 100."),
  durationDays: z.number().nullable().describe("Reisedauer in Tagen. '2 Wochen'=14, '1 Monat'=30. Null wenn fehlt."),
  travelers: z.number().nullable().describe("Anzahl Personen. 'allein'=1, 'Paar'=2, 'Familie'=4. Null wenn fehlt."),
  originCity: z.string().nullable().describe("Abflugort/Stadt/Flughafen. Null wenn fehlt."),
  timeframe: z.string().nullable().describe("Reisezeitraum: Monat/Saison/Datum/'flexibel'. Null wenn fehlt."),
  interests: z.array(z.string()).nullable().describe("Zuletzt genannte Interessen/Urlaubsart. Null wenn nichts genannt."),
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
      system: `Du extrahierst Reisedaten aus einem Chat zwischen Reiseberater und Nutzer.
Berücksichtige den GESAMTEN Verlauf — Antworten können kurz und über mehrere Nachrichten verteilt sein.

KRITISCH — LETZTER WERT GEWINNT (Overwrite-Regel):
- Ändert/korrigiert/überschreibt der Nutzer einen Wert (z. B. erst "Indien", später "eigentlich Malaysia"; oder "doch 2000€", "lieber 10 Tage", "ab Berlin statt München", "doch Wellness statt Strand"), nimm IMMER die ZULETZT genannte Version.
- Das gilt für JEDES Feld: destination, budgetEur, durationDays, travelers, originCity, timeframe, interests.
- Bei interests: nur die zuletzt genannten Interessen zurückgeben, NICHT mit alten kombinieren.
- Gib niemals einen veralteten Wert zurück, wenn später ein neuer genannt wurde.

Verstehe natürliche Sprache, nicht nur strikte Formate. Wenn ein Feld nie genannt wurde, gib null zurück.
Antworte ausschließlich gemäß Schema.`,
      prompt: `Chatverlauf (chronologisch, unten = neuer):\n${transcript}\n\nExtrahiere die FINALEN Reisedaten — bei Änderungen zählt die jeweils neueste Angabe.`,
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
      interests: null,
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

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI backend key missing", { status: 500 });

        const aiGateway = createLovableAiGatewayProvider(key);
        const model = aiGateway("google/gemini-3-flash-preview");
        const uiMessages = messages as UIMessage[];

        const textOf = (m: UIMessage) =>
          m.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastUserText = lastUser ? textOf(lastUser) : "";
        const previousAssistant = [...uiMessages]
          .reverse()
          .find((m) => m.role === "assistant");
        const confirmedFinalTripState = Boolean(
          previousAssistant
          && isTripConfirmationPrompt(textOf(previousAssistant))
          && isConfirmPackageReply(lastUserText),
        );
        const userHistory = uiMessages
          .filter((m) => m.role === "user")
          .map(textOf)
          .join("\n");

        // LLM-based extraction — robust to natural language across the dialog.
        const extracted = await extractTripFieldsLLM(model, uiMessages);

        // STRICT: planning starts only when all 6 required fields are explicitly
        // present in the dialog history. We trust regex/history + direct answers
        // for completeness, and use LLM extraction only to shape the final values.
        const regexSignals = getPlanningSignals("", userHistory);
        const dialogPreview = getDialogAnswers(uiMessages);

        // Track which fields the assistant has already asked the user.
        // If a field was asked but never validly answered, it counts as missing
        // even if a loose regex match elsewhere would otherwise satisfy it.
        const askedFields = new Set<MissingField>();
        for (const m of uiMessages) {
          if (m.role !== "assistant") continue;
          for (const f of detectAskedFields(textOf(m))) askedFields.add(f);
        }
        const answeredInDialog = getAnsweredFieldsFromDialog(uiMessages);
        const answeredInUserMessages = getAnsweredFieldsFromUserMessages(uiMessages);

        const fieldHas = (field: MissingField, looseSignal: boolean): boolean => {
          // If the assistant explicitly asked about this field, the user MUST
          // have replied with a valid answer — no loose/LLM inference allowed.
          if (askedFields.has(field)) return answeredInDialog.has(field) || answeredInUserMessages.has(field);
          return looseSignal;
        };

        const has = {
          destination: fieldHas(
            "destination",
            !!(regexSignals.hasDestination || dialogPreview.destination),
          ),
          budget: fieldHas(
            "budget",
            !!(
              (dialogPreview.budget && (parseBudgetValue(dialogPreview.budget) ?? 0) >= MIN_BUDGET_EUR)
              || ((parseBudgetValue(userHistory) ?? 0) >= MIN_BUDGET_EUR)
            ),
          ),
          duration: fieldHas(
            "duration",
            !!(
              regexSignals.hasDuration
              || (dialogPreview.duration && parseAnswerDurationDays(dialogPreview.duration))
            ),
          ),
          travelers: fieldHas(
            "travelers",
            !!(
              regexSignals.hasTravelers
              || (dialogPreview.travelers && parseAnswerTravelers(dialogPreview.travelers))
            ),
          ),
          origin: fieldHas(
            "origin",
            !!(regexSignals.hasOrigin || dialogPreview.origin),
          ),
          timeframe: fieldHas(
            "timeframe",
            !!(regexSignals.hasTimeframe || dialogPreview.timeframe),
          ),
          interests: fieldHas(
            "interests",
            !!(regexSignals.hasInterests || dialogPreview.interests || (extracted.interests && extracted.interests.length > 0)),
          ),
        };
        const missingFields: MissingField[] = [];
        if (!has.destination) missingFields.push("destination");
        if (!has.budget) missingFields.push("budget");
        if (!has.duration) missingFields.push("duration");
        if (!has.travelers) missingFields.push("travelers");
        if (!has.origin) missingFields.push("origin");
        if (!has.timeframe) missingFields.push("timeframe");
        if (!has.interests) missingFields.push("interests");

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

        // Field-mapping rule: dialog answer to the destination question wins.
        // Never overwrite destination with interest/origin/duration answers,
        // even if the LLM extractor or loose regex re-interprets later text.
        const historyDestination = extractDestination(userHistory);
        const destination = dialog.destination
          ? cleanPlace(dialog.destination)
          : (historyDestination !== "deinem Reiseziel"
              ? cleanPlace(historyDestination)
              : (extracted.destination ? cleanPlace(extracted.destination) : historyDestination));

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

        const llmInterests = (extracted.interests ?? [])
          .map((s) => s.trim())
          .filter(Boolean);
        const interests = llmInterests.length > 0
          ? llmInterests
          : (dialog.interests ? [dialog.interests] : extractInterests(userHistory));
        const origin = dialog.origin
          ? cleanPlace(dialog.origin)
          : (extracted.originCity ? cleanPlace(extracted.originCity) : extractOrigin(userHistory));
        const travelers = extracted.travelers
          ?? (dialog.travelers ? parseAnswerTravelers(dialog.travelers) : null)
          ?? extractTravelers(userHistory);
        const travelMonth = extracted.timeframe
          ? (extractTravelMonth(extracted.timeframe) ?? extracted.timeframe.toLowerCase())
          : (dialog.timeframe ? (extractTravelMonth(dialog.timeframe) ?? extractTravelMonth(userHistory)) : extractTravelMonth(userHistory));
        const travelStartDate = extracted.timeframe ?? dialog.timeframe ?? undefined;

        // FINAL VALIDATION GATE — verify resolved trip state before generating packages.
        const validationMissing: MissingField[] = [];
        if (!destination || /^deinem reiseziel$/i.test(destination) || isDateLike(destination)) validationMissing.push("destination");
        if (!budget || budget < MIN_BUDGET_EUR) validationMissing.push("budget");
        if (!requestedDurationDays || requestedDurationDays <= 0) validationMissing.push("duration");
        if (!travelers || travelers <= 0) validationMissing.push("travelers");
        if (!origin || isDateLike(origin)) validationMissing.push("origin");
        if (!travelMonth && !travelStartDate) validationMissing.push("timeframe");
        if (interests.length === 0) validationMissing.push("interests");
        if (validationMissing.length > 0) {
          const userMessageCount = uiMessages.filter((m) => m.role === "user").length;
          return createTextStreamResponse(
            buildConciergeReply(validationMissing, userMessageCount),
            uiMessages,
          );
        }

        if (!confirmedFinalTripState) {
          return createTextStreamResponse(
            buildTripConfirmationReply({
              destination,
              budget,
              durationDays: requestedDurationDays,
              travelers: travelers!,
              origin: origin!,
              timeframe: travelStartDate ?? travelMonth ?? "flexibel",
              interests,
            }),
            uiMessages,
          );
        }





        let researchText = "";
        let itineraryTemplate: ParsedPackage["itinerary"] = buildDeterministicItinerary(
          destination,
          requestedDurationDays,
          interests,
        );

        if (requestedDurationDays <= 14) {
          const [research, itinerary] = await Promise.all([
            generateText({
              model,
              system: RESEARCH_SYSTEM,
              prompt: `Travel brief:\n"""${brief}"""\nProduce flights & hotels.`,
            }),
            generateText({
              model,
              system: ITINERARY_SYSTEM,
              prompt: `Brief:\n${brief}\n\nBuild the itinerary in German for EXACTLY ${requestedDurationDays} days in ${destination}. Include every day from Tag 1 to Tag ${requestedDurationDays}.`,
            }),
          ]);
          researchText = research.text;

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

        const [{ supabaseAdmin }, { fetchPackageRatings }] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/ratings.server"),
        ]);

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

        // Hard timeout: ratings scraping can be very slow (multiple Firecrawl
        // searches per package). Cap the whole batch at 20s so we don't hit
        // Cloudflare's 100s gateway timeout. Fall back to empty ratings.
        const ratingsPerPackage = await Promise.race([
          Promise.all(
            normalized.map((p) =>
              fetchPackageRatings({ hotel: p.hotel, destination: p.destination })
                .catch(() => [] as Awaited<ReturnType<typeof fetchPackageRatings>>),
            ),
          ),
          new Promise<Awaited<ReturnType<typeof fetchPackageRatings>>[]>((resolve) =>
            setTimeout(() => resolve(normalized.map(() => [])), 20_000),
          ),
        ]);

        const packagesWithLinks = normalized.map((p, i) => ({
          ...p,
          durationDays: requestedDurationDays,
          origin,
          travelers,
          travelMonth,
          travelStartDate,
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
