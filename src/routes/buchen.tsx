import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plane, Hotel, Compass, Car, ExternalLink, Info } from "lucide-react";
import {
  buildAviasalesSearchUrl,
  buildKlookSearchUrl,
  buildKlookActivitiesUrl,
  buildTransferUrl,
  absoluteUrl,
} from "@/lib/deeplinks";

type Search = {
  id?: string;
  titel?: string;
  ziel?: string;
  hotel?: string;
  ab?: string;
  tage?: number;
  personen?: number;
  preis?: number;
  datum?: string;
  monat?: string;
};

function str(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(v: unknown) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const Route = createFileRoute("/buchen")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: str(s.id),
    titel: str(s.titel),
    ziel: str(s.ziel),
    hotel: str(s.hotel),
    ab: str(s.ab),
    tage: num(s.tage),
    personen: num(s.personen),
    preis: num(s.preis),
    datum: str(s.datum),
    monat: str(s.monat),
  }),
  head: () => ({
    meta: [
      { title: "Reisepaket buchen — Urlaub ab Deutschland | Weltweiturlaub.de" },
      {
        name: "description",
        content:
          "Alle Buchungslinks deines Reisepakets auf einen Blick: Flug, Hotel, Aktivitäten und Flughafentransfer — direkt bei unseren Partneranbietern.",
      },
      { property: "og:title", content: "Reisepaket buchen — Urlaub ab Deutschland | Weltweiturlaub.de" },
      {
        property: "og:description",
        content:
          "Flug, Hotel, Aktivitäten und Transfer deines Reisepakets direkt bei den Partneranbietern buchen.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://weltweiturlaub.de/buchen" },
    ],
    links: [{ rel: "canonical", href: "https://weltweiturlaub.de/buchen" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Startseite", item: "https://weltweiturlaub.de/" },
            { "@type": "ListItem", position: 2, name: "Buchung", item: "https://weltweiturlaub.de/buchen" },
          ],
        }),
      },
    ],
  }),
  component: BuchenPage,
});

/** Klick melden — Fehler werden protokolliert, der Link öffnet immer. */
async function trackClick(packageId: string | undefined, provider: string, url: string) {
  try {
    const res = await fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, provider, url: absoluteUrl(url) }),
    });
    if (!res.ok) console.error("track-click failed", res.status);
  } catch (err) {
    console.error("track-click error", err);
  }
}

function BuchenPage() {
  const search = Route.useSearch();
  const destination = search.ziel;

  const header = (
    <header className="sticky top-0 z-20 border-b border-border bg-card px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-foreground transition-colors hover:bg-secondary"
          aria-label="Zurück zur Startseite"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Buchung</h1>
      </div>
    </header>
  );

  if (!destination) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="mx-auto max-w-3xl p-5 sm:p-8">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft sm:p-10">
            <h2 className="mb-3 text-2xl font-bold text-foreground">Noch kein Reisepaket gewählt</h2>
            <p className="mb-8 text-muted-foreground">
              Plane zuerst deine Reise im Chat. Anschließend findest du hier alle Buchungslinks
              deines Pakets — Flug, Hotel, Aktivitäten und Flughafentransfer.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:opacity-90"
            >
              Reise planen
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const durationDays = search.tage;
  const travelers = search.personen;

  const flightUrl = buildAviasalesSearchUrl({
    destination,
    origin: search.ab,
    travelers,
    month: search.monat,
    startDate: search.datum,
    durationDays,
  });
  const hotelUrl = buildKlookSearchUrl({
    destination,
    hotel: search.hotel,
    travelers,
    rooms: Math.max(1, Math.ceil((travelers ?? 2) / 2)),
    month: search.monat,
    startDate: search.datum,
    durationDays,
  });
  const activitiesUrl = buildKlookActivitiesUrl({
    destination,
    month: search.monat,
    startDate: search.datum,
    durationDays,
  });
  const taxiUrl = buildTransferUrl({
    destination,
    hotel: search.hotel,
    travelers,
    month: search.monat,
    startDate: search.datum,
    durationDays,
  });

  const rows = [
    {
      Icon: Plane,
      title: "Flug",
      partner: "Aviasales",
      subtitle: search.ab ? `${search.ab} → ${destination}` : `Flüge nach ${destination}`,
      url: flightUrl,
      provider: "flight_buchen",
      cls: "bg-accent text-accent-foreground hover:bg-accent/90",
    },
    {
      Icon: Hotel,
      title: "Hotel",
      partner: "Klook",
      subtitle: search.hotel || `Unterkunft in ${destination}`,
      url: hotelUrl,
      provider: "hotel_buchen",
      cls: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      Icon: Compass,
      title: "Aktivitäten",
      partner: "Klook",
      subtitle: `Touren & Erlebnisse in ${destination}`,
      url: activitiesUrl,
      provider: "activities_buchen",
      cls: "bg-tier-premium text-white hover:bg-tier-premium/90",
    },
    {
      Icon: Car,
      title: "Flughafentransfer",
      partner: "Kiwitaxi",
      subtitle: "Privater Transfer vom Flughafen zur Unterkunft",
      url: taxiUrl,
      provider: "taxi_buchen",
      cls: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {header}

      <main className="mx-auto max-w-3xl p-5 sm:p-8">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {search.titel || `Reisepaket ${destination}`}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reiseziel</dt>
              <dd className="font-semibold text-foreground">{destination}</dd>
            </div>
            {durationDays && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Dauer</dt>
                <dd className="font-semibold text-foreground">{durationDays} Tage</dd>
              </div>
            )}
            {travelers && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Personen</dt>
                <dd className="font-semibold text-foreground">{travelers}</dd>
              </div>
            )}
            {search.preis && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Gesamtpreis</dt>
                <dd className="font-extrabold text-foreground">
                  € {Math.round(search.preis).toLocaleString("de-DE")}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mt-5 space-y-3">
          {rows.map(({ Icon, title, partner, subtitle, url, provider, cls }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {title} <span className="text-xs font-normal text-muted-foreground">· {partner}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                </div>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => void trackClick(search.id, provider, url)}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft transition-colors ${cls}`}
              >
                Bei {partner} buchen <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </section>

        <p className="mt-5 flex items-start gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Buchung und Zahlung erfolgen direkt beim jeweiligen Partneranbieter. Weltweiturlaub.de
            wickelt keine Zahlung ab und ist nicht Vertragspartner der Reiseleistung. Preise und
            Verfügbarkeiten werden beim Partner in Echtzeit geprüft und können abweichen.
          </span>
        </p>
      </main>
    </div>
  );
}
