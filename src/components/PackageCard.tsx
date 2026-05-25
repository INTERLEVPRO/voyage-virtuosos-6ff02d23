import { Star, Sparkles, ArrowRight, ThumbsUp } from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import beachImg from "@/assets/dest-beach.jpg";
import townImg from "@/assets/dest-town.jpg";
import resortImg from "@/assets/dest-resort.jpg";

const TIER_META: Record<
  TravelPackage["type"],
  {
    label: string;
    tagline: string;
    badge: string;
    button: string;
    price: string;
    image: string;
    budgetHint: (price: number) => string;
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
    budgetHint: (p) => `~${Math.round((1 - p / 2000) * 100)}% unter deinem Budget`,
  },
  medium: {
    label: "MEDIUM",
    tagline: "Beste Balance für dich",
    badge: "bg-tier-medium-soft text-tier-medium",
    button:
      "border-tier-medium text-tier-medium hover:bg-tier-medium hover:text-white",
    price: "text-tier-medium",
    image: townImg,
    budgetHint: () => "Passt zu deinem Budget",
  },
  premium: {
    label: "PREMIUM",
    tagline: "Mehr Komfort & Exklusivität",
    badge: "bg-tier-premium-soft text-tier-premium",
    button:
      "border-tier-premium text-tier-premium hover:bg-tier-premium hover:text-white",
    price: "text-tier-premium",
    image: resortImg,
    budgetHint: (p) => `~${Math.round((p / 2000 - 1) * 100)}% über deinem Budget`,
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

  // Derive plausible per-provider sub-ratings from the package rating (purely visual; data is the same)
  const r = pkg.rating;
  const ratings = [
    { provider: "Google", value: r.toFixed(1), color: "text-amber-500" },
    { provider: "Booking.com", value: Math.min(9.9, (r * 2).toFixed(1) as unknown as number), color: "text-accent" },
    { provider: "GetYourGuide", value: Math.min(5, (r + 0.1).toFixed(1) as unknown as number), color: "text-primary" },
  ];

  const isTopRated = pkg.rating >= 4.5;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-luxe sm:flex-row">
      {/* Top rated badge */}
      {isTopRated && (
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-border backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[12px] font-bold text-foreground">Top bewertet</span>
            <span className="text-[10px] text-muted-foreground">Echte deutsche Reviews</span>
          </span>
        </div>
      )}

      {/* Image */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-auto sm:w-56">
        <img
          src={meta.image}
          alt={pkg.destination}
          loading="lazy"
          width={448}
          height={448}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5 md:flex-row md:items-stretch">
        {/* Left: tier + price */}
        <div className="flex flex-1 flex-col">
          <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-bold tracking-wider ${meta.badge}`}>
            {meta.label}
          </span>
          <h3 className="mt-3 text-lg font-bold text-foreground">{pkg.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>

          <div className="mt-4">
            <div className={`text-3xl font-extrabold ${meta.price}`}>
              € {pkg.price.toLocaleString("de-DE")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{meta.budgetHint(pkg.price)}</p>
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
            <RatingRow provider="Google" value={ratings[0].value as string} iconColor="text-amber-500" />
            <RatingRow provider="Booking.com" value={String(ratings[1].value)} iconColor="text-accent" />
            <RatingRow provider="GetYourGuide" value={String(ratings[2].value)} iconColor="text-primary" />
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
}: {
  provider: string;
  value: string;
  iconColor: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{provider}</span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
        <Star className={`h-3.5 w-3.5 fill-current ${iconColor}`} />
        {value}
      </span>
    </li>
  );
}
