// Deep-link helpers (client + server safe — pure functions).

const ORIGIN_IATA: Record<string, string> = {
  münchen: "MUC",
  muenchen: "MUC",
  munich: "MUC",
  berlin: "BER",
  hamburg: "HAM",
  frankfurt: "FRA",
  köln: "CGN",
  koeln: "CGN",
  cologne: "CGN",
  stuttgart: "STR",
  düsseldorf: "DUS",
  duesseldorf: "DUS",
  wien: "VIE",
  vienna: "VIE",
  zürich: "ZRH",
  zuerich: "ZRH",
  zurich: "ZRH",
  basel: "BSL",
  genf: "GVA",
  geneva: "GVA",
  hannover: "HAJ",
  hanover: "HAJ",
  nürnberg: "NUE",
  nuernberg: "NUE",
  nuremberg: "NUE",
  leipzig: "LEJ",
  dresden: "DRS",
  bremen: "BRE",
  dortmund: "DTM",
  chennai: "MAA",
  madras: "MAA",
  colombo: "CMB",
  jaffna: "JAF",
};

const DEST_IATA: Record<string, string> = {
  lissabon: "LIS",
  lisbon: "LIS",
  lisboa: "LIS",
  porto: "OPO",
  mallorca: "PMI",
  "palma de mallorca": "PMI",
  palma: "PMI",
  ibiza: "IBZ",
  teneriffa: "TFS",
  tenerife: "TFS",
  gran: "LPA",
  "gran canaria": "LPA",
  fuerteventura: "FUE",
  lanzarote: "ACE",
  madeira: "FNC",
  funchal: "FNC",
  paris: "CDG",
  london: "LHR",
  rom: "FCO",
  rome: "FCO",
  roma: "FCO",
  mailand: "MXP",
  milan: "MXP",
  milano: "MXP",
  barcelona: "BCN",
  madrid: "MAD",
  amsterdam: "AMS",
  prag: "PRG",
  prague: "PRG",
  budapest: "BUD",
  wien: "VIE",
  athen: "ATH",
  athens: "ATH",
  kreta: "HER",
  crete: "HER",
  heraklion: "HER",
  rhodos: "RHO",
  rhodes: "RHO",
  santorin: "JTR",
  santorini: "JTR",
  malta: "MLA",
  zypern: "LCA",
  cyprus: "LCA",
  istanbul: "IST",
  antalya: "AYT",
  bali: "DPS",
  denpasar: "DPS",
  bangkok: "BKK",
  dubai: "DXB",
  "new york": "JFK",
  newyork: "JFK",
  nyc: "JFK",
  tokio: "HND",
  tokyo: "HND",
  marrakesch: "RAK",
  marrakech: "RAK",
  kopenhagen: "CPH",
  copenhagen: "CPH",
  stockholm: "ARN",
  oslo: "OSL",
  reykjavik: "KEF",
  colombo: "CMB",
  jaffna: "JAF",
  "sri lanka": "CMB",
  phuket: "HKT",
  "koh samui": "USM",
  "chiang mai": "CNX",
  singapur: "SIN",
  singapore: "SIN",
  "kuala lumpur": "KUL",
  malediven: "MLE",
  maldives: "MLE",
  male: "MLE",
  mauritius: "MRU",
  seychellen: "SEZ",
  seychelles: "SEZ",
  kapstadt: "CPT",
  "cape town": "CPT",
  kairo: "CAI",
  cairo: "CAI",
  cancun: "CUN",
  cancún: "CUN",
  "los angeles": "LAX",
  miami: "MIA",
  hawaii: "HNL",
  honolulu: "HNL",
  sydney: "SYD",
  melbourne: "MEL",
  florenz: "FLR",
  florence: "FLR",
  italien: "FLR",
  italy: "FLR",
  deutschland: "FRA",
  germany: "FRA",
};

