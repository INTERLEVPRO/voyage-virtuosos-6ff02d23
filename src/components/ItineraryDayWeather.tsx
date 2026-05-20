import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Umbrella,
} from "lucide-react";
import { getWeather, type WeatherResult, type WeatherDay } from "@/lib/weather.functions";

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

function addDaysISO(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useItineraryWeather(destination: string, numDays: number) {
  const fetchWeather = useServerFn(getWeather);
  const start = addDaysISO(0);
  const end = addDaysISO(Math.max(0, numDays - 1));
  return useQuery<WeatherResult>({
    queryKey: ["itinerary-weather", destination, numDays],
    queryFn: () =>
      fetchWeather({ data: { destination, travelStartDate: start, travelEndDate: end } }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function DayWeatherChip({
  dayIndex,
  data,
  isLoading,
}: {
  dayIndex: number;
  data?: WeatherDay;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
        <Cloud className="h-3.5 w-3.5 animate-pulse" /> …
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={`Wetter Tag ${dayIndex + 1}: ${data.condition}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5"
      >
        <Icon name={data.conditionIcon} className="h-4 w-4 text-primary" />
        <span className="font-semibold">
          {data.tempMax}° / {data.tempMin}°
        </span>
        <span className="text-muted-foreground">{data.condition}</span>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-card p-3 text-xs shadow-card">
          <div className="flex items-center gap-3">
            <Icon name={data.conditionIcon} className="h-8 w-8 text-primary" />
            <div>
              <div className="text-base font-bold text-foreground">
                {data.tempMax}° / {data.tempMin}°C
              </div>
              <div className="text-muted-foreground">{data.condition}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-foreground/80">
            <span className="inline-flex items-center gap-1">
              <Umbrella className="h-3.5 w-3.5 text-primary" /> Regen {data.rainChance}%
            </span>
            <span className="inline-flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-primary" /> {data.date}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
