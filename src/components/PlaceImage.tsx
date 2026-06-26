import { useEffect, useMemo, useState } from "react";

const imageCache = new Map<string, string>();

type SearchResponse = {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
};

type PageImageResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        thumbnail?: {
          source?: string;
        };
      }
    >;
  };
};

function normalizeQuery(value?: string) {
  return (value ?? "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[|()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWikipediaThumbnail(query: string, width: number) {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.search = new URLSearchParams({
    action: "query",
    list: "search",
    format: "json",
    origin: "*",
    srlimit: "5",
    srsearch: query,
  }).toString();

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) return null;
  const searchData = (await searchRes.json()) as SearchResponse;
  const titles = (searchData.query?.search ?? []).map((s) => s.title).filter(Boolean) as string[];
  if (titles.length === 0) return null;

  const imageUrl = new URL("https://en.wikipedia.org/w/api.php");
  imageUrl.search = new URLSearchParams({
    action: "query",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: String(width),
    format: "json",
    origin: "*",
    titles: titles.join("|"),
  }).toString();

  const imageRes = await fetch(imageUrl.toString());
  if (!imageRes.ok) return null;
  const imageData = (await imageRes.json()) as PageImageResponse;
  const pages = Object.values(imageData.query?.pages ?? {});
  // Preserve search order
  const orderedPages = titles
    .map((t) => pages.find((p: any) => p?.title === t) ?? null)
    .filter(Boolean) as Array<{ thumbnail?: { source?: string } }>;

  const isBadImage = (url: string) => {
    const u = url.toLowerCase();
    return (
      u.includes("flag") ||
      u.includes("coat_of_arms") ||
      u.includes("escudo") ||
      u.includes("escut") ||
      u.includes("wappen") ||
      u.includes("blason") ||
      u.includes("seal_of") ||
      u.includes("logo") ||
      u.includes(".svg") ||
      u.includes("map") ||
      u.includes("locator") ||
      u.includes("dot.png") ||
      u.includes("red_dot")
    );
  };

  for (const p of orderedPages) {
    const src = p?.thumbnail?.source;
    if (src && !isBadImage(src)) return src;
  }
  return null;
}

/**
 * Curated iconic search queries per destination.
 * Keys are lowercase normalized destination names.
 * Each entry is an array of 4 slot-specific query lists [slot0, slot1, slot2, slot3].
 */
