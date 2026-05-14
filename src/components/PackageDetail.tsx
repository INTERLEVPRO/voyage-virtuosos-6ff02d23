import { ArrowLeft, Star, Sparkles, Plane, Hotel, MapPin, Compass, Utensils } from "lucide-react";
import type { TravelPackage } from "@/types/travel";

async function trackClick(packageId: string, provider: string, url: string) {
  try {
    await fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, provider, url }),
    });
  } catch {
    // non-fatal
  }
}

function BookingButton({
  packageId,
  provider,
  url,
  label,
  Icon,
  primary,
}: {
  packageId: string;
  provider: string;
  url?: string;
  label: string;
  Icon: typeof Plane;
  primary?: boolean;
}) {
  if (!url) return null;
  return (
    <button
      onClick={() => {
        trackClick(packageId, provider, url);
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      className={
        primary
          ? "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-medium text-primary shadow-soft transition-transform hover:scale-[1.02]"
          : "flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-secondary/40"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export function PackageDetail({
  pkg,
  onBack,
}: {
  pkg: TravelPackage;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück zu den Vorschlägen
      </button>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-8 lg:col-span-2">
          {/* Hero */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <span className="rounded-full bg-gradient-gold px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              {pkg.type}
            </span>
            <h1 className="mt-4 font-display text-4xl text-primary md:text-5xl">{pkg.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {pkg.destination}</span>
              <span>· {pkg.duration}</span>
              <span className="inline-flex items-center gap-1 text-accent">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium text-foreground">{pkg.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({pkg.reviews.toLocaleString("de-DE")})</span>
              </span>
              <span className="inline-flex items-center gap-1 text-accent">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium text-foreground">{pkg.matchScore}% Match</span>
              </span>
            </div>
            <p className="mt-5 text-base leading-relaxed text-foreground/80">{pkg.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {pkg.badges.map((b) => (
                <span key={b} className="rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-xs text-secondary-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Flight & Hotel */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Plane className="h-4 w-4" /> Flug
              </div>
              <p className="mt-3 text-sm text-foreground/80">{pkg.flight}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Hotel className="h-4 w-4" /> Hotel
              </div>
              <p className="mt-3 text-sm text-foreground/80">{pkg.hotel}</p>
              {pkg.mealPlan && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Utensils className="h-3.5 w-3.5" /> {pkg.mealPlan}
                </p>
              )}
            </div>
          </div>

          {/* Activities */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Compass className="h-4 w-4" /> Aktivitäten
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {pkg.activities.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          {/* Itinerary */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <h2 className="font-display text-2xl text-primary">Tag für Tag</h2>
            <ol className="mt-5 space-y-5">
              {pkg.itinerary.map((d) => (
                <li key={d.day} className="border-l-2 border-accent/40 pl-4">
                  <div className="font-display text-lg text-primary">
                    Tag {d.day} — {d.title}
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{d.description}</p>
                </li>
              ))}
            </ol>
          </div>

          {pkg.whyItFits && (
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 shadow-soft md:p-8">
              <h2 className="font-display text-xl text-primary">Warum dieses Paket zu dir passt</h2>
              <p className="mt-2 text-sm text-foreground/80">{pkg.whyItFits}</p>
            </div>
          )}
        </div>

        {/* Sticky booking box */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-luxe">
            <div className="font-display text-3xl text-primary">
              {pkg.price.toLocaleString("de-DE")} {pkg.currency === "EUR" ? "€" : pkg.currency}
            </div>
            <div className="text-xs text-muted-foreground">pro Person · ca.</div>

            <div className="mt-5 space-y-2.5">
              <BookingButton
                packageId={pkg.id}
                provider="hotel"
                url={pkg.bookingLinks?.hotel}
                label="Hotel buchen"
                Icon={Hotel}
                primary
              />
              <BookingButton
                packageId={pkg.id}
                provider="flight"
                url={pkg.bookingLinks?.flight}
                label="Flug ansehen"
                Icon={Plane}
              />
              <BookingButton
                packageId={pkg.id}
                provider="activities"
                url={pkg.bookingLinks?.activities}
                label="Aktivitäten buchen"
                Icon={Compass}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Buchung erfolgt über unsere Partner. Preise sind Richtwerte und können je nach Verfügbarkeit variieren.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