const MONTHS: Record<string, number> = {
  januar: 1,
  january: 1,
  jan: 1,
  februar: 2,
  february: 2,
  feb: 2,
  märz: 3,
  maerz: 3,
  march: 3,
  mar: 3,
  mär: 3,
  april: 4,
  apr: 4,
  mai: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  october: 10,
  oct: 10,
  okt: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  december: 12,
  dec: 12,
  dez: 12,
};

function normalizeLookupKey(input?: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function lookupIata(input: string | undefined, map: Record<string, string>): string | null {
  const key = normalizeLookupKey(input);
  if (!key) return null;
  if (/^[a-z]{3}$/i.test(key)) return key.toUpperCase();
  const normalizedMap = Object.fromEntries(
    Object.entries(map).map(([alias, code]) => [normalizeLookupKey(alias), code]),
  );
  if (normalizedMap[key]) return normalizedMap[key];

  const words = key.split(/\s+/).filter(Boolean);
  for (let size = Math.min(3, words.length); size >= 1; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const phrase = words.slice(start, start + size).join(" ");
      if (normalizedMap[phrase]) return normalizedMap[phrase];
    }
  }

  return null;
}

export function lookupOriginIata(city?: string): string | null {
  return lookupIata(city, ORIGIN_IATA);
}

export function lookupDestIata(dest?: string): string | null {
  return lookupIata(dest, DEST_IATA);
}

