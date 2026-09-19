import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { KIWI_TAXI_AFFILIATE_URL, parseStartDate } from "@/lib/deeplinks";

const KIWITAXI_PAP_MARKER = "728432";
const WIDGET_SCRIPT_SRC = "https://widget-white-label.kiwitaxi.com/js/index.js";

type Search = {
  from?: string;
  to?: string;
  country?: string;
  pax?: number;
  date?: string;
};

export const Route = createFileRoute("/transfer")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    country: typeof s.country === "string" ? s.country : undefined,
    pax: typeof s.pax === "string" ? Number(s.pax) || undefined : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Flughafentransfer buchen — Weltweiturlaub.de" },
      {
        name: "description",
        content:
          "Buchen Sie Ihren Flughafentransfer bequem online. Festpreis, deutschsprachiger Support, weltweite Verfügbarkeit.",
      },
      { name: "robots", content: "noindex,follow" },
      { property: "og:url", content: "https://weltweiturlaub.de/transfer" },
    ],
  }),
  component: TransferPage,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="text-xl font-semibold">Transfer-Buchung</h1>
        <p className="mt-2 text-muted-foreground">Das Widget konnte nicht geladen werden.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Erneut versuchen
          </button>
          <a
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            href={KIWI_TAXI_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Direkt zu Kiwitaxi
          </a>
        </div>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Seite nicht gefunden.</div>,
});

function TransferPage() {
  const search = Route.useSearch();
  const [widgetFailed, setWidgetFailed] = useState(false);
  // Nur ein real existierendes Kalenderdatum wird angezeigt bzw. übergeben.
  const validDate = parseStartDate(search.date);
  const isoDateLabel = validDate
    ? validDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const paxLabel =
    search.pax && search.pax > 0 ? String(Math.min(8, Math.max(1, Math.round(search.pax)))) : null;

  useEffect(() => {
    // Configure the Kiwitaxi White Label widget BEFORE loading its bundle.
    // The bundle reads window.kiwitaxiWLConfig at boot.
    // Normalize the date to ISO (YYYY-MM-DD). The pickup TIME is deliberately
    // left empty: it depends on the traveller's actual flight arrival and must
    // never be silently assumed.
    // Strenge Kalenderprüfung (gemeinsam mit dem Rest der Seite). Unmögliche
    // Angaben wie 31.02.2027 werden verworfen statt still verschoben.
    const isoDate = (() => {
      const d = parseStartDate(search.date);
      if (!d) return undefined;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const pax = search.pax && search.pax > 0 ? Math.min(8, Math.max(1, Math.round(search.pax))) : undefined;

    (window as unknown as { kiwitaxiWLConfig: Record<string, unknown> }).kiwitaxiWLConfig = {
      language: "de",
      display_currency: "EUR",
      country: search.country || undefined,
      place_from: search.from || undefined,
      place_to: search.to || undefined,
      // Pre-fill date / time / passengers (multiple field-name aliases for
      // forward-compatibility with widget versions).
      date_pickup: isoDate,
      transfer_date: isoDate,
      date: isoDate,
      passengers: pax,
      passengers_count: pax,
      adults: pax,
      pax,
      height: "720",
      transfers_limit: 20,
      hide_form_extras: false,
      hide_external_links: false,
      disable_currency_selector: false,
      scroll_offset: 0,
      deep_link: false,
      ref_params: {
        pap: KIWITAXI_PAP_MARKER,
        pap_bid: "weltweiturlaub",
        pap_merchant: "kiwitaxi",
      },
    };

    // Remove any existing script to force script execution
    const existingScripts = document.querySelectorAll(`script[src*="widget-white-label.kiwitaxi.com"]`);
    existingScripts.forEach((s) => s.remove());

    // Clear the container content
    const container = document.querySelector("[data-kiwitaxi-white-label]");
    if (container) {
      container.innerHTML = "";
    }

    // Inject the widget script
    const s = document.createElement("script");
    s.src = `${WIDGET_SCRIPT_SRC}?t=${Date.now()}`;
    s.async = true;
    s.onerror = () => setWidgetFailed(true);
    document.body.appendChild(s);

    // Nach einigen Sekunden prüfen, ob das Fenster wirklich aufgebaut wurde.
    // Bleibt die Fläche leer, zeigen wir einen klaren Hinweis statt nichts.
    const timer = window.setTimeout(() => {
      const el = document.querySelector("[data-kiwitaxi-white-label]");
      const mounted = !!el && el.children.length > 0;
      setWidgetFailed(!mounted);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
      // Cleanup on unmount or dependency update
      const addedScripts = document.querySelectorAll(`script[src*="widget-white-label.kiwitaxi.com"]`);
      addedScripts.forEach((scr) => scr.remove());
    };
  }, [search.country, search.from, search.to, search.date, search.pax]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Flughafentransfer buchen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Festpreis · deutschsprachiger Support · Bezahlung direkt bei Kiwitaxi
          {search.from ? ` · Abholung: ${search.from}` : ""}
          {search.to ? ` · Ziel: ${search.to}` : ""}
          {isoDateLabel ? ` · Reisedatum: ${isoDateLabel}` : ""}
          {paxLabel ? ` · Personen: ${paxLabel}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bitte trage die Abholzeit passend zu deiner tatsächlichen Flugankunft ein — wir geben
          keine Uhrzeit vor.
        </p>
      </header>

      {widgetFailed && (
        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Das Buchungsfenster lädt gerade nicht</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Du kannst deinen Transfer direkt bei Kiwitaxi buchen — mit diesen Angaben:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {search.from ? <li>Abholung: {search.from}</li> : null}
            {search.to ? <li>Ziel: {search.to}</li> : null}
            {isoDateLabel ? <li>Datum: {isoDateLabel}</li> : null}
            {paxLabel ? <li>Personen: {paxLabel}</li> : null}
          </ul>
          <a
            className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            href={KIWI_TAXI_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Bei Kiwitaxi öffnen
          </a>
        </div>
      )}

      {/* Kiwitaxi White Label container — the script mounts the iframe into this div. */}
      <div data-kiwitaxi-white-label style={{ width: "100%", minHeight: widgetFailed ? 0 : 720 }} />

      <p className="mt-4 text-xs text-muted-foreground">
        Probleme beim Laden?{" "}
        <a
          className="underline"
          href={KIWI_TAXI_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Direkt auf kiwitaxi.com öffnen
        </a>
        .
      </p>
    </div>
  );
}
