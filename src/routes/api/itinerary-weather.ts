import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createOpenAIProvider } from "@/lib/openai-provider";

const requestSchema = z.object({
  destination: z.string().min(1).max(200),
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(60),
        title: z.string().max(200).optional(),
        date: z.string().optional(),
      }),
    )
    .min(1)
    .max(60),
  startDate: z.string().optional(),
});

export type WeatherDay = {
  day: number;
  date: string;
  placeName: string;
  weather: {
    source: "forecast" | "seasonal" | "current";
    label: string;
    temperatureMin: number;
    temperatureMax: number;
    condition: string;
    rainChance: number;
    windSpeed: number | null;
    clothing: string[];
    travelTip: string;
    reference: string;
    disclaimer: string;
  };
};

export type WeatherResponse = {
  destination: string;
  resolvedPlace: string;
  generatedAt: string;
  days: WeatherDay[];
};

// --- WMO weather code → German condition ---------------------------------
function wmoToCondition(code: number): string {
  if (code === 0) return "Klar";
  if ([1, 2].includes(code)) return "Überwiegend sonnig";
  if (code === 3) return "Bewölkt";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return "Nieselregen";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wechselhaft";
}

function clothingFor(tempMax: number, rainChance: number, condition: string): string[] {
  const items: string[] = [];
  if (tempMax >= 27) items.push("Leichte Kleidung", "Sonnenhut", "Sonnencreme");
  else if (tempMax >= 20) items.push("T-Shirt", "Leichte Jacke für abends");
  else if (tempMax >= 12) items.push("Pullover", "Jacke");
  else items.push("Warme Jacke", "Mütze");
  if (rainChance >= 40 || /Regen|Niesel|Gewitter/.test(condition)) items.push("Regenjacke oder Schirm");
  return items;
}

function tipFor(tempMax: number, rainChance: number, condition: string): string {
  if (/Gewitter/.test(condition)) return "Plane Innen-Aktivitäten für den Nachmittag ein, Gewitter möglich.";
  if (rainChance >= 50) return "Halte einen flexiblen Plan bereit, hohe Regenwahrscheinlichkeit.";
  if (tempMax >= 30) return "Aktivitäten am Vormittag oder späten Nachmittag, mittags ist es sehr heiß.";
  if (tempMax <= 8) return "Warm anziehen — denke an Zwiebellook für draußen.";
  return "Gute Bedingungen für Outdoor-Aktivitäten — genieße den Tag.";
}

// --- Geocoding -----------------------------------------------------------
async function geocode(destination: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const clean = destination
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  const parts = clean.split(/[,/–-]/).map((p) => p.trim()).filter(Boolean);
  const candidates = Array.from(new Set([clean, ...parts, parts[0]?.split(/\s+/)[0] ?? ""])).filter(Boolean);
  for (const q of candidates) {
    for (const lang of ["de", "en"]) {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=${lang}&format=json`;
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) continue;
        const data = (await r.json()) as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string }> };
        const hit = data.results?.[0];
        if (hit) return { lat: hit.latitude, lon: hit.longitude, name: hit.country ? `${hit.name}, ${hit.country}` : hit.name };
      } catch {
        // continue
      }
    }
  }
  return null;
}

// --- Forecast ------------------------------------------------------------
type ForecastByDate = Record<string, { tMin: number; tMax: number; code: number; rain: number; wind: number }>;

async function fetchForecast(lat: number, lon: number): Promise<ForecastByDate> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max&timezone=auto&forecast_days=16`;
  let r: Response;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  } catch {
    return {};
  }
  if (!r.ok) return {};
  const data = (await r.json()) as {
    daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weathercode: number[];
      precipitation_probability_max: (number | null)[];
      windspeed_10m_max: number[];
    };
  };
  const out: ForecastByDate = {};
  const d = data.daily;
  if (!d) return out;
  for (let i = 0; i < d.time.length; i++) {
    out[d.time[i]] = {
      tMin: Math.round(d.temperature_2m_min[i]),
      tMax: Math.round(d.temperature_2m_max[i]),
      code: d.weathercode[i],
      rain: Math.round(d.precipitation_probability_max[i] ?? 0),
      wind: Math.round(d.windspeed_10m_max[i]),
    };
  }
  return out;
}

// --- Seasonal AI estimate ------------------------------------------------
const seasonalSchema = z.object({
  days: z.array(
    z.object({
      day: z.number(),
      tempMin: z.number(),
      tempMax: z.number(),
      condition: z.string(),
      rainChance: z.number().min(0).max(100),
      windSpeed: z.number().nullable().optional(),
      reason: z.string(),
    }),
  ),
});

async function seasonalEstimate(
  destination: string,
  days: Array<{ day: number; date: string }>,
): Promise<Record<number, z.infer<typeof seasonalSchema>["days"][number]> | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const openai = createOpenAIProvider(key);
  const model = openai("google/gemini-3-flash-preview");
  const prompt = `Schätze das typische saisonale Wetter (KEINE exakte Vorhersage) für folgende Reisetage in ${destination}.
Nutze typische Klimadaten für den jeweiligen Monat.
Gib für jeden Tag eine kurze Begründung (1 Satz, deutsch), basierend auf typischem Saisonklima.
Antworte AUSSCHLIESSLICH als JSON in dieser Form:
{"days":[{"day":1,"tempMin":22,"tempMax":29,"condition":"Sonnig","rainChance":10,"windSpeed":12,"reason":"Im Juli ist Mallorca typischerweise heiß und trocken."}]}

Tage:
${days.map((d) => `- Tag ${d.day} (${d.date})`).join("\n")}`;
  try {
    const { text } = await generateText({ model, prompt });
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = seasonalSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) return null;
    const map: Record<number, z.infer<typeof seasonalSchema>["days"][number]> = {};
    for (const d of parsed.data.days) map[d.day] = d;
    return map;
  } catch {
    return null;
  }
}

// --- Route ---------------------------------------------------------------
export const Route = createFileRoute("/api/itinerary-weather")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
        }
        const { destination, days, startDate } = parsed.data;

        // Compute dates (use startDate or today)
        const baseDate = startDate ? new Date(startDate) : new Date();
        baseDate.setHours(12, 0, 0, 0);
        const resolvedDays = days.map((d) => {
          const date =
            d.date ??
            (() => {
              const dt = new Date(baseDate);
              dt.setDate(dt.getDate() + (d.day - 1));
              return dt.toISOString().slice(0, 10);
            })();
          return { ...d, date };
        });

        const geo = await geocode(destination);
        const placeName = geo?.name ?? destination;

        // Fetch forecast if geocoded
        const forecast: ForecastByDate = geo ? await fetchForecast(geo.lat, geo.lon) : {};
        const forecastDates = new Set(Object.keys(forecast));

        // Split: which days need seasonal
        const seasonalNeeded = resolvedDays.filter((d) => !forecastDates.has(d.date));
        const seasonalMap = seasonalNeeded.length > 0 ? await seasonalEstimate(destination, seasonalNeeded) : {};

        const generatedAt = new Date().toISOString();
        const today = new Date().toISOString().slice(0, 10);

        const out: WeatherDay[] = resolvedDays.map((d) => {
          const f = forecast[d.date];
          if (f) {
            const condition = wmoToCondition(f.code);
            const isToday = d.date === today;
            return {
              day: d.day,
              date: d.date,
              placeName,
              weather: {
                source: isToday ? "current" : "forecast",
                label: isToday ? "Aktuelles Wetter" : "Live-Vorhersage",
                temperatureMin: f.tMin,
                temperatureMax: f.tMax,
                condition,
                rainChance: f.rain,
                windSpeed: f.wind,
                clothing: clothingFor(f.tMax, f.rain, condition),
                travelTip: tipFor(f.tMax, f.rain, condition),
                reference: "Open-Meteo Forecast API",
                disclaimer: "Das tatsächliche Wetter kann abweichen.",
              },
            };
          }
          const s = seasonalMap?.[d.day];
          const tMin = s?.tempMin ?? 18;
          const tMax = s?.tempMax ?? 26;
          const condition = s?.condition ?? "Saisontypisch";
          const rain = s?.rainChance ?? 20;
          return {
            day: d.day,
            date: d.date,
            placeName,
            weather: {
              source: "seasonal",
              label: "Saisonale Schätzung",
              temperatureMin: tMin,
              temperatureMax: tMax,
              condition,
              rainChance: rain,
              windSpeed: s?.windSpeed ?? null,
              clothing: clothingFor(tMax, rain, condition),
              travelTip:
                s?.reason ??
                `Diese Einschätzung basiert auf typischen saisonalen Wetterbedingungen für ${placeName}. Sie ist keine exakte Vorhersage.`,
              reference: "Saisonale Klimadaten + KI-Schätzung",
              disclaimer: "Dies ist eine Schätzung, keine exakte Wettervorhersage.",
            },
          };
        });

        return Response.json({
          destination,
          resolvedPlace: placeName,
          generatedAt,
          days: out,
        } satisfies WeatherResponse);
      },
    },
  },
});
