// Deep-link helpers (client + server safe — pure functions).

const ORIGIN_IATA: Record<string, string> = {
  münchen: "MUC", muenchen: "MUC", munich: "MUC",
  berlin: "BER",
  hamburg: "HAM",
  frankfurt: "FRA",
  köln: "CGN", koeln: "CGN", cologne: "CGN",
  stuttgart: "STR",
  düsseldorf: "DUS", duesseldorf: "DUS",
  wien: "VIE", vienna: "VIE",
  zürich: "ZRH", zuerich: "ZRH", zurich: "ZRH",
  basel: "BSL",
  genf: "GVA", geneva: "GVA",
  hannover: "HAJ", hanover: "HAJ",
  nürnberg: "NUE", nuernberg: "NUE", nuremberg: "NUE",
  leipzig: "LEJ",
  dresden: "DRS",
  bremen: "BRE",
  dortmund: "DTM",
};

const DEST_IATA: Record<string, string> = {
  lissabon: "LIS", lisbon: "LIS", lisboa: "LIS",
  porto: "OPO",
  mallorca: "PMI", "palma de mallorca": "PMI", palma: "PMI",
  ibiza: "IBZ",
  teneriffa: "TFS", tenerife: "TFS",
  gran: "LPA", "gran canaria": "LPA",
  fuerteventura: "FUE",
  lanzarote: "ACE",
  madeira: "FNC", funchal: "FNC",
  paris: "CDG",
  london: "LHR",
  rom: "FCO", rome: "FCO", roma: "FCO",
  mailand: "MXP", milan: "MXP", milano: "MXP",
  barcelona: "BCN",
  madrid: "MAD",
  amsterdam: "AMS",
  prag: "PRG", prague: "PRG",
  budapest: "BUD",
  wien: "VIE",
  athen: "ATH", athens: "ATH",
  kreta: "HER", crete: "HER", heraklion: "HER",
  rhodos: "RHO", rhodes: "RHO",
  santorin: "JTR", santorini: "JTR",
  malta: "MLA",
  zypern: "LCA", cyprus: "LCA",
  istanbul: "IST",
  antalya: "AYT",
  bali: "DPS", denpasar: "DPS",
  bangkok: "BKK",
  dubai: "DXB",
  "new york": "JFK", newyork: "JFK", nyc: "JFK",
  tokio: "HND", tokyo: "HND",
  marrakesch: "RAK", marrakech: "RAK",
  kopenhagen: "CPH", copenhagen: "CPH",
  stockholm: "ARN",
  oslo: "OSL",
  reykjavik: "KEF",
};

const MONTHS: Record<string, number> = {
  januar: 1, january: 1, jan: 1,
  februar: 2, february: 2, feb: 2,
  märz: 3, maerz: 3, march: 3, mar: 3, mär: 3,
  april: 4, apr: 4,
  mai: 5, may: 5,
  juni: 6, june: 6, jun: 6,
  juli: 7, july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, october: 10, oct: 10, okt: 10,
  november: 11, nov: 11,
  dezember: 12, december: 12, dec: 12, dez: 12,
};

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function lookupOriginIata(city?: string): string | null {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return ORIGIN_IATA[key] ?? null;
}

export function lookupDestIata(dest?: string): string | null {
  if (!dest) return null;
  const key = dest.toLowerCase().trim();
  if (DEST_IATA[key]) return DEST_IATA[key];
  // try first word
  const first = key.split(/[\s,]+/)[0];
  return DEST_IATA[first] ?? null;
}

function ddmmyy(d: Date) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}${mm}${yy}`;
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

/** Aviasales (Travelpayouts) affiliate deeplink — tracked redirect. */
export const AVIASALES_AFFILIATE_URL = "https://aviasales.tpm.li/o8SBry1n";

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

/** Parse a user-provided start date ("10. Juni 2026", "10.06.2026", "2026-06-10") to a Date. */
export function parseStartDate(input?: string): Date | null {
  if (!input) return null;
  const s = input.trim();
  // ISO YYYY-MM-DD
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (m) {
    const yr = Number(m[3]);
    return new Date(yr < 100 ? 2000 + yr : yr, Number(m[2]) - 1, Number(m[1]));
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

/**
 * Direct Aviasales search URL with pre-filled fields.
 *
 * Aviasales' query-param format (origin_iata=…&destination_iata=…) does NOT
 * reliably pre-fill the search widget — the homepage shows the user's geo
 * default ("Colombo") and empty To/dates. The path-based "compact" search
 * URL (`/search/{ORIG}{DDMM}{DEST}{DDMM}{ADULTS}`) is the canonical link
 * that triggers an actual search and shows results immediately.
 *
 * If we don't have enough data (origin + destination IATA + dates) we fall
 * back to the tracked affiliate shortlink so commission is never lost.
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
  const originIata = lookupOriginIata(opts.origin);
  const destIata = lookupDestIata(opts.destination);
  const duration = Math.max(1, opts.durationDays ?? 7);

  let dep: Date | null = parseStartDate(opts.startDate);
  if (!dep && opts.month) {
    const m = MONTHS[opts.month.toLowerCase().trim()];
    if (m) {
      const now = new Date();
      let year = now.getFullYear();
      if (m < now.getMonth() + 1) year += 1;
      dep = new Date(year, m - 1, 15);
    }
  }

  // Path-based search format auto-runs the query and pre-fills the form.
  if (originIata && destIata && dep) {
    const ret = new Date(dep);
    ret.setDate(ret.getDate() + duration);
    const code = `${originIata}${ddmm(dep)}${destIata}${ddmm(ret)}${adults}`;
    const params = new URLSearchParams({
      marker: "travelpayouts",
      currency: "eur",
    });
    return `https://www.aviasales.com/search/${code}?${params.toString()}`;
  }

  // Not enough data to deep-link — use tracked affiliate shortlink.
  return AVIASALES_AFFILIATE_URL;
}

