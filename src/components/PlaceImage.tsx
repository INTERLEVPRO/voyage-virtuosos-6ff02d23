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
      u.includes(".svg")
    );
  };

  for (const p of orderedPages) {
    const src = p?.thumbnail?.source;
    if (src && !isBadImage(src)) return src;
  }
  return null;
}

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