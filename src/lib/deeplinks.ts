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

function yymmdd(d: Date) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
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
  return [yymmdd(dep), yymmdd(ret)];
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

/** Direct Aviasales search URL with pre-filled fields (IATA-based). */
export function buildAviasalesSearchUrl(opts: {
  destination: string;
  origin?: string;
  travelers?: number;
  month?: string;
  durationDays?: number;
}): string {
  const adults = Math.max(1, opts.travelers ?? 1);
  const originIata = lookupOriginIata(opts.origin);
  const destIata = lookupDestIata(opts.destination);
  const dates = travelDatesFromMonth(opts.month, opts.durationDays ?? 7);
  if (originIata && destIata && dates) {
    // Aviasales search URL pattern: /search/{ORIG}{DEPYYMMDD}{DEST}{RETYYMMDD}{ADULTS}
    return `https://www.aviasales.com/search/${originIata}${dates[0]}${destIata}${dates[1]}${adults}?marker=travelpayouts`;
  }
  if (originIata && destIata) {
    return `https://www.aviasales.com/search/${originIata}0000${destIata}00001?marker=travelpayouts`;
  }
  return `https://www.aviasales.com/search?destination=${encodeURIComponent(opts.destination)}&adults=${adults}&marker=travelpayouts`;
}

/** Travelpayouts API token (public affiliate marker). */
export const TRAVELPAYOUTS_TOKEN = "bdf35dd22b712ff287b1a4eecb16882f";

/** Klook affiliate deeplink (tracked redirect). */
export const KLOOK_ACTIVITIES_AFFILIATE_URL = "https://klook.tpm.li/WzC9L2in/";

/** KiwiTaxi affiliate deeplink (tracked redirect). */
export const KIWI_TAXI_AFFILIATE_URL = "https://kiwitaxi.tpm.li/RgYDJiUT";

/**
 * Hotel deeplink — uses the Klook affiliate redirect.
 * Klook's tpm.li shortlink doesn't forward query params, but we still build
 * a fully-parameterised Klook search URL as a fallback / for reference.
 */
export function buildKlookHotelUrl(_opts: {
  destination: string;
  hotel?: string;
  travelers?: number;
  month?: string;
  durationDays?: number;
}): string {
  // Always use the tracked affiliate shortlink to guarantee commission tracking.
  // Parameterised search URLs strip the affiliate marker on some redirects.
  return KLOOK_ACTIVITIES_AFFILIATE_URL;
}

/** Direct Klook hotel search URL with pre-filled fields. */
export function buildKlookSearchUrl(opts: {
  destination: string;
  hotel?: string;
  travelers?: number;
  month?: string;
  durationDays?: number;
}): string {
  const params = new URLSearchParams({
    room_num: "1",
    adult_num: String(Math.max(1, opts.travelers ?? 2)),
    child_num: "0",
    age: "",
  });
  const dates = isoDatesFromMonth(opts.month, opts.durationDays ?? 7);
  if (dates) {
    params.set("check_in", dates[0]);
    params.set("check_out", dates[1]);
  }
  const keyword = [opts.hotel, opts.destination].filter(Boolean).join(" ").trim();
  if (keyword) params.set("keyword", keyword);
  return `https://www.klook.com/hotels/searchresult/?${params.toString()}`;
}

/** @deprecated kept for backwards compatibility — now routes through Klook. */
export const buildBookingUrl = buildKlookHotelUrl;

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
