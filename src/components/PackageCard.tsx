import { Star, Sparkles } from "lucide-react";
import type { TravelPackage } from "@/types/travel";

const TIER_LABEL: Record<TravelPackage["type"], string> = {
  basic: "Basic",
  medium: "Medium",
  premium: "Premium",
};

const TIER_STYLE: Record<TravelPackage["type"], string> = {
  basic: "bg-secondary text-secondary-foreground",
  medium: "bg-primary text-primary-foreground",
  premium: "bg-gradient-gold text-primary",
};

export function PackageCard({
  pkg,
  onSelect,
}: {
  pkg: TravelPackage;
  onSelect: () => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-luxe">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${TIER_STYLE[pkg.type]}`}>
          {TIER_LABEL[pkg.type]}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-foreground">{pkg.matchScore}%</span>
          <span>Match</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl text-primary">{pkg.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{pkg.destination} · {pkg.duration}</p>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1 text-accent">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium text-foreground">{pkg.rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">· {pkg.reviews.toLocaleString("de-DE")} Bewertungen</span>
        </div>

        <p className="mt-4 line-clamp-3 text-sm text-foreground/80">{pkg.summary}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {pkg.badges.slice(0, 4).map((b) => (
            <span key={b} className="rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-xs text-secondary-foreground">
              {b}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-3xl text-primary">
                {pkg.price.toLocaleString("de-DE")} {pkg.currency === "EUR" ? "€" : pkg.currency}
              </div>
              <div className="text-xs text-muted-foreground">pro Person · ca.</div>
            </div>
            <button
              onClick={onSelect}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-105"
            >
              Paket ansehen
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
