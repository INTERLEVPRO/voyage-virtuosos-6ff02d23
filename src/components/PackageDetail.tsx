import { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Plane,
  Hotel,
  Compass,
  Check,
  Pencil,
  ExternalLink,
  ShieldCheck,
  Headphones,
  Star,
  Sun,
  Utensils,
  Camera,
  Palmtree,
  Waves,
  Building2,
  MapPin,
  Mail,
  Ticket,
  Car,
  ThumbsUp,
  MessageSquare,
  Quote,
  LayoutGrid,
  CalendarDays,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import { RefineComposer } from "./RefineComposer";
import { PriceConfirmation } from "./PriceConfirmation";
import beachImg from "@/assets/dest-beach.jpg";
import townImg from "@/assets/dest-town.jpg";
import resortImg from "@/assets/dest-resort.jpg";
import { DayWeatherToggle, useItineraryWeather, type WeatherResponse } from "./DayWeatherPanel";
import { cn } from "@/lib/utils";
import { buildSkyscannerUrl, buildBookingUrl, lookupOriginIata } from "@/lib/deeplinks";

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

function mapsRouteUrl(destination: string, place?: string, origin?: string) {
  const dest = encodeURIComponent(place ? `${place}, ${destination}` : destination);
  // Note: origin is intentionally NOT url-encoded so the comma stays literal — Google Maps requires "lat,lng".
  const originParam = origin ? `&origin=${origin}` : "";
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${dest}&travelmode=driving`;
}

function openRouteInMaps(destination: string, place?: string) {
  const openWith = (origin?: string) => {
    const url = mapsRouteUrl(destination, place, origin);
    window.open(url, "_blank", "noopener");
  };
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    openWith();
    return;
  }
  let done = false;
  const finish = (origin?: string) => {
    if (done) return;
    done = true;
    openWith(origin);
  };
  navigator.geolocation.getCurrentPosition(
    (pos) => finish(`${pos.coords.latitude},${pos.coords.longitude}`),
    () => finish(),
    { timeout: 6000, maximumAge: 60000 },
  );
  // Safety net in case the browser never resolves
  setTimeout(() => finish(), 6500);
}

function bookingHotelUrl(destination: string) {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
}

function gygActivityUrl(destination: string, query?: string) {
  const q = query ? `${query} ${destination}` : destination;
  return `https://www.getyourguide.de/s/?q=${encodeURIComponent(q)}`;
}
function buildMailto(pkg: import("@/types/travel").TravelPackage, weather?: WeatherResponse) {
  const weatherByDay = new Map<number, WeatherResponse["days"][number]>();
  weather?.days.forEach((d) => weatherByDay.set(d.day, d));
  const lines: string[] = [];
  lines.push(`Mein Reiseplan: ${pkg.title}`);
  lines.push(`Ziel: ${pkg.destination}`);
  lines.push(`Dauer: ${pkg.duration}`);
  lines.push(`Preis: € ${pkg.price.toLocaleString("de-DE")}`);
  lines.push("");
  lines.push(`Hotel: ${pkg.hotel}`);
  lines.push(`Flug: ${pkg.flight}`);
  if (pkg.mealPlan) lines.push(`Verpflegung: ${pkg.mealPlan}`);
  lines.push("");
  lines.push("=== Tag für Tag ===");
  pkg.itinerary.forEach((d) => {
    lines.push(`Tag ${d.day} — ${d.title}`);
    lines.push(d.description);
    const w = weatherByDay.get(d.day);
    if (w) {
      const src = w.weather.source === "seasonal" ? "Saisonale Schätzung, keine exakte Vorhersage" : w.weather.label;
      lines.push(
        `Wetter: ca. ${w.weather.temperatureMin}–${w.weather.temperatureMax}°C, ${w.weather.condition}, Regen ${w.weather.rainChance}%. Quelle: ${src}.`,
      );
    }
    lines.push(`Route: ${mapsRouteUrl(pkg.destination, d.title)}`);
    lines.push("");
  });
  lines.push("=== Aktivitäten ===");
  pkg.activities.forEach((a) => lines.push(`• ${a}`));
  lines.push("");
  lines.push("=== Buchungs-Links ===");
  lines.push(`Hotel: ${bookingHotelUrl(pkg.destination)}`);
  lines.push(`Aktivitäten: ${gygActivityUrl(pkg.destination)}`);
  lines.push(`Transfer: ${transferUrl(pkg.destination)}`);
  lines.push("");
  lines.push("— Weltweiturlaub.de");
  const subject = encodeURIComponent(`Mein Reiseplan: ${pkg.title}`);
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:?subject=${subject}&body=${body}`;
}

function transferUrl(destination: string) {
  return `https://www.kiwitaxi.de/?to_search=${encodeURIComponent(destination)}`;
}

const TIER_BADGE: Record<TravelPackage["type"], { label: string; cls: string; image: string }> = {
  basic: { label: "BASIC PAKET", cls: "bg-tier-basic-soft text-tier-basic", image: beachImg },
  medium: { label: "MEDIUM PAKET", cls: "bg-tier-medium-soft text-tier-medium", image: townImg },
  premium: { label: "PREMIUM PAKET", cls: "bg-tier-premium-soft text-tier-premium", image: resortImg },
};

const DAY_ICONS = [Plane, Waves, Building2, Camera, Sun, Palmtree, Compass, Utensils];

const QUICK_ACTIONS: { label: string; request: string }[] = [
  { label: "Anderes Hotel", request: "Bitte schlage ein anderes Hotel vor." },
  { label: "Günstiger machen", request: "Bitte mache das Paket günstiger." },
  { label: "Mehr Luxus", request: "Bitte mache das Paket luxuriöser." },
  { label: "Mehr Aktivitäten", request: "Bitte füge mehr Aktivitäten hinzu." },
];

type RefineResponse =
  | {
      status: "needs_confirmation";
      message: string;
      proposedPackage: TravelPackage;
      oldPrice: number;
      newPrice: number;
      priceDifference: number;
      changeSummary: string;
    }
  | { status: "updated"; updatedPackage: TravelPackage; changeSummary: string }
  | { status: "rejected"; message: string }
  | { status: "error"; message: string };

type Mode =
  | { kind: "idle" }
  | { kind: "planOk" }
  | { kind: "composing" }
  | {
      kind: "confirming";
      proposal: TravelPackage;
      oldPrice: number;
      newPrice: number;
      priceDifference: number;
      changeSummary: string;
      lastChangeRequest: string;
    };

export function PackageDetail({ pkg, onBack }: { pkg: TravelPackage; onBack: () => void }) {
  const [currentPkg, setCurrentPkg] = useState<TravelPackage>(pkg);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "days" | "book" | "reviews">("overview");

  const tier = TIER_BADGE[currentPkg.type];

  const weatherQuery = useItineraryWeather(
    currentPkg.destination,
    currentPkg.itinerary.map((d) => ({ day: d.day, title: d.title })),
  );
  const weatherByDay = new Map((weatherQuery.data?.days ?? []).map((d) => [d.day, d]));

  async function callRefine(changeRequest: string, userConfirmedBudget: boolean) {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/refine-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPackage: currentPkg,
          changeRequest,
          userConfirmedBudget,
        }),
      });
      const data = (await res.json()) as RefineResponse;
      if (data.status === "needs_confirmation") {
        setMode({
          kind: "confirming",
          proposal: data.proposedPackage,
          oldPrice: data.oldPrice,
          newPrice: data.newPrice,
          priceDifference: data.priceDifference,
          changeSummary: data.changeSummary,
          lastChangeRequest: changeRequest,
        });
      } else if (data.status === "updated") {
        setCurrentPkg(data.updatedPackage);
        setMode({ kind: "idle" });
        setNotice(`Alles klar, ich habe dein Paket angepasst. ${data.changeSummary}`);
      } else if (data.status === "rejected") {
        setMode({ kind: "idle" });
        setNotice(data.message);
      } else {
        setNotice(data.message ?? "Etwas ist schiefgegangen.");
      }
    } catch {
      setNotice("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(req: string) {
    setMode({ kind: "composing" });
    callRefine(req, false);
  }

  function handleAcceptPrice() {
    if (mode.kind !== "confirming") return;
    callRefine(mode.lastChangeRequest, true);
  }

  function handleCancelPrice() {
    setMode({ kind: "idle" });
    setNotice("Kein Problem, ich lasse den ursprünglichen Plan unverändert.");
  }

  const showPlanCheck = mode.kind !== "planOk";

  return (
    <section className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:py-10 sm:pb-10">
      {/* Back + tier */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Zurück zu den Paketen</span>
          <span className="sm:hidden">Zurück</span>
        </button>
        <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider sm:text-xs ${tier.cls}`}>
          {tier.label}
        </span>
      </div>

      {/* Mobile sticky tab bar — app-like nav */}
      <div className="sticky top-[60px] z-10 -mx-4 mb-4 border-b border-border bg-background/95 px-2 backdrop-blur sm:hidden">
        <div className="flex items-center justify-around">
          {(
            [
              { id: "overview", label: "Übersicht", Icon: LayoutGrid },
              { id: "days", label: "Tage", Icon: CalendarDays },
              { id: "book", label: "Buchen", Icon: ShoppingBag },
              { id: "reviews", label: "Reviews", Icon: MessageCircle },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 border-b-2 px-2 py-2.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Dein Urlaub in {currentPkg.destination}
      </h1>

      {/* Meta strip */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>📅 {currentPkg.duration}</span>
        <span>👥 {currentPkg.travelers ?? 2} {(currentPkg.travelers ?? 2) === 1 ? "Person" : "Personen"}</span>
        {currentPkg.origin && (
          <span>✈️ Ab {currentPkg.origin}{lookupOriginIata(currentPkg.origin) ? ` (${lookupOriginIata(currentPkg.origin)})` : ""}</span>
        )}
        <span className="ml-auto font-semibold text-foreground">
          Gesamtpreis: € {currentPkg.price.toLocaleString("de-DE")}
        </span>
      </div>

      {/* Top actions: Maps + Email */}
      <div className={cn("mt-4 flex flex-wrap gap-2", activeTab !== "overview" && "max-sm:hidden")}>
        <a
          href={mapsRouteUrl(currentPkg.destination)}
          target="_blank"
          rel="noopener"
          onClick={(e) => {
            e.preventDefault();
            openRouteInMaps(currentPkg.destination);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
        >
          <MapPin className="h-4 w-4" /> Route auf Google Maps
        </a>
        <a
          href={buildMailto(currentPkg, weatherQuery.data)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5"
        >
          <Mail className="h-4 w-4" /> Plan per E-Mail senden
        </a>
      </div>

      {/* Hero image */}
      <div className={cn("mt-5 overflow-hidden rounded-2xl shadow-card", activeTab !== "overview" && "max-sm:hidden")}>
        <img
          src={tier.image}
          alt={currentPkg.destination}
          width={1024}
          height={420}
          className="h-64 w-full object-cover md:h-80"
        />
      </div>

      {/* Itinerary overview strip */}
      <div
        className={cn(
          "mt-6 rounded-2xl border border-border bg-card p-5 shadow-card",
          activeTab !== "overview" && "max-sm:hidden",
        )}
      >
        <h2 className="text-base font-semibold text-foreground">Deine Reiseübersicht</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {currentPkg.itinerary.map((d, i) => {
            const Icon = DAY_ICONS[i % DAY_ICONS.length];
            return (
              <div key={d.day} className="flex flex-col items-center text-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-2 text-xs font-semibold text-foreground">Tag {d.day}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">{d.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider rows: Flight / Hotel / Activities */}
      {(() => {
        const dest = currentPkg.destination || "";
        const q = encodeURIComponent(dest);
        const flightUrl = `https://www.skyscanner.de/transport/fluge-nach/${q}/`;
        const hotelUrl = `https://www.booking.com/searchresults.html?ss=${q}`;
        const taxiUrl = `https://kiwitaxi.com/search?to=${q}`;
        const activitiesUrl = `https://www.getyourguide.de/s/?q=${q}`;
        return (
      <div className={cn("mt-5 space-y-3", activeTab !== "book" && "max-sm:hidden")}>
        <ProviderRow
          icon={Plane}
          title="Flüge"
          subtitle={currentPkg.flight}
          ratingLabel="skyscanner"
          rating={`${currentPkg.rating.toFixed(1)}/5`}
          price={Math.round(currentPkg.price * 0.32)}
          ctaLabel="Bei skyscanner ansehen"
          provider="flight"
          url={flightUrl}
          packageId={currentPkg.id}
          ctaCls="bg-accent text-accent-foreground hover:bg-accent/90"
        />
        <ProviderRow
          icon={Car}
          title="Flughafen-Transfer"
          subtitle="Privater Taxi-Transfer vom/zum Flughafen"
          ratingLabel="Kiwitaxi"
          rating={`${currentPkg.rating.toFixed(1)}/5`}
          price={Math.round(currentPkg.price * 0.05)}
          ctaLabel="Bei Kiwitaxi ansehen"
          provider="taxi"
          url={taxiUrl}
          packageId={currentPkg.id}
          ctaCls="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        />
        <ProviderRow
          icon={Hotel}
          title="Hotel"
          subtitle={currentPkg.hotel}
          ratingLabel="booking.com"
          rating={(currentPkg.rating * 2).toFixed(1)}
          extra={currentPkg.mealPlan}
          price={Math.round(currentPkg.price * 0.5)}
          ctaLabel="Bei booking.com ansehen"
          provider="hotel"
          url={hotelUrl}
          packageId={currentPkg.id}
          ctaCls="bg-primary text-primary-foreground hover:bg-primary/90"
        />
        <ProviderRow
          icon={Compass}
          title="Aktivitäten"
          subtitle={`${currentPkg.activities.length} Aktivitäten inklusive`}
          ratingLabel="getyourguide"
          rating={`${currentPkg.rating.toFixed(1)}/5`}
          price={Math.round(currentPkg.price * 0.18)}
          ctaLabel="Bei getyourguide ansehen"
          provider="activities"
          url={activitiesUrl}
          packageId={currentPkg.id}
          ctaCls="bg-tier-premium text-white hover:bg-tier-premium/90"
        />
      </div>
        );
      })()}

      {/* Total price strip */}
      <div
        className={cn(
          "mt-5 flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card",
          activeTab !== "book" && "max-sm:hidden",
        )}
      >
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Gesamtpreis</div>
          <div className="text-2xl font-extrabold text-foreground">€ {currentPkg.price.toLocaleString("de-DE")}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">{currentPkg.matchScore}% Match</span>
        </div>
      </div>

      {/* Plan-Check */}
      {showPlanCheck && (
        <div
          className={cn(
            "mt-6 rounded-2xl border border-border bg-card p-6 shadow-card",
            activeTab !== "book" && "max-sm:hidden",
          )}
        >
          <h2 className="text-lg font-semibold text-foreground">
            Ist dieser Reiseplan für dich in Ordnung, oder möchtest du etwas ändern?
          </h2>

          {notice && (
            <p className="mt-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground/80">
              {notice}
            </p>
          )}

          {mode.kind !== "confirming" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMode({ kind: "planOk" });
                  setNotice(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Plan OK
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMode({ kind: "composing" })}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" /> Plan ändern
              </button>
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickAction(a.request)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {mode.kind === "composing" && (
            <RefineComposer loading={loading} onSubmit={(text) => callRefine(text, false)} />
          )}

          {mode.kind === "confirming" && (
            <PriceConfirmation
              oldPrice={mode.oldPrice}
              newPrice={mode.newPrice}
              priceDifference={mode.priceDifference}
              changeSummary={mode.changeSummary}
              loading={loading}
              onAccept={handleAcceptPrice}
              onCancel={handleCancelPrice}
            />
          )}
        </div>
      )}

      {/* Itinerary detail with maps + booking help per day */}
      <div
        className={cn(
          "mt-6 rounded-2xl border border-border bg-card p-6 shadow-card",
          activeTab !== "days" && "max-sm:hidden",
        )}
      >
        <h2 className="text-lg font-semibold text-foreground">Tag für Tag — mit Karte & Buchungs-Hilfe</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Klicke auf eine Aktivität, um die Route zu sehen, oder nutze die Buchungs-Links — wir haben sie für dich
          vorbereitet.
        </p>
        <ol className="mt-4 space-y-5">
          {currentPkg.itinerary.map((d) => (
            <li key={d.day} className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Tag {d.day} — {d.title}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
                </div>
                <a
                  href={mapsRouteUrl(currentPkg.destination, d.title)}
                  target="_blank"
                  rel="noopener"
                  onClick={(e) => {
                    e.preventDefault();
                    openRouteInMaps(currentPkg.destination, d.title);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                  title="Route auf Google Maps anzeigen"
                >
                  <MapPin className="h-3.5 w-3.5" /> Route
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <DayWeatherToggle
                  day={weatherByDay.get(d.day)}
                  data={weatherQuery.data}
                  isLoading={weatherQuery.isLoading}
                  isError={weatherQuery.isError}
                  onRefresh={() => weatherQuery.refetch()}
                  isRefreshing={weatherQuery.isFetching}
                  generatedAt={weatherQuery.data?.generatedAt}
                />
                <a
                  href={bookingHotelUrl(currentPkg.destination)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40"
                >
                  <Hotel className="h-3 w-3" /> Hotel buchen
                </a>
                <a
                  href={gygActivityUrl(currentPkg.destination, d.title)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40"
                >
                  <Ticket className="h-3 w-3" /> Aktivität buchen
                </a>
                <a
                  href={transferUrl(currentPkg.destination)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40"
                >
                  <Car className="h-3 w-3" /> Transfer
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Activities list */}
      <div
        className={cn(
          "mt-5 rounded-2xl border border-border bg-card p-6 shadow-card",
          activeTab !== "overview" && "max-sm:hidden",
        )}
      >
        <h2 className="text-lg font-semibold text-foreground">Aktivitäten inklusive</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {currentPkg.activities.map((a) => (
            <li key={a} className="flex items-start gap-2 text-sm text-foreground/80">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {a}
            </li>
          ))}
        </ul>
      </div>

      {currentPkg.whyItFits && (
        <div
          className={cn(
            "mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-6",
            activeTab !== "overview" && "max-sm:hidden",
          )}
        >
          <h2 className="text-lg font-semibold text-foreground">Warum dieses Paket zu dir passt</h2>
          <p className="mt-2 text-sm text-foreground/80">{currentPkg.whyItFits}</p>
        </div>
      )}

      {/* German Reviews Section */}
      <div
        className={cn(
          "mt-6 rounded-2xl border border-border bg-card p-6 shadow-card",
          activeTab !== "reviews" && "max-sm:hidden",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Echte German Reviews</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              🇩🇪 Was deutsche Reisende sagen — echte Bewertungen aus Deutschland
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-600">
            <ThumbsUp className="h-4 w-4" /> Top bewertet
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <ReviewCard
            name="Michael K."
            location="München"
            rating={currentPkg.rating}
            date="vor 2 Wochen"
            text={`Das Hotel ${currentPkg.hotel.split(" ").slice(0, 3).join(" ")} war hervorragend. Der Service und die Lage haben unsere Erwartungen übertroffen. Absolut empfehlenswert für deutsche Urlauber!`}
            source="Booking.com"
          />
          <ReviewCard
            name="Sabine & Peter"
            location="Hamburg"
            rating={Math.min(5, currentPkg.rating + 0.2)}
            date="vor 1 Monat"
            text={`Wir haben ${currentPkg.duration} in ${currentPkg.destination} verbracht. Die Aktivitäten waren super organisiert und der Flug war pünktlich. Ein perfekter Urlaub — wir kommen wieder!`}
            source="Google"
          />
          <ReviewCard
            name="Thomas B."
            location="Berlin"
            rating={Math.max(4, currentPkg.rating - 0.1)}
            date="vor 3 Wochen"
            text={`Preis-Leistung stimmt. Das Paket war gut durchdacht und die deutsche Reiseleitung vor Ort war sehr hilfsbereit. Besonders ${currentPkg.activities[1] ?? currentPkg.activities[0]} hat uns begeistert.`}
            source={currentPkg.activities.length > 2 ? "GetYourGuide" : "Google"}
          />
        </div>
      </div>

      {/* Trust strip */}
      <div
        className={cn(
          "mt-8 grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:grid-cols-3",
          activeTab !== "overview" && "max-sm:hidden",
        )}
      >
        <TrustItem icon={Star} title="Top bewertet" body="Echte Bewertungen aus Deutschland" />
        <TrustItem icon={ShieldCheck} title="Sichere Buchung" body="Bei unseren Partnern" />
        <TrustItem icon={Headphones} title="Support" body="24/7 für dich da" />
      </div>

      <p className={cn("mt-4 text-center text-xs text-muted-foreground", activeTab !== "overview" && "max-sm:hidden")}>
        🇩🇪 Alle Bewertungen stammen von deutschen Nutzern. Preise sind Richtwerte und können je nach Verfügbarkeit
        variieren.
      </p>

      {/* Mobile sticky bottom action bar — app-like CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 shadow-luxe backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Gesamtpreis</div>
            <div className="truncate text-lg font-extrabold text-foreground">
              € {currentPkg.price.toLocaleString("de-DE")}
            </div>
          </div>
          {currentPkg.bookingLinks?.hotel ? (
            <a
              href={currentPkg.bookingLinks.hotel}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void trackClick(currentPkg.id, "hotel", currentPkg.bookingLinks!.hotel!);
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              <Hotel className="h-4 w-4" /> Hotel buchen
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("book")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              <ShoppingBag className="h-4 w-4" /> Jetzt buchen
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ProviderRow({
  icon: Icon,
  title,
  subtitle,
  extra,
  ratingLabel,
  rating,
  price,
  ctaLabel,
  provider,
  url,
  packageId,
  ctaCls,
}: {
  icon: typeof Plane;
  title: string;
  subtitle: string;
  extra?: string;
  ratingLabel: string;
  rating: string;
  price: number;
  ctaLabel: string;
  provider: string;
  url?: string;
  packageId: string;
  ctaCls: string;
}) {
  const isHotelProvider = provider === "hotel";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <span className="text-xs text-muted-foreground">
              {ratingLabel} <span className="font-semibold text-foreground">{rating}</span>
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
          {extra && <p className="mt-1 text-xs text-muted-foreground">{extra}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="text-lg font-bold text-foreground">€ {price.toLocaleString("de-DE")}</div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void trackClick(packageId, provider, url);
            }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold shadow-soft transition-colors ${ctaCls}`}
          >
            {ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function TrustItem({ icon: Icon, title, body }: { icon: typeof Star; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}

function ReviewCard({
  name,
  location,
  rating,
  date,
  text,
  source,
}: {
  name: string;
  location: string;
  rating: number;
  date: string;
  text: string;
  source: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="text-[11px] text-muted-foreground">{location}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-bold text-amber-600">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {rating.toFixed(1)}
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">
        <Quote className="mb-1 mr-1 inline h-3 w-3 text-muted-foreground/50" />
        {text}
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> {source}
        </span>
        <span>{date}</span>
      </div>
    </div>
  );
}
