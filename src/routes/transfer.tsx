import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { KIWI_TAXI_AFFILIATE_URL } from "@/lib/deeplinks";

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
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Configure the Kiwitaxi White Label widget BEFORE loading its bundle.
    // The bundle reads window.kiwitaxiWLConfig at boot.
    // Normalize the date to ISO (YYYY-MM-DD) and pick a default pickup time so
    // the booking form is filled as far as possible — only the final payment
    // step should remain for the user.
    const isoDate = (() => {
      const raw = search.date?.trim();
      if (!raw) return undefined;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const m = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
      if (m) {
        const yr = Number(m[3]);
        const year = yr < 100 ? 2000 + yr : yr;
        return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime())
        ? undefined
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
      time_pickup: "12:00",
      transfer_time: "12:00",
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

    // Inject the widget script once.
    if (!document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = WIDGET_SCRIPT_SRC;
      s.async = true;
      document.body.appendChild(s);
    }
  }, [search.country, search.from, search.to]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Flughafentransfer buchen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Festpreis · deutschsprachiger Support · Bezahlung direkt bei Kiwitaxi
          {search.date ? ` · Reisedatum: ${search.date}` : ""}
          {search.pax ? ` · Personen: ${search.pax}` : ""}
        </p>
      </header>

      {/* Kiwitaxi White Label container — the script mounts the iframe into this div. */}
      <div data-kiwitaxi-white-label style={{ width: "100%", minHeight: 720 }} />

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
