import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { KIWI_TAXI_AFFILIATE_URL } from "@/lib/deeplinks";

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
      { title: "Flughafentransfer buchen - Weltweiturlaub.de" },
      {
        name: "description",
        content:
          "Buchen Sie Ihren Flughafentransfer bequem online. Festpreis, deutschsprachiger Support, weltweite Verfuegbarkeit.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: TransferPage,
  notFoundComponent: () => <div className="p-6">Seite nicht gefunden.</div>,
});

function TransferPage() {
  const search = Route.useSearch();

  useEffect(() => {
    window.location.replace(KIWI_TAXI_AFFILIATE_URL);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Flughafentransfer buchen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Festpreis · deutschsprachiger Support · Bezahlung direkt bei Kiwitaxi
          {search.date ? ` · Reisedatum: ${search.date}` : ""}
          {search.pax ? ` · Personen: ${search.pax}` : ""}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm text-muted-foreground">
          Sie werden zu Kiwitaxi weitergeleitet. Falls die Weiterleitung nicht startet, nutzen Sie den Button unten.
        </p>
        <a
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          href={KIWI_TAXI_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Direkt auf kiwitaxi.com oeffnen
        </a>
      </div>
    </div>
  );
}