function ddmmyy(d: Date) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}${mm}${yy}`;
}

function ddmm(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns [depYYMMDD, retYYMMDD] for a month name + duration in days. */
export function travelDatesFromMonth(month?: string, durationDays = 7): [string, string] | null {
  if (!month) return null;
  const m = MONTHS[month.toLowerCase().trim()];
  if (!m) return null;
  const now = new Date();
  let year = now.getFullYear();
  // if month already passed this year, use next year
  if (m < now.getMonth() + 1) year += 1;
  // mid-month departure for plausibility
  const dep = new Date(year, m - 1, 15);
  const ret = new Date(dep);
  ret.setDate(ret.getDate() + Math.max(1, durationDays));
  return [ddmmyy(dep), ddmmyy(ret)];
}

/** Deduplicate country or repeating patterns in destination names. */
export function deduplicateDestination(input?: string): string {
  if (!input) return "";
  const parts = input.split(",").map((p) => p.trim());
  const uniqueParts: string[] = [];
  const seenParts = new Set<string>();
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!seenParts.has(lower)) {
      seenParts.add(lower);
      uniqueParts.push(part);
    }
  }
  return uniqueParts.join(", ");
}

/** Sanity-check a destination string before sending it to partners as a keyword. */
function cleanDestination(input?: string): string {
  const deduped = deduplicateDestination(input);
  const s = deduped.trim().replace(/^[-–—\s]+|[-–—\s]+$/g, "");
  if (s.length < 2) return "";
  return s;
}

/**
 * Extract just the city name from a destination string like "Jaffna, Sri Lanka"
 * or "Bali, Indonesien" — returns the first comma-separated part.
 */
function extractCityName(destination: string): string {
  const cleaned = cleanDestination(destination);
  if (!cleaned) return "";
  const city = cleaned.split(",")[0].trim();
  return city || cleaned;
}

/** Parse a user-provided start date ("10. Juni 2026", "10.06.2026", "2026-06-10") to a Date. */
export function parseStartDate(input?: string): Date | null {
  if (!input) return null;
  const s = input.trim();
  // ISO YYYY-MM-DD
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const yr = Number(m[3]);
    return new Date(yr < 100 ? 2000 + yr : yr, Number(m[2]) - 1, Number(m[1]));
  }
  // DD.MM or DD/MM, including ranges like "15.06 - 22.06".
  m = s.match(/(\d{1,2})[./-](\d{1,2})(?![./-]\d)/);
  if (m) {
    const day = Number(m[1]);
    const monthIdx = Number(m[2]);
    if (monthIdx >= 1 && monthIdx <= 12 && day >= 1 && day <= 31) {
      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(year, monthIdx - 1, day);
      if (candidate < now) year += 1;
      return new Date(year, monthIdx - 1, day);
    }
  }
  // "10. Juni 2026" or "10. Juni"
  m = s.match(/(\d{1,2})\.\s*([a-zäöüß]+)(?:\s+(\d{4}))?/i);
  if (m) {
    const monthIdx = MONTHS[m[2].toLowerCase()];
    if (monthIdx) {
      const day = Number(m[1]);
      const now = new Date();
      let year = m[3] ? Number(m[3]) : now.getFullYear();
      if (!m[3]) {
        const candidate = new Date(year, monthIdx - 1, day);
        if (candidate < now) year += 1;
      }
      return new Date(year, monthIdx - 1, day);
    }
  }
  return null;
}

// ─── Date helpers for partner URLs ───────────────────────────────────────────

function isoDatesFromStartOrMonth(
  startDate?: string,
  month?: string,
  durationDays = 7,
): [string, string] | null {
  const explicitRange = parseExplicitDateRange(startDate);
  if (explicitRange) return [isoDate(explicitRange[0]), isoDate(explicitRange[1])];
  const parsed = parseStartDate(startDate);
  if (parsed) {
    const ret = new Date(parsed);
    ret.setDate(ret.getDate() + Math.max(1, durationDays));
    return [isoDate(parsed), isoDate(ret)];
  }
  return isoDatesFromMonth(month, durationDays);
}

function parseExplicitDateRange(input?: string): [Date, Date] | null {
  if (!input) return null;
  const tokens = input.match(
    /\d{1,2}\.\s*[a-zäöüß]+(?:\s+\d{4})?|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}/gi,
  );
  if (!tokens || tokens.length < 2) return null;
  const departure = parseStartDate(tokens[0]);
  let returnToken = tokens[1];
  const firstYear = tokens[0].match(/\b(\d{4})\b/)?.[1];
  if (firstYear && !/\b\d{4}\b/.test(returnToken)) returnToken += ` ${firstYear}`;
  const returning = parseStartDate(returnToken);
  if (!departure || !returning || returning < departure) return null;
  return [departure, returning];
}

function isoDatesFromMonth(month?: string, durationDays = 7): [string, string] | null {
  if (!month) return null;
  const m = MONTHS[month.toLowerCase().trim()];
  if (!m) return null;
  const now = new Date();
  let year = now.getFullYear();
  if (m < now.getMonth() + 1) year += 1;
  const dep = new Date(year, m - 1, 15);
  const ret = new Date(dep);
  ret.setDate(ret.getDate() + Math.max(1, durationDays));
  return [isoDate(dep), isoDate(ret)];
}

function departureDateFromOpts(startDate?: string, month?: string): Date | null {
  const dep = parseStartDate(startDate);
  if (dep) return dep;
  if (!month) return null;
  const m = MONTHS[month.toLowerCase().trim()];
  if (!m) return null;
  const now = new Date();
  let year = now.getFullYear();
  if (m < now.getMonth() + 1) year += 1;
  return new Date(year, m - 1, 15);
}

// ─── Affiliate base URLs ────────────────────────────────────────────────────

/** Aviasales (Travelpayouts) affiliate deeplink — tracked redirect. */
export const AVIASALES_AFFILIATE_URL = "https://aviasales.tpm.li/o8SBry1n";

/** Klook affiliate deeplink (tracked redirect). */
export const KLOOK_ACTIVITIES_AFFILIATE_URL = "https://klook.tpm.li/WzC9L2in/";

/** KiwiTaxi affiliate deeplink (tracked redirect). */
export const KIWI_TAXI_AFFILIATE_URL = "https://kiwi.tpm.li/LxfkqIsk";

/** Travelpayouts API token (public affiliate marker). */
export const TRAVELPAYOUTS_TOKEN = "bdf35dd22b712ff287b1a4eecb16882f";

const AFFILIATE_MARKER = "728432";

// ─── Aviasales (Flights) ─────────────────────────────────────────────────────

/**
 * Flight deeplink — uses the Aviasales affiliate redirect.
 * The tpm.li shortlink doesn't forward query params, so we always return the
 * tracked short link to guarantee commission tracking. A fully-parameterised
 * Aviasales search URL is available via `buildAviasalesSearchUrl` for cases
 * where we want to deep-link directly into a search result.
 */
export function buildSkyscannerUrl(_opts: {
  destination: string;
  origin?: string;
  travelers?: number;
  month?: string;
  durationDays?: number;
}): string {
  return AVIASALES_AFFILIATE_URL;
}

/**
 * Direct Aviasales search URL with pre-filled fields.
 *
 * Uses two strategies in priority order:
 * 1. Path-based compact URL: `/search/{ORIG}{DDMM}{DEST}{DDMM}{ADULTS}`
 *    → triggers an actual search with results immediately.
 * 2. Query-param based URL: `search.aviasales.com/flights/?origin_iata=...`
 *    → pre-fills the search form reliably.
 * 3. Fallback: affiliate shortlink (commission always tracked).
 */
export function buildAviasalesSearchUrl(opts: {
  destination: string;
  origin?: string;
  travelers?: number;
  month?: string;
  startDate?: string;
  durationDays?: number;
}): string {
  const adults = Math.min(9, Math.max(1, opts.travelers ?? 1));
  const cleanDestVal = cleanDestination(opts.destination);
  const cleanOrigVal = cleanDestination(opts.origin);

  const originIata = lookupOriginIata(cleanOrigVal);
  const destIata = lookupDestIata(cleanDestVal);
  const duration = Math.max(1, opts.durationDays ?? 7);

  const dep = departureDateFromOpts(opts.startDate, opts.month);
  const explicitRange = parseExplicitDateRange(opts.startDate);

  let finalUrl = AVIASALES_AFFILIATE_URL;

  if (originIata && destIata && dep) {
    // Strategy 1: Path-based compact search URL — auto-runs the query.
    const ret = explicitRange?.[1] ?? new Date(dep);
    if (!explicitRange) ret.setDate(ret.getDate() + duration);
    const code = `${originIata}${ddmm(dep)}${destIata}${ddmm(ret)}${adults}`;
    const params = new URLSearchParams({
      marker: AFFILIATE_MARKER,
      currency: "eur",
    });
    finalUrl = `https://www.aviasales.com/search/${code}?${params.toString()}`;
  } else if (destIata && dep) {
    // Strategy 2: Query-param search — pre-fills the form even without origin.
    const ret = explicitRange?.[1] ?? new Date(dep);
    if (!explicitRange) ret.setDate(ret.getDate() + duration);
    const params = new URLSearchParams({
      marker: AFFILIATE_MARKER,
      currency: "eur",
      destination_iata: destIata,
      depart_date: isoDate(dep),
      return_date: isoDate(ret),
      adults: String(adults),
    });
    if (originIata) {
      params.set("origin_iata", originIata);
    }
    finalUrl = `https://search.aviasales.com/flights/?${params.toString()}`;
  } else if (originIata && destIata) {
    // Strategy 2b: Have both IATA codes but no date — still useful.
    const params = new URLSearchParams({
      marker: AFFILIATE_MARKER,
      currency: "eur",
      origin_iata: originIata,
      destination_iata: destIata,
      adults: String(adults),
    });
    finalUrl = `https://search.aviasales.com/flights/?${params.toString()}`;
  } else if (destIata) {
    // Minimal: just destination IATA.
    const params = new URLSearchParams({
      marker: AFFILIATE_MARKER,
      currency: "eur",
      destination_iata: destIata,
      adults: String(adults),
    });
    finalUrl = `https://search.aviasales.com/flights/?${params.toString()}`;
  }

  console.log("deeplink context", {
    provider: "aviasales",
    origin: cleanOrigVal,
    originIata,
    destination: cleanDestVal,
    destIata,
    dates: dep ? [isoDate(dep)] : undefined,
    travelers: adults,
    url: finalUrl,
  });

  return finalUrl;
}