const DESTINATION_ICONIC_QUERIES: Record<string, string[][]> = {
  "jaffna, sri lanka": [
    ["Jaffna Fort", "Jaffna Fort Sri Lanka"],
    ["Nallur Kandaswamy temple", "Nallur temple Jaffna"],
    ["Casuarina Beach Jaffna", "Casuarina beach Sri Lanka"],
    ["Nagadeepa island Jaffna", "Nainativu island Sri Lanka"],
  ],
  "jaffna": [
    ["Jaffna Fort", "Jaffna Fort Sri Lanka"],
    ["Nallur Kandaswamy temple", "Nallur temple Jaffna"],
    ["Casuarina Beach Jaffna", "Casuarina beach Sri Lanka"],
    ["Nagadeepa island Jaffna", "Nainativu island Sri Lanka"],
  ],
  "sri lanka": [
    ["Sigiriya Rock Fortress", "Sigiriya Sri Lanka"],
    ["Temple of the Tooth Kandy", "Kandy Sri Lanka temple"],
    ["Nine Arches Bridge Ella", "Ella Sri Lanka train bridge"],
    ["Galle Fort Sri Lanka", "Mirissa beach Sri Lanka"],
  ],
  "deutschland": [
    ["Neuschwanstein Castle", "Bavaria Germany castle"],
    ["Brandenburg Gate Berlin", "Berlin Germany landmark"],
    ["Cologne Cathedral", "Köln Germany"],
    ["Rhine Valley Germany", "Black Forest Germany"],
  ],
  "germany": [
    ["Neuschwanstein Castle", "Bavaria Germany castle"],
    ["Brandenburg Gate Berlin", "Berlin Germany landmark"],
    ["Cologne Cathedral", "Köln Germany"],
    ["Rhine Valley Germany", "Black Forest Germany"],
  ],
  "thailand": [
    ["Wat Pho Bangkok", "Bangkok Thailand temple"],
    ["Maya Bay Koh Phi Phi", "Phi Phi Island Thailand beach"],
    ["Chiang Mai Old City", "Chiang Mai Thailand"],
    ["James Bond Island Khao Phing Kan", "Phang Nga Bay Thailand"],
  ],
  "bali": [
    ["Tanah Lot Bali", "Bali temple ocean"],
    ["Tegallalang Rice Terraces Bali", "Ubud Bali rice fields"],
    ["Uluwatu Temple Bali", "Bali cliff temple"],
    ["Kuta Beach Bali", "Seminyak Beach Bali"],
  ],
  "indonesien": [
    ["Tanah Lot Bali", "Bali Indonesia temple"],
    ["Borobudur Java", "Borobudur Indonesia"],
    ["Komodo Island", "Komodo National Park"],
    ["Raja Ampat Indonesia", "Papua Indonesia sea"],
  ],
  "japan": [
    // Slot 0 — Tokyo skyline / city identity
    ["Tokyo", "Tokyo skyline", "Shinjuku Tokyo night", "Tokyo Tower"],
    // Slot 1 — Fushimi Inari (most iconic Japan image, reliable Wikipedia thumbnail)
    ["Fushimi Inari-taisha", "Fushimi Inari Shrine", "Kyoto shrine", "Japan torii gate"],
    // Slot 2 — Mount Fuji (exact Wikipedia article title gives clean landscape)
    ["Mount Fuji", "Fuji-san Japan", "Arashiyama bamboo grove", "Bamboo forest Japan"],
    // Slot 3 — Osaka/Dotonbori or Nara deer
    ["Dotonbori", "Osaka Japan", "Nara Park deer", "Nara Japan deer"],
  ],
  "griechenland": [
    ["Santorini blue dome church", "Santorini Greece"],
    ["Acropolis Athens", "Athens Greece Parthenon"],
    ["Mykonos windmill", "Mykonos Greece"],
    ["Oia Santorini sunset", "Santorini caldera"],
  ],
  "greece": [
    ["Santorini blue dome church", "Santorini Greece"],
    ["Acropolis Athens", "Athens Greece Parthenon"],
    ["Mykonos windmill", "Mykonos Greece"],
    ["Oia Santorini sunset", "Santorini caldera"],
  ],
  "spanien": [
    ["Sagrada Familia Barcelona", "Barcelona Spain"],
    ["Alhambra Granada Spain", "Granada Spain palace"],
    ["Park Güell Barcelona", "Barcelona Gaudi"],
    ["Ibiza beach Spain", "Costa del Sol Spain"],
  ],
  "spain": [
    ["Sagrada Familia Barcelona", "Barcelona Spain"],
    ["Alhambra Granada Spain", "Granada Spain palace"],
    ["Park Güell Barcelona", "Barcelona Gaudi"],
    ["Ibiza beach Spain", "Costa del Sol Spain"],
  ],
  "marokko": [
    ["Chefchaouen blue city Morocco", "Chefchaouen Morocco"],
    ["Marrakech medina", "Marrakech Morocco souks"],
    ["Sahara Desert Morocco dunes", "Erg Chebbi Morocco"],
    ["Hassan II Mosque Casablanca", "Morocco ocean mosque"],
  ],
  "morocco": [
    ["Chefchaouen blue city Morocco", "Chefchaouen Morocco"],
    ["Marrakech medina", "Marrakech Morocco souks"],
    ["Sahara Desert Morocco dunes", "Erg Chebbi Morocco"],
    ["Hassan II Mosque Casablanca", "Morocco ocean mosque"],
  ],
  "italien": [
    ["Colosseum Rome", "Rome Italy"],
    ["Venice Grand Canal gondola", "Venice Italy"],
    ["Amalfi Coast Italy", "Positano Italy"],
    ["Florence Duomo", "Tuscany Italy hills"],
  ],
  "italy": [
    ["Colosseum Rome", "Rome Italy"],
    ["Venice Grand Canal gondola", "Venice Italy"],
    ["Amalfi Coast Italy", "Positano Italy"],
    ["Florence Duomo", "Tuscany Italy hills"],
  ],
  "indien": [
    ["Taj Mahal Agra India", "Taj Mahal India"],
    ["Jaipur City Palace India", "Rajasthan India"],
    ["Kerala backwaters India", "Kerala India houseboats"],
    ["Varanasi Ganges India", "Varanasi ghats"],
  ],
  "india": [
    ["Taj Mahal Agra India", "Taj Mahal India"],
    ["Jaipur City Palace India", "Rajasthan India"],
    ["Kerala backwaters India", "Kerala India houseboats"],
    ["Varanasi Ganges India", "Varanasi ghats"],
  ],
  "ägypten": [
    ["Great Pyramids of Giza Egypt", "Giza pyramid Egypt"],
    ["Abu Simbel Egypt temple", "Abu Simbel Ramesses"],
    ["Luxor Temple Egypt", "Luxor Karnak"],
    ["Red Sea Egypt coral reef", "Sharm el-Sheikh Egypt beach"],
  ],
  "egypt": [
    ["Great Pyramids of Giza Egypt", "Giza pyramid Egypt"],
    ["Abu Simbel Egypt temple", "Abu Simbel Ramesses"],
    ["Luxor Temple Egypt", "Luxor Karnak"],
    ["Red Sea Egypt coral reef", "Sharm el-Sheikh Egypt beach"],
  ],
  "türkei": [
    ["Cappadocia hot air balloon Turkey", "Cappadocia rock formations"],
    ["Hagia Sophia Istanbul", "Istanbul Turkey Bosphorus"],
    ["Pamukkale thermal pools Turkey", "Pamukkale Turkey"],
    ["Turquoise Coast Turkey Oludeniz", "Antalya Turkey beach"],
  ],
  "turkey": [
    ["Cappadocia hot air balloon Turkey", "Cappadocia rock formations"],
    ["Hagia Sophia Istanbul", "Istanbul Turkey Bosphorus"],
    ["Pamukkale thermal pools Turkey", "Pamukkale Turkey"],
    ["Turquoise Coast Turkey Oludeniz", "Antalya Turkey beach"],
  ],
};

