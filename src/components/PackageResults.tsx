import { ArrowLeft } from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import { PackageCard } from "./PackageCard";

export function PackageResults({
  packages,
  onSelect,
  onBack,
}: {
  packages: TravelPackage[];
  onSelect: (p: TravelPackage) => void;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Neuen Reisewunsch starten
      </button>

      <h1 className="font-display text-4xl text-primary md:text-5xl">Deine Reisevorschläge</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Vergleiche Basic, Medium und Premium — passend zu deinem Budget. Wähle ein Paket aus, um Details und Buchungsoptionen zu sehen.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {packages.map((p) => (
          <PackageCard key={p.id} pkg={p} onSelect={() => onSelect(p)} />
        ))}
      </div>
    </section>
  );
}