// ─── Klook (Hotels) ──────────────────────────────────────────────────────────

/** Tracked Aviasales Hotels affiliate link used by every hotel booking CTA. */
export const AVIASALES_HOTELS_AFFILIATE_URL = "https://aviasales.tpm.li/o8SBry1n";

/** Hotel deeplink — kept under the existing export name for backwards compatibility. */
export function buildKlookHotelUrl(opts: {
  destination: string;
  hotel?: string;
  travelers?: number;
  month?: string;
  startDate?: string;
  durationDays?: number;
}): string {
  return buildKlookSearchUrl(opts);
}

/** Hotel booking URL. The partner shortlink handles the final Aviasales Hotels redirect. */
export function buildKlookSearchUrl(opts: {
  destination: string;
  hotel?: string;
  travelers?: number;
  month?: string;
  startDate?: string;
  durationDays?: number;
}): string {
  console.log("Aviasales Hotels deeplink:", AVIASALES_HOTELS_AFFILIATE_URL, {
    destination: opts.destination,
    hotel: opts.hotel,
    travelers: opts.travelers,
    month: opts.month,
    startDate: opts.startDate,
    durationDays: opts.durationDays,
  });

  return AVIASALES_HOTELS_AFFILIATE_URL;
}

// ─── Klook (Activities) ──────────────────────────────────────────────────────