export function buildPackageImageQueries({
  destination,
  hotel,
  title,
  activities,
  itineraryTitles,
}: {
  destination?: string;
  hotel?: string;
  title?: string;
  activities?: string[];
  itineraryTitles?: string[];
}) {
  const dest = normalizeQuery(destination);
  const hotelName = normalizeQuery(hotel);
  const packageTitle = normalizeQuery(title);
  const firstActivity = normalizeQuery(activities?.[0]);
  const secondActivity = normalizeQuery(activities?.[1]);
  const firstStop = normalizeQuery(itineraryTitles?.[0]);
  const secondStop = normalizeQuery(itineraryTitles?.[1]);

  return [
    [hotelName, dest].filter(Boolean).join(" "),
    [firstActivity, dest].filter(Boolean).join(" "),
    [secondActivity, dest].filter(Boolean).join(" "),
    [firstStop, dest].filter(Boolean).join(" "),
    [secondStop, dest].filter(Boolean).join(" "),
    [packageTitle, dest].filter(Boolean).join(" "),
    dest ? `${dest} landmark` : "",
    dest ? `${dest} skyline` : "",
    dest ? `${dest} old town` : "",
    dest ? `${dest} tourism` : "",
    dest,
  ].filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
}

/**
 * Extract the primary place name from an itinerary day title.
 * e.g. "Ankunft Colombo" → "Colombo"
 *      "Sigiriya & Dambulla" → "Sigiriya"
 *      "Nuwara Eliya" → "Nuwara Eliya"
 */
function extractPlaceFromTitle(title: string): string {
  const genericPrefixes =
    /^(tag\s*\d+\s*[-–]?\s*)?(ankunft|abreise|transfer|abflug|rückreise|heimreise|freizeit|orientierung|arrival|departure)\s*/i;
  const cleaned = title.replace(genericPrefixes, "").trim();
  // Take first part before "&", "/", ",", "–", "-" as the primary place
  const primary = cleaned.split(/[&/,–-]/)[0]?.trim() || cleaned;
  return normalizeQuery(primary);
}

