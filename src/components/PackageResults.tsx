import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarDays, Users, Plane, Wallet } from "lucide-react";
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
  const { t } = useTranslation();
  const sample = packages[0];
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("results.newRequest")}
      </button>

      <h1 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {t("results.title")}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {t("results.subtitle")}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {sample?.duration ?? "—"}</span>
        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t("results.persons")}</span>
        <span className="inline-flex items-center gap-1.5"><Plane className="h-3.5 w-3.5" /> {t("results.fromFra")}</span>
        <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> {t("results.budgetOk")}</span>
      </div>

      <div className="mt-10 grid gap-5">
        {packages.map((p) => (
          <PackageCard key={p.id} pkg={p} onSelect={() => onSelect(p)} />
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-center text-xs text-muted-foreground">
        {t("results.note")}
      </div>
    </section>
  );
}
