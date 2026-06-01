import Firecrawl from "@mendable/firecrawl-js";
import type { PackageRating } from "@/types/travel";

// Extracts ratings like "4.5/5", "8.7 / 10", "4,2 von 5", "Rated 4.3"
function extractRating(text: string): { value: number; scale: number } | null {
  if (!text) return null;
  const norm = text.replace(/,/g, ".");

  const m1 = norm.match(/(\d(?:\.\d)?)\s*\/\s*(5|10)\b/);
  if (m1) {
    const v = Number(m1[1]);
    const s = Number(m1[2]);
    if (v > 0 && v <= s) return { value: v, scale: s };
  }
  const m2 = norm.match(/(\d(?:\.\d)?)\s*(?:von|out of|aus)\s*(5|10)\b/i);
  if (m2) {
    const v = Number(m2[1]);
    const s = Number(m2[2]);
    if (v > 0 && v <= s) return { value: v, scale: s };
  }
  const m3 = norm.match(/\b(\d\.\d)\s*(?:stars?|sterne?)\b/i);
  if (m3) {
    const v = Number(m3[1]);
    if (v > 0 && v <= 5) return { value: v, scale: 5 };
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
      "trivago.de": "Trivago",
      "trivago.com": "Trivago",
      "google.com": "Google Reviews",
      "expedia.de": "Expedia",
      "expedia.com": "Expedia",
      "hotels.com": "Hotels.com",
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

export async function fetchPackageRatings(params: {
  hotel: string;
  destination: string;
  limit?: number;
}): Promise<PackageRating[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const firecrawl = new Firecrawl({ apiKey });
  const query = `${params.hotel} ${params.destination} bewertung review rating`;

  try {
    const res = (await firecrawl.search(query, { limit: 8 })) as
      | { web?: SearchResult[]; data?: SearchResult[] }
      | SearchResult[];

    const items: SearchResult[] = Array.isArray(res)
      ? res
      : res.web ?? res.data ?? [];

    const ratings: PackageRating[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (!item?.url) continue;
      const text = `${item.title ?? ""} ${item.description ?? ""}`;
      const extracted = extractRating(text);
      if (!extracted) continue;
      const source = sourceFromUrl(item.url);
      if (seen.has(source)) continue;
      seen.add(source);
      ratings.push({
        source,
        value: extracted.value,
        scale: extracted.scale,
        url: item.url,
      });
      if (ratings.length >= (params.limit ?? 4)) break;
    }

    return ratings;
  } catch (err) {
    console.error("Firecrawl rating fetch failed:", err);
    return [];
  }
}