/**
 * Build alt text labels for each collage slot based on itinerary place names.
 * Returns 4 strings: [slot0_alt, slot1_alt, slot2_alt, slot3_alt]
 */
export function buildPackageCollageAltTexts(pkg: {
  destination: string;
  hotel: string;
  itinerary?: Array<{ title: string }>;
}): string[] {
  const dest = pkg.destination;
  const places = extractItineraryPlaces(pkg.itinerary ?? []);

  return [
    pkg.hotel ? `${pkg.hotel} – ${dest}` : dest,
    places[0] ? `${places[0]}, ${dest}` : dest,
    places[1] ? `${places[1]}, ${dest}` : dest,
    places[2] ? `${places[2]}, ${dest}` : dest,
  ];
}

/**
 * Extract unique, non-generic place names from itinerary day titles.
 */
function extractItineraryPlaces(itinerary: Array<{ title: string }>): string[] {
  const genericTerms =
    /^(ankunft|abreise|transfer|abflug|rückreise|heimreise|freizeit|orientierung|arrival|departure)$/i;
  const seen = new Set<string>();
  const places: string[] = [];

  for (const day of itinerary) {
    const place = extractPlaceFromTitle(day.title);
    if (place.length > 1 && !genericTerms.test(place) && !seen.has(place.toLowerCase())) {
      seen.add(place.toLowerCase());
      places.push(place);
    }
  }
  return places;
}

