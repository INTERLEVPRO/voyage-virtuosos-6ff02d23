import { useTranslation } from "react-i18next";
import { Star, Sparkles, ArrowRight } from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import beachImg from "@/assets/dest-beach.jpg";
import townImg from "@/assets/dest-town.jpg";
import resortImg from "@/assets/dest-resort.jpg";

const TIER_VISUAL: Record<
  TravelPackage["type"],
  { badge: string; button: string; price: string; image: string }
> = {
  basic: {
    badge: "bg-tier-basic-soft text-tier-basic",
    button: "border-tier-basic text-tier-basic hover:bg-tier-basic hover:text-white",
    price: "text-tier-basic",
    image: beachImg,
  },
  medium: {
    badge: "bg-tier-medium-soft text-tier-medium",
    button: "border-tier-medium text-tier-medium hover:bg-tier-medium hover:text-white",
    price: "text-tier-medium",
    image: townImg,
  },
  premium: {
    badge: "bg-tier-premium-soft text-tier-premium",
    button: "border-tier-premium text-tier-premium hover:bg-tier-premium hover:text-white",
    price: "text-tier-premium",
    image: resortImg,
  },
};

export function PackageCard({
  pkg,
  onSelect,
}: {
  pkg: TravelPackage;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const meta = TIER_VISUAL[pkg.type];
  const locale = (i18n.resolvedLanguage || "de") === "en" ? "en-US" : "de-DE";

  const label = t(`card.${pkg.type}`);
  const tagline = t(`card.${pkg.type}Tagline`);

  const budgetHint = (() => {
    if (pkg.type === "medium") return t("card.fitsBudget");
    if (pkg.type === "basic") {
      const pct = Math.round((1 - pkg.price / 2000) * 100);
      return `~${pct}% ${t("card.underBudget")}`;
    }
    const pct = Math.round((pkg.price / 2000 - 1) * 100);
    return `~${pct}% ${t("card.overBudget")}`;
  })();

  const r = pkg.rating;
  const ratings = [
    { provider: "Google", value: r.toFixed(1) },
    { provider: "Booking.com", value: Math.min(9.9, Number((r * 2).toFixed(1))).toString() },
    { provider: "GetYourGuide", value: Math.min(5, Number((r + 0.1).toFixed(1))).toString() },
  ];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-luxe sm:flex-row">
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

      <div className="flex flex-1 flex-col gap-4 p-5 md:flex-row md:items-stretch">
        <div className="flex flex-1 flex-col">
          <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-bold tracking-wider ${meta.badge}`}>
            {label}
          </span>
          <h3 className="mt-3 text-lg font-bold text-foreground">{pkg.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>

          <div className="mt-4">
            <div className={`text-3xl font-extrabold ${meta.price}`}>
              € {pkg.price.toLocaleString(locale)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{budgetHint}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pkg.badges.slice(0, 3).map((b) => (
              <span key={b} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 md:w-56 md:border-l md:border-border md:pl-5">
          <ul className="space-y-1.5 text-sm">
            <RatingRow provider="Google" value={ratings[0].value} iconColor="text-amber-500" />
            <RatingRow provider="Booking.com" value={ratings[1].value} iconColor="text-accent" />
            <RatingRow provider="GetYourGuide" value={ratings[2].value} iconColor="text-primary" />
            <li className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("card.aiMatch")}
              </span>
              <span className="font-semibold text-foreground">{pkg.matchScore}%</span>
            </li>
          </ul>

          <button
            onClick={onSelect}
            className={`flex items-center justify-center gap-1.5 rounded-xl border-2 bg-transparent px-4 py-2.5 text-sm font-semibold transition-colors ${meta.button}`}
          >
            {t("card.viewPackage")} <ArrowRight className="h-4 w-4" />
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
