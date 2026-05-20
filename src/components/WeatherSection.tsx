import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  RefreshCw,
  Shirt,
  Sun,
  Umbrella,
  Wind,
  Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeather, type WeatherResult } from "@/lib/weather.functions";

const ICONS: Record<string, typeof Sun> = {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudFog,
  CloudLightning,
};
function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Cloud;
  return <C className={className} />;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function formatDay(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function WeatherSection({
  destination,
  travelStartDate,
  travelEndDate,
}: {
  destination: string;
  duration?: string;
  travelStartDate?: string;
  travelEndDate?: string;
}) {
  const fetchWeather = useServerFn(getWeather);
  const query = useQuery<WeatherResult>({
    queryKey: ["weather", destination, travelStartDate ?? null, travelEndDate ?? null],
    queryFn: () =>
      fetchWeather({
        data: { destination, travelStartDate, travelEndDate },
      }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const isError = query.isError || (query.data && "error" in query.data);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Wetter für deine Reise</h2>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          Wetter aktualisieren
        </button>
      </div>

      {query.isPending && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      )}

      {isError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            Wetterdaten momentan nicht verfügbar.
            <button
              type="button"
              onClick={() => query.refetch()}
              className="ml-2 font-semibold text-primary hover:underline"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {query.data && !("error" in query.data) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Today card */}
          <div className="rounded-xl border border-border bg-secondary/30 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Heute am Reiseziel
            </div>
            <div className="mt-2 flex items-center gap-4">
              <Icon name={query.data.current.conditionIcon} className="h-14 w-14 text-primary" />
              <div>
                <div className="text-4xl font-extrabold text-foreground">
                  {query.data.current.temperature}
                  {query.data.current.unit}
                </div>
                <div className="text-sm text-muted-foreground">{query.data.current.condition}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <Stat
                icon={<Umbrella className="h-3.5 w-3.5" />}
                label="Regen"
                value={`${query.data.current.rainChance}%`}
              />
              <Stat
                icon={<Wind className="h-3.5 w-3.5" />}
                label="Wind"
                value={`${query.data.current.windSpeed} km/h`}
              />
              <Stat
                icon={<Droplets className="h-3.5 w-3.5" />}
                label="Luftfeucht."
                value={`${query.data.current.humidity}%`}
              />
            </div>
            <p className="mt-3 text-sm text-foreground/80">{query.data.current.summary}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Zuletzt aktualisiert: {formatTime(query.data.current.lastUpdated)} Uhr
            </p>
          </div>

          {/* Trip card */}
          <div className="rounded-xl border border-border bg-secondary/30 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Wetter während deiner Reise
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                  query.data.trip.source === "forecast"
                    ? "bg-tier-basic-soft text-tier-basic"
                    : "bg-tier-medium-soft text-tier-medium"
                }`}
              >
                {query.data.trip.source === "forecast" ? "LIVE-VORHERSAGE" : "SAISONAL"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{query.data.trip.label}</p>

            {query.data.trip.days.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {query.data.trip.days.map((d) => (
                  <div
                    key={d.date}
                    className="flex min-w-[88px] flex-col items-center rounded-lg border border-border bg-card p-2"
                  >
                    <div className="text-[11px] font-semibold text-foreground">{formatDay(d.date)}</div>
                    <Icon name={d.conditionIcon} className="my-1 h-6 w-6 text-primary" />
                    <div className="text-xs font-bold text-foreground">
                      {d.tempMax}° / {d.tempMin}°
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.rainChance}% 💧</div>
                  </div>
                ))}
              </div>
            )}

            {query.data.trip.clothing.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Shirt className="h-3.5 w-3.5" /> Kleidungstipp
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {query.data.trip.clothing.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground/80"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {query.data.trip.travelTip && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-xs text-foreground/80">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{query.data.trip.travelTip}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5 rounded-lg border border-border bg-card px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