export function buildPackageCollageQueries(pkg: {
  destination: string;
  hotel: string;
  activities?: string[];
  itinerary?: Array<{ title: string; description: string }>;
  type?: string;
}): string[][] {
  const dest = normalizeQuery(pkg.destination);
  const destKey = dest.toLowerCase().trim();

  // Check for destination-specific iconic queries first.
  // For Jaffna (with or without country suffix), use dedicated per-tier queries.
  if (destKey === "jaffna, sri lanka" || destKey === "jaffna") {
    const label = "Jaffna Sri Lanka";
    if (pkg.type === "basic") {
      return [
        ["Jaffna Fort", "Jaffna Fort Sri Lanka", label],
        ["Nallur Kandaswamy temple", "Nallur temple Jaffna", label],
        ["Casuarina Beach Jaffna", "Casuarina beach Sri Lanka", label],
        ["Keerimalai Springs Jaffna", "Keerimalai hot springs", label],
      ];
    } else if (pkg.type === "medium") {
      return [
        ["Nagadeepa island Jaffna", "Nainativu island Sri Lanka", label],
        ["Jaffna Public Library", "Jaffna library Sri Lanka", label],
        ["Point Pedro lighthouse", "Point Pedro Jaffna", label],
        ["Delft Island Sri Lanka", "Delft island Jaffna", label],
      ];
    } else {
      return [
        ["Jaffna Fort", "Jaffna Fort Sri Lanka", label],
        ["Nallur Kandaswamy temple", "Nallur temple Jaffna", label],
        ["Nagadeepa island Jaffna", "Nainativu island Sri Lanka", label],
        ["Casuarina Beach Jaffna", "Casuarina beach Sri Lanka", label],
      ];
    }
  }

  if (destKey === "japan" && pkg.type) {
    if (pkg.type === "basic") {
      return [
        ["Tokyo skyline", "Tokyo", dest],
        ["Kyoto temple", "Kiyomizu-dera", dest],
        ["Japanese food", "Sushi Japan", dest],
        ["Dotonbori", "Osaka Japan", dest]
      ];
    } else if (pkg.type === "medium") {
      return [
        ["Mount Fuji", "Fuji-san Japan", dest],
        ["Fushimi Inari-taisha", "Fushimi Inari Shrine", dest],
        ["Arashiyama bamboo grove", "Bamboo forest Japan", dest],
        ["Nara Park deer", "Nara Japan deer", dest]
      ];
    } else {
      // premium
      return [
        ["Shinjuku Tokyo night", "Tokyo Tower", dest],
        ["Kinkaku-ji", "Kyoto temple", dest],
        ["Ryokan (inn)", "Japan traditional inn", dest],
        ["Mount Fuji", "Fuji-san Japan", dest]
      ];
    }
  }

  const iconic = DESTINATION_ICONIC_QUERIES[destKey];
  if (iconic && iconic.length >= 4) {
    // Slot 0 = iconic[0] (e.g. Sigiriya), Slot 1-3 = iconic[1-3]
    return iconic.map((slotQueries) => [...slotQueries, dest]);
  }

  // 1. Hotel name — first segment before delimiters
  const rawHotel = pkg.hotel || "";
  const hotelSegment = normalizeQuery(rawHotel.split(/[·\-|]/)[0]?.trim() || rawHotel);
  const hotelQueries = [
    `${hotelSegment} ${dest}`,
    hotelSegment,
    `${dest} hotel`,
  ].filter(Boolean);

  // 2. Primary: use specific place names from itinerary day titles
  //    e.g. "Sigiriya", "Kandy", "Ella", "Tangalle", "Galle"
  const itineraryPlaces = extractItineraryPlaces(pkg.itinerary ?? []);

  // 3. Secondary fallback: non-generic activity keywords
  const genericTerms =
    /Ankunft|Orientierung|Freizeit|Transfer|Rückreise|Heimreise|Abreise|Zuhause|Flug|Flughafen/i;
  const activityFallbacks: string[] = [];
  if (pkg.activities) {
    for (const act of pkg.activities) {
      if (act && !genericTerms.test(act)) {
        activityFallbacks.push(normalizeQuery(act));
      }
    }
  }

  // Merge: prefer itinerary places, top up with activity keywords
  const candidates = [
    ...itineraryPlaces,
    ...activityFallbacks.filter((a) => !itineraryPlaces.includes(a)),
  ];

  const queryGroups: string[][] = [];

  // Slot 0 — Hotel image
  queryGroups.push(hotelQueries);

  // Slot 1 — First named place
  const p0 = candidates[0];
  queryGroups.push(
    p0
      ? [`${p0} ${dest}`, p0, `${dest} landmark`, dest]
      : [`${dest} landmark`, `${dest} sightseeing`, dest],
  );

  // Slot 2 — Second named place
  const p1 = candidates[1];
  queryGroups.push(
    p1
      ? [`${p1} ${dest}`, p1, `${dest} skyline`, dest]
      : [`${dest} skyline`, `${dest} tourism`, dest],
  );

  // Slot 3 — Third named place
  const p2 = candidates[2];
  queryGroups.push(
    p2
      ? [`${p2} ${dest}`, p2, `${dest} beach`, dest]
      : [`${dest} nature`, `${dest} beach`, dest],
  );

  return queryGroups;
}

export function PlaceImage({
  alt,
  className,
  fallbackSrc,
  queryCandidates,
  width,
  height,
}: {
  alt: string;
  className?: string;
  fallbackSrc: string;
  queryCandidates: string[];
  width: number;
  height: number;
}) {
  const normalizedQueries = useMemo(
    () => queryCandidates.map((item) => normalizeQuery(item)).filter(Boolean),
    [queryCandidates],
  );
  const cacheKey = useMemo(() => `${width}:${normalizedQueries.join("|")}`, [normalizedQueries, width]);
  const [src, setSrc] = useState(() => imageCache.get(cacheKey) ?? fallbackSrc);

  useEffect(() => {
    let cancelled = false;
    setSrc(imageCache.get(cacheKey) ?? fallbackSrc);

    async function resolveImage() {
      if (imageCache.has(cacheKey)) return;
      for (const query of normalizedQueries) {
        try {
          const resolved = await fetchWikipediaThumbnail(query, width);
          if (!resolved) continue;
          imageCache.set(cacheKey, resolved);
          if (!cancelled) setSrc(resolved);
          return;
        } catch {
          // try next candidate
        }
      }
      if (!cancelled) setSrc(fallbackSrc);
    }

    void resolveImage();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, fallbackSrc, normalizedQueries, width]);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src !== fallbackSrc) {
          img.src = fallbackSrc;
          setSrc(fallbackSrc);
        }
      }}
      className={className}
    />
  );
}