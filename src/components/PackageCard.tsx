import { Star, Sparkles, ArrowRight, ThumbsUp, ExternalLink } from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import beachImg from "@/assets/dest-beach.jpg";
import townImg from "@/assets/dest-town.jpg";
import resortImg from "@/assets/dest-resort.jpg";
import { PlaceImage, buildPackageCollageQueries } from "./PlaceImage";

const TIER_META: Record<
  TravelPackage["type"],
  {
    label: string;
    tagline: string;
    badge: string;
    button: string;
    price: string;
    image: string;
    budgetHint: (price: number, requestedBudget?: number) => string;
  }
> = {
  basic: {
    label: "BASIC",
    tagline: "Bestes Preis-Leistungs-Verhältnis",
    badge: "bg-tier-basic-soft text-tier-basic",
    button:
      "border-tier-basic text-tier-basic hover:bg-tier-basic hover:text-white",
    price: "text-tier-basic",
    image: beachImg,
    budgetHint: (price, requestedBudget) => {
      if (!requestedBudget || requestedBudget <= 0) return "Budgetfreundliche Auswahl";
      const diff = Math.max(0, Math.round(((requestedBudget - price) / requestedBudget) * 100));
      return `~${diff}% unter deinem Budget`;
    },
  },
  medium: {
    label: "MEDIUM",
    tagline: "Beste Balance für dich",
    badge: "bg-tier-medium-soft text-tier-medium",
    button:
      "border-tier-medium text-tier-medium hover:bg-tier-medium hover:text-white",
    price: "text-tier-medium",
    image: townImg,
    budgetHint: (price, requestedBudget) => {
      if (!requestedBudget || requestedBudget <= 0) return "Passt zu deinem Budget";
      const delta = Math.abs(price - requestedBudget);
      const percent = Math.round((delta / requestedBudget) * 100);
      return percent <= 5 ? "Passt zu deinem Budget" : price < requestedBudget ? `~${percent}% unter deinem Budget` : `~${percent}% über deinem Budget`;
    },
  },
  premium: {
    label: "PREMIUM",
    tagline: "Mehr Komfort & Exklusivität",
    badge: "bg-tier-premium-soft text-tier-premium",
    button:
      "border-tier-premium text-tier-premium hover:bg-tier-premium hover:text-white",
    price: "text-tier-premium",
    image: resortImg,
    budgetHint: (price, requestedBudget) => {
      if (!requestedBudget || requestedBudget <= 0) return "Mehr Komfort & Exklusivität";
      const diff = Math.max(0, Math.round(((price - requestedBudget) / requestedBudget) * 100));
      return `~${diff}% über deinem Budget`;
    },
  },
};

export function PackageCard({
  pkg,
  onSelect,
}: {
  pkg: TravelPackage;
  onSelect: () => void;
}) {
  const meta = TIER_META[pkg.type];
  const collageQueries = buildPackageCollageQueries(pkg);

  // Echte Ratings + Quell-Link sind Pflicht. Ohne Link wird nichts angezeigt.
  // Keine Limitierung auf 3 Quellen — alles vom Backend Gelieferte wird gerendert.
  const ratings = (pkg.ratings ?? [])
    .filter((rt) => !!rt && typeof rt.url === "string" && rt.url.trim().length > 0)
    .map((rt, i) => {
      const palette = ["text-emerald-600", "text-accent", "text-primary", "text-tier-premium", "text-tier-medium"];
      const num = typeof rt.value === "number" ? rt.value : Number(rt.value);
      const value = Number.isFinite(num)
        ? (rt.scale === 10 ? num.toFixed(1) : num.toFixed(1))
        : String(rt.value);
      return {
        provider: rt.source,
        value,
        iconColor: palette[i % palette.length],
        url: rt.url,
      };
    });

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-luxe sm:flex-row">

      {/* Image Collage */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-auto sm:w-56 grid grid-cols-2 grid-rows-2 gap-0.5 bg-border group">
        <PlaceImage
          fallbackSrc={meta.image}
          queryCandidates={collageQueries[0]}
          alt={pkg.hotel || pkg.destination}
          width={224}
          height={224}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <PlaceImage
          fallbackSrc={meta.image}
          queryCandidates={collageQueries[1]}
          alt="Activity 1"
          width={224}
          height={224}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <PlaceImage
          fallbackSrc={meta.image}
          queryCandidates={collageQueries[2]}
          alt="Activity 2"
          width={224}
          height={224}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <PlaceImage
          fallbackSrc={meta.image}
          queryCandidates={collageQueries[3]}
          alt="Activity 3"
          width={224}
          height={224}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        <span className={`absolute left-3 top-3 inline-flex rounded-md px-2.5 py-1 text-xs font-bold tracking-wider shadow-sm sm:hidden z-10 ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:gap-4 sm:p-5 md:flex-row md:items-stretch">
        {/* Left: tier + price */}
        <div className="flex flex-1 flex-col">
          <span className={`hidden w-fit rounded-md px-2.5 py-1 text-xs font-bold tracking-wider sm:inline-flex ${meta.badge}`}>
            {meta.label}
          </span>
          <h3 className="mt-1 text-lg font-bold text-foreground sm:mt-3">{pkg.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>

          <div className="mt-4">
            <div className={`text-3xl font-extrabold ${meta.price}`}>
              € {pkg.price.toLocaleString("de-DE")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{meta.budgetHint(pkg.price, pkg.requestedBudget)}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pkg.badges.slice(0, 3).map((b) => (
              <span key={b} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Right: rating breakdown + CTA */}
        <div className="flex flex-col justify-between gap-4 md:w-56 md:border-l md:border-border md:pl-5">
          <ul className="space-y-1.5 text-sm">
            {ratings.length === 0 ? (
              <li className="text-xs italic text-muted-foreground">
                Keine verifizierten Bewertungen mit Quell-Link verfügbar.
              </li>
            ) : (
              ratings.map((rt) => (
                <RatingRow key={`${rt.provider}-${rt.url}`} provider={rt.provider} value={rt.value} iconColor={rt.iconColor} url={rt.url} />
              ))
            )}
            <li className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI-Match
              </span>
              <span className="font-semibold text-foreground">{pkg.matchScore}%</span>
            </li>
          </ul>

          <button
            onClick={onSelect}
            className={`flex items-center justify-center gap-1.5 rounded-xl border-2 bg-transparent px-4 py-2.5 text-sm font-semibold transition-colors ${meta.button}`}
          >
            Paket ansehen <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function RatingRow({
  provider,
  value,
  iconColor,
  url,
}: {
  provider: string;
  value: string;
  iconColor: string;
  url?: string;
}) {
  if (!url) return null;
  return (
    <li className="flex items-center justify-between">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
      >
        {provider}
        <ExternalLink className="h-3 w-3 opacity-60" />
      </a>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
        <Star className={`h-3.5 w-3.5 fill-current ${iconColor}`} />
        {value}
      </span>
    </li>
  );
}
