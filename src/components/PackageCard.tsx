import { Sparkles, ArrowRight, ExternalLink } from "lucide-react";
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

  // Real reference links — no fabricated numbers.
  const q = (s: string) => encodeURIComponent(s);
  const hotelQuery = pkg.hotel ? `${pkg.hotel} ${pkg.destination}` : pkg.destination;
  const refs = {
    google: `https://www.google.com/search?q=${q(hotelQuery + " Bewertungen")}`,
    booking:
      pkg.bookingLinks?.hotel ??
      `https://www.booking.com/searchresults.html?ss=${q(hotelQuery)}`,
    getyourguide:
      pkg.bookingLinks?.activities ??
      `https://www.getyourguide.de/s/?q=${q(pkg.destination)}`,
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-luxe sm:flex-row">
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
            <p className="mt-1 text-xs text-muted-foreground">
              {meta.budgetHint(pkg.price)} · Richtpreis, Live-Preis beim Anbieter
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pkg.badges.slice(0, 3).map((b) => (
              <span key={b} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Right: real reference links + CTA */}
        <div className="flex flex-col justify-between gap-4 md:w-60 md:border-l md:border-border md:pl-5">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Echte Bewertungen ansehen
            </p>
            <ul className="space-y-1.5">
              <RefRow label="Google" href={refs.google} />
              <RefRow label="Booking.com" href={refs.booking} />
              <RefRow label="GetYourGuide" href={refs.getyourguide} />
              <li className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI-Match
                </span>
                <span className="font-semibold text-foreground">{pkg.matchScore}%</span>
              </li>
            </ul>
          </div>

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

function RefRow({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-md px-1.5 py-1 text-sm text-foreground transition-colors hover:bg-secondary"
      >
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Ansehen <ExternalLink className="h-3 w-3" />
        </span>
      </a>
    </li>
  );
}

