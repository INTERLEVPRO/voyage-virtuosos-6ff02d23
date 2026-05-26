import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudSun,
  Wind,
  Droplets,
  Thermometer,
  Sparkles,
  RefreshCw,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import type { WeatherDay, WeatherResponse } from "@/routes/api/itinerary-weather";

export type { WeatherDay, WeatherResponse };

export function useItineraryWeather(
  destination: string,
  days: Array<{ day: number; title?: string }>,
) {
  return useQuery<WeatherResponse>({
    queryKey: ["itinerary-weather", destination, days.length],
    queryFn: async () => {
      const r = await fetch("/api/itinerary-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days }),
      });
      if (!r.ok) throw new Error("weather failed");
      return (await r.json()) as WeatherResponse;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: destination.length > 0 && days.length > 0,
  });
}

function ConditionIcon({ condition, className = "h-5 w-5" }: { condition: string; className?: string }) {
  if (/Schnee/.test(condition)) return <CloudSnow className={className} />;
  if (/Regen|Niesel|Gewitter/.test(condition)) return <CloudRain className={className} />;
  if (/Klar|Sonnig/i.test(condition)) return <Sun className={className} />;
  if (/sonnig/i.test(condition)) return <CloudSun className={className} />;
  if (/Nebel|Bewölkt|Wechselhaft|Saison/.test(condition)) return <Cloud className={className} />;
  return <CloudSun className={className} />;
}

function useDateFormatters() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || "de") === "en" ? "en-US" : "de-DE";
  return {
    formatDate(iso: string) {
      try {
        return new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
      } catch {
        return iso;
      }
    },
    formatTime(iso: string) {
      try {
        return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
      } catch {
        return iso;
      }
    },
  };
}

export function DayWeatherToggle({
  day,
  data,
  isLoading,
  isError,
  onRefresh,
  isRefreshing,
  generatedAt,
}: {
  day: WeatherDay | undefined;
  data?: WeatherResponse;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  generatedAt?: string;
}) {
  const { t } = useTranslation();
  const { formatDate, formatTime } = useDateFormatters();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
      >
        <Cloud className="h-3 w-3 animate-pulse" /> Wetter lädt…
      </button>
    );
  }
  if (isError || !day) {
    return (
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40"
      >
        <RefreshCw className="h-3 w-3" /> Wetter erneut laden
      </button>
    );
  }

  const w = day.weather;
  const isEstimate = w.source === "seasonal";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          open
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/40"
        }`}
        aria-expanded={open}
      >
        <ConditionIcon condition={w.condition} className="h-3.5 w-3.5" />
        <span>
          🌤 Wetter · {w.temperatureMin}°/{w.temperatureMax}°
        </span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isEstimate ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                }`}
              >
                <ConditionIcon condition={w.condition} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Tag {day.day} — {formatDate(day.date)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isEstimate
                        ? "bg-amber-100 text-amber-800"
                        : w.source === "current"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {w.label}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{day.placeName}</div>
                <div className="mt-1 text-sm font-medium text-foreground">{w.condition}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Thermometer} label="Temp." value={`${w.temperatureMin}° – ${w.temperatureMax}°C`} />
            <Stat icon={Droplets} label="Regen" value={`${w.rainChance}%`} />
            <Stat icon={Wind} label="Wind" value={w.windSpeed != null ? `${w.windSpeed} km/h` : "–"} />
            <Stat icon={Sparkles} label="Quelle" value={isEstimate ? "Saisonal" : "Live"} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-secondary/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Kleidungs-Tipp
              </div>
              <div className="mt-1 text-sm text-foreground">{w.clothing.join(", ")}</div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reise-Tipp
              </div>
              <div className="mt-1 text-sm text-foreground">{w.travelTip}</div>
            </div>
          </div>

          <div
            className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-xs ${
              isEstimate ? "bg-amber-50 text-amber-900" : "bg-sky-50 text-sky-900"
            }`}
          >
            {isEstimate ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <div className="font-semibold">
                {isEstimate ? "Saisonale Schätzung für diesen Reisetag" : "Live-Vorhersage für diesen Reisetag"}
              </div>
              <div>{w.disclaimer}</div>
              <div className="mt-1 text-[11px] opacity-80">
                Quelle: {w.reference}
                {!isEstimate && generatedAt ? ` · Zuletzt aktualisiert: ${formatTime(generatedAt)}` : ""}
                {isEstimate ? " · Hinweis: keine exakte Vorhersage" : ""}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} /> Aktualisieren
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
