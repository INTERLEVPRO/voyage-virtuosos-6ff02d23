import { Loader2, ArrowRight } from "lucide-react";

export function PriceConfirmation({
  oldPrice,
  newPrice,
  priceDifference,
  changeSummary,
  onAccept,
  onCancel,
  loading,
}: {
  oldPrice: number;
  newPrice: number;
  priceDifference: number;
  changeSummary: string;
  onAccept: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const diffLabel =
    priceDifference === 0
      ? "0 €"
      : `${priceDifference > 0 ? "+" : ""}${priceDifference.toLocaleString("de-DE")} €`;
  const diffClass =
    priceDifference > 0
      ? "text-destructive"
      : priceDifference < 0
        ? "text-emerald-600"
        : "text-muted-foreground";

  return (
    <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/5 p-5 shadow-soft">
      <h3 className="font-display text-lg text-primary">
        Preisänderung — bitte bestätigen
      </h3>

      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground line-through">
          {oldPrice.toLocaleString("de-DE")} €
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-display text-xl text-primary">
          {newPrice.toLocaleString("de-DE")} €
        </span>
        <span className={`text-sm font-medium ${diffClass}`}>({diffLabel})</span>
      </div>

      <p className="mt-3 text-sm text-foreground/80">{changeSummary}</p>

      <p className="mt-4 text-sm font-medium text-primary">
        Möchtest du diese Änderung übernehmen?
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onAccept}
          className="flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-medium text-primary shadow-soft disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Ja, übernehmen
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/40 disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