/** Direct Klook activities search URL with pre-filled fields. */
export function buildKlookActivitiesUrl(opts: {
  destination: string;
  startDate?: string;
  month?: string;
  durationDays?: number;
}): string {
  const city = extractCityName(opts.destination);
  if (!city) return KLOOK_ACTIVITIES_AFFILIATE_URL;

  // Use city name with "things to do" for better search results
  const queryKeyword = `${city} things to do`;

  const params = new URLSearchParams({
    aid: TRAVELPAYOUTS_TOKEN,
    keyword: queryKeyword,
  });
  const dates = isoDatesFromStartOrMonth(opts.startDate, opts.month, opts.durationDays ?? 7);
  if (dates) {
    params.set("start_time", dates[0]);
    params.set("end_time", dates[1]);
  }
  const finalUrl = `https://www.klook.com/search/result/?${params.toString()}`;

  console.log("deeplink context", {
    provider: "klook_activities",
    destination: city,
    keyword: queryKeyword,
    dates,
    url: finalUrl,
  });

  return finalUrl;
}

/** @deprecated kept for backwards compatibility — now routes through Klook. */
export const buildBookingUrl = buildKlookHotelUrl;

// ─── Kiwitaxi (Transfer) ────────────────────────────────────────────────────

/**
 * Transfer deeplink: Redirect to internal /transfer page with correct search context
 * so user sees the route & date prefilled in the white-label widget or fallback link.
 */
export function buildTransferUrl(opts?: {
  destination?: string;
  origin?: string;
  travelers?: number;
  startDate?: string;
  month?: string;
  durationDays?: number;
}): string {
  if (!opts) return "/transfer";
  const params = new URLSearchParams();
  const from = cleanDestination(opts.origin);
  const to = cleanDestination(opts.destination);
  const pickup = parseStartDate(opts.startDate);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (to.includes(",")) params.set("country", to.split(",").at(-1)?.trim() ?? "");
  if (opts.travelers) params.set("pax", String(Math.max(1, Math.round(opts.travelers))));
  if (pickup) params.set("date", isoDate(pickup));
  const query = params.toString();
  return query ? `/transfer?${query}` : "/transfer";
}
