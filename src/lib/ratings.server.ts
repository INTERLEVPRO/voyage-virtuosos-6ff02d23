import Firecrawl from "@mendable/firecrawl-js";
import type { PackageRating } from "@/types/travel";

// Extracts ratings like "4.5/5", "8.7 / 10", "4,2 von 5", "Rated 4.3", "4.3 stars"
function extractRating(text: string): { value: number; scale: number } | null {
  if (!text) return null;
  const norm = text.replace(/,/g, ".");

  const patterns: Array<{ re: RegExp; scaleFromMatch?: (m: RegExpMatchArray) => number; defaultScale?: number }> = [
    { re: /(\d(?:\.\d)?)\s*\/\s*(5|10)\b/, scaleFromMatch: (m) => Number(m[2]) },
    { re: /(\d(?:\.\d)?)\s*(?:von|out of|aus)\s*(5|10)\b/i, scaleFromMatch: (m) => Number(m[2]) },
    { re: /\b(\d\.\d)\s*(?:stars?|sterne?)\b/i, defaultScale: 5 },
    { re: /\brated\s+(\d(?:\.\d)?)\b/i, defaultScale: 5 },
    { re: /\bscore[:\s]+(\d(?:\.\d)?)\b/i, defaultScale: 10 },
    { re: /\b(\d\.\d)\s*\/\s*5\b/, defaultScale: 5 },
  ];

  for (const p of patterns) {
    const m = norm.match(p.re);
    if (!m) continue;
    const v = Number(m[1]);
    const s = p.scaleFromMatch ? p.scaleFromMatch(m) : (p.defaultScale ?? 5);
    if (v > 0 && v <= s) return { value: v, scale: s };
  }
  return null;
}

function sourceFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const map: Record<string, string> = {
      "tripadvisor.com": "Tripadvisor",
      "tripadvisor.de": "Tripadvisor",
      "booking.com": "Booking.com",
      "holidaycheck.de": "HolidayCheck",
      "holidaycheck.ch": "HolidayCheck",
      "trivago.de": "Trivago",
      "trivago.com": "Trivago",
      "google.com": "Google Reviews",
      "expedia.de": "Expedia",
      "expedia.com": "Expedia",
      "hotels.com": "Hotels.com",
      "agoda.com": "Agoda",
      "kayak.de": "Kayak",
      "kayak.com": "Kayak",
      "tui.com": "TUI",
      "check24.de": "Check24",
      "ab-in-den-urlaub.de": "Ab-in-den-Urlaub",
      "usnews.com": "U.S. News Travel",
    };
    for (const key of Object.keys(map)) {
      if (host.endsWith(key)) return map[key];
    }
    return host;
  } catch {
    return "Web";
  }
}

type SearchResult = { url?: string; title?: string; description?: string };

const TARGET_SITES = [
  "tripadvisor.com",
  "booking.com",
  "holidaycheck.de",
  "google.com/travel",
  "trivago.de",
  "expedia.de",
  "hotels.com",
];

export async function fetchPackageRatings(params: {
  hotel: string;
  destination: string;
  limit?: number;
}): Promise<PackageRating[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const firecrawl = new Firecrawl({ apiKey });
  const limit = params.limit ?? 8;

  // Run multiple targeted queries in parallel — one per source — for broader coverage.
  const queries = [
    `${params.hotel} ${params.destination} review rating`,
    ...TARGET_SITES.map((s) => `${params.hotel} ${params.destination} site:${s}`),
  ];

  try {
    const responses = await Promise.all(
      queries.map((q) =>
        firecrawl
          .search(q, { limit: 5 })
          .catch((e) => {
            console.error("Firecrawl search failed for", q, e);
            return null;
          }),
      ),
    );

    const ratings: PackageRating[] = [];
    const seenUrls = new Set<string>();
    const sourceCount = new Map<string, number>();

    for (const res of responses) {
      if (!res) continue;
      const items: SearchResult[] = Array.isArray(res)
        ? res
        : (res as { web?: SearchResult[]; data?: SearchResult[] }).web ??
          (res as { web?: SearchResult[]; data?: SearchResult[] }).data ??
          [];

      for (const item of items) {
        if (!item?.url) continue;
        if (seenUrls.has(item.url)) continue;
        const text = `${item.title ?? ""} ${item.description ?? ""}`;
        const extracted = extractRating(text);
        if (!extracted) continue;
        const source = sourceFromUrl(item.url);
        // allow up to 2 entries per source (different hotels / pages)
        const count = sourceCount.get(source) ?? 0;
        if (count >= 2) continue;
        seenUrls.add(item.url);
        sourceCount.set(source, count + 1);
        ratings.push({
          source,
          value: extracted.value,
          scale: extracted.scale,
          url: item.url,
        });
        if (ratings.length >= limit) break;
      }
      if (ratings.length >= limit) break;
    }

    return ratings;
  } catch (err) {
    console.error("Firecrawl rating fetch failed:", err);
    return [];
  }
}