function ddmm(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Travelpayouts API token (public affiliate marker). */
export const TRAVELPAYOUTS_TOKEN = "bdf35dd22b712ff287b1a4eecb16882f";

/** Klook affiliate deeplink (tracked redirect). */
export const KLOOK_ACTIVITIES_AFFILIATE_URL = "https://klook.tpm.li/WzC9L2in/";

/** KiwiTaxi affiliate deeplink (tracked redirect). */
export const KIWI_TAXI_AFFILIATE_URL = "https://kiwitaxi.tpm.li/RgYDJiUT";

/** Hotel deeplink — fully pre-filled Klook search URL with affiliate marker. */
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

/** Sanity-check a destination string before sending it to Klook as a keyword. */
function cleanDestination(input?: string): string {
  const s = (input || "").trim().replace(/^[-–—\s]+|[-–—\s]+$/g, "");
  if (s.length < 2) return "";
  return s;
}

/** Direct Klook hotel search URL with pre-filled fields (incl. affiliate marker). */
export function buildKlookSearchUrl(opts: {
  destination: string;
  hotel?: string;
  travelers?: number;
  month?: string;
  startDate?: string;
  durationDays?: number;
}): string {
  const keyword = cleanDestination(opts.destination);
  // No usable destination → fall back to tracked affiliate link instead of
  // sending the user to a broken/empty Klook search.
  if (!keyword) return KLOOK_ACTIVITIES_AFFILIATE_URL;

  const params = new URLSearchParams({
    room_num: "1",
    adult_num: String(Math.max(1, opts.travelers ?? 2)),
    child_num: "0",
    aid: TRAVELPAYOUTS_TOKEN,
    keyword,
  });
  const dates = isoDatesFromStartOrMonth(opts.startDate, opts.month, opts.durationDays ?? 7);
  if (dates) {
    params.set("check_in", dates[0]);
    params.set("check_out", dates[1]);
  }
  return `https://www.klook.com/hotels/searchresult/?${params.toString()}`;
}

/** Direct Klook activities search URL with pre-filled fields. */
export function buildKlookActivitiesUrl(opts: {
  destination: string;
  startDate?: string;
  month?: string;
  durationDays?: number;
}): string {
  const keyword = cleanDestination(opts.destination);
  if (!keyword) return KLOOK_ACTIVITIES_AFFILIATE_URL;
  const params = new URLSearchParams({
    aid: TRAVELPAYOUTS_TOKEN,
    keyword,
  });
  const dates = isoDatesFromStartOrMonth(opts.startDate, opts.month, opts.durationDays ?? 7);
  if (dates) {
    params.set("start_time", dates[0]);
    params.set("end_time", dates[1]);
  }
  return `https://www.klook.com/search/result/?${params.toString()}`;
}

/** @deprecated kept for backwards compatibility — now routes through Klook. */
export const buildBookingUrl = buildKlookHotelUrl;

/**
 * Transfer deeplink — opens the in-app Kiwitaxi White Label widget page
 * (`/transfer`) with pickup/dropoff prefilled. The widget itself carries the
 * Travelpayouts partner marker (pap=728432) for commission tracking, so the
 * user can complete the booking + payment directly on Kiwitaxi.
 *
 * If we can't resolve any usable location hint, we fall back to the tracked
 * tpm.li affiliate shortlink so commission is never lost.
 */
export function buildTransferUrl(opts?: {
  destination?: string;
  origin?: string;
  travelers?: number;
  startDate?: string;
  month?: string;
  durationDays?: number;
}): string {
  if (!opts) return KIWI_TAXI_AFFILIATE_URL;

  // The widget accepts IATA codes or English/native place names for place_from/place_to.
  const fromIata = lookupOriginIata(opts.origin);
  const destIata = lookupDestIata(opts.destination);
  const placeFrom = fromIata || opts.origin?.trim() || "";
  // Prefer destination IATA (airport) since transfers usually start at the arrival airport.
  const placeTo = destIata || opts.destination?.trim() || "";

  if (!placeFrom && !placeTo) return KIWI_TAXI_AFFILIATE_URL;

  const params = new URLSearchParams();
  // For airport transfers: pickup = arrival airport (destination), dropoff = hotel/city area.
  if (placeTo) params.set("from", placeTo);
  if (opts.destination) params.set("to", opts.destination.trim());
  if (opts.travelers) params.set("pax", String(opts.travelers));
  if (opts.startDate) params.set("date", opts.startDate);
  return `/transfer?${params.toString()}`;
}


function isoDatesFromStartOrMonth(startDate?: string, month?: string, durationDays = 7): [string, string] | null {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parsed = parseStartDate(startDate);
  if (parsed) {
    const ret = new Date(parsed);
    ret.setDate(ret.getDate() + Math.max(1, durationDays));
    return [iso(parsed), iso(ret)];
  }
  return isoDatesFromMonth(month, durationDays);
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
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [iso(dep), iso(ret)];
}
