import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  destination: z.string().min(1).max(200),
  travelStartDate: z.string().optional(), // ISO date YYYY-MM-DD
  travelEndDate: z.string().optional(),
});

export type WeatherDay = {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  conditionIcon: string;
  rainChance: number;
};

export type WeatherResult =
  | {
      error: string;
    }
  | {
      location: { name: string; country: string };
      current: {
        temperature: number;
        unit: "°C";
        condition: string;
        conditionIcon: string;
        rainChance: number;
        windSpeed: number;
        windUnit: "km/h";
        humidity: number;
        summary: string;
        lastUpdated: string;
      };
      trip: {
        source: "forecast" | "seasonal";
        label: string;
        days: WeatherDay[];
        clothing: string[];
        travelTip: string;
      };
    };

// WMO weather codes → DE label + lucide icon name
function wmoToLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Sonnig", icon: "Sun" };
  if (code <= 2) return { label: "Überwiegend sonnig", icon: "CloudSun" };
  if (code === 3) return { label: "Bewölkt", icon: "Cloud" };
  if (code === 45 || code === 48) return { label: "Nebel", icon: "CloudFog" };
  if (code >= 51 && code <= 57) return { label: "Nieselregen", icon: "CloudDrizzle" };
  if (code >= 61 && code <= 67) return { label: "Regen", icon: "CloudRain" };
  if (code >= 71 && code <= 77) return { label: "Schnee", icon: "CloudSnow" };
  if (code >= 80 && code <= 82) return { label: "Regenschauer", icon: "CloudRain" };
  if (code >= 85 && code <= 86) return { label: "Schneeschauer", icon: "CloudSnow" };
  if (code >= 95) return { label: "Gewitter", icon: "CloudLightning" };
  return { label: "Wechselhaft", icon: "Cloud" };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}
function monthNameDE(iso: string): string {
  const m = new Date(iso + "T00:00:00Z").getUTCMonth();
  return [
    "Januar","Februar","März","April","Mai","Juni",
    "Juli","August","September","Oktober","November","Dezember",
  ][m];
}

async function geocodeOnce(query: string, language: "de" | "en") {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${language}&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string; country: string; timezone: string }>;
  };
  return data.results?.[0] ?? null;
}

async function geocode(destination: string) {
  // Build a list of candidate queries — strip parenthetical, take parts before/after comma,
  // remove leading emojis/symbols, fall back to first significant word.
  const cleaned = destination
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  const parts = cleaned.split(/[,/|–-]/).map((p) => p.trim()).filter(Boolean);
  const candidates = Array.from(
    new Set(
      [
        cleaned,
        ...parts,
        parts[0]?.split(/\s+/)[0] ?? "",
      ].filter((s) => s && s.length >= 2),
    ),
  );
  for (const lang of ["de", "en"] as const) {
    for (const q of candidates) {
      const r = await geocodeOnce(q, lang);
      if (r) return r;
    }
  }
  throw new Error("Ort nicht gefunden");
}

async function fetchForecast(lat: number, lon: number, timezone: string) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,weather_code,precipitation,wind_speed_10m,relative_humidity_2m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "16",
    timezone,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error("Wetterdienst nicht erreichbar");
  return (await res.json()) as {
    current: {
      temperature_2m: number;
      weather_code: number;
      wind_speed_10m: number;
      relative_humidity_2m: number;
      precipitation: number;
    };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
    };
  };
}

type AiEnrichment = {
  clothing: string[];
  travelTip: string;
  seasonalDays?: WeatherDay[];
};

async function aiEnrich(
  destination: string,
  current: { temp: number; condition: string },
  trip:
    | { source: "forecast"; days: WeatherDay[] }
    | { source: "seasonal"; month: string; startDate: string; endDate: string },
): Promise<AiEnrichment> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { clothing: [], travelTip: "" };

  const tripContext =
    trip.source === "forecast"
      ? `Reisedaten-Vorhersage:\n${trip.days
          .map((d) => `${d.date}: ${d.tempMin}-${d.tempMax}°C, ${d.condition}, Regen ${d.rainChance}%`)
          .join("\n")}`
      : `Keine genaue Vorhersage verfügbar. Erstelle eine SAISONALE Schätzung für ${destination} im ${trip.month} (Zeitraum ${trip.startDate} bis ${trip.endDate}). Gib pro Tag realistische Klimawerte zurück.`;

  const sys =
    "Du bist ein Reise-Wetter-Assistent. Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown, ohne Code-Fences, ohne Erklärungen.";

  const userPrompt =
    trip.source === "forecast"
      ? `Reiseziel: ${destination}\nAktuelles Wetter: ${current.temp}°C, ${current.condition}\n${tripContext}\n\nGib JSON zurück mit dieser Form:\n{\n  "clothing": ["3-5 kurze deutsche Kleidungsempfehlungen für diese Reise"],\n  "travelTip": "Ein konkreter deutscher Reise-Tipp (1 Satz) basierend auf dem Wetter"\n}`
      : `Reiseziel: ${destination}\nAktuelles Wetter: ${current.temp}°C, ${current.condition}\n${tripContext}\n\nGib JSON zurück mit dieser Form:\n{\n  "seasonalDays": [\n    { "date": "YYYY-MM-DD", "tempMin": number, "tempMax": number, "condition": "deutsches Label wie Sonnig/Bewölkt/Regen/Gewitter/Schnee/Wechselhaft", "rainChance": 0-100 }\n  ],\n  "clothing": ["3-5 kurze deutsche Kleidungsempfehlungen"],\n  "travelTip": "Ein konkreter deutscher Reise-Tipp (1 Satz)"\n}\nGenau ein seasonalDays-Eintrag pro Tag im Reisezeitraum.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { clothing: [], travelTip: "" };
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { clothing: [], travelTip: "" };
    const parsed = JSON.parse(content) as {
      clothing?: string[];
      travelTip?: string;
      seasonalDays?: Array<{ date: string; tempMin: number; tempMax: number; condition: string; rainChance: number }>;
    };
    const seasonalDays: WeatherDay[] | undefined = parsed.seasonalDays?.map((d) => {
      // map condition string → icon
      const lower = d.condition.toLowerCase();
      let icon = "Cloud";
      if (lower.includes("sonn")) icon = "Sun";
      else if (lower.includes("regen") || lower.includes("schauer")) icon = "CloudRain";
      else if (lower.includes("schnee")) icon = "CloudSnow";
      else if (lower.includes("gewitter")) icon = "CloudLightning";
      else if (lower.includes("nebel")) icon = "CloudFog";
      else if (lower.includes("wolk") || lower.includes("bewölkt")) icon = "Cloud";
      return {
        date: d.date,
        tempMin: Math.round(d.tempMin),
        tempMax: Math.round(d.tempMax),
        condition: d.condition,
        conditionIcon: icon,
        rainChance: Math.max(0, Math.min(100, Math.round(d.rainChance))),
      };
    });
    return {
      clothing: Array.isArray(parsed.clothing) ? parsed.clothing.slice(0, 6) : [],
      travelTip: typeof parsed.travelTip === "string" ? parsed.travelTip : "",
      seasonalDays,
    };
  } catch {
    return { clothing: [], travelTip: "" };
  }
}

export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<WeatherResult> => {
    try {
      const geo = await geocode(data.destination);
      const forecast = await fetchForecast(geo.latitude, geo.longitude, geo.timezone);

      const curCode = forecast.current.weather_code;
      const curMeta = wmoToLabel(curCode);
      const curTemp = Math.round(forecast.current.temperature_2m);

      const today = todayISO();
      // Default travel window: today+30 .. today+30+7
      const travelStart = data.travelStartDate ?? addDaysISO(today, 30);
      const travelEnd =
        data.travelEndDate ??
        (data.travelStartDate ? data.travelStartDate : addDaysISO(travelStart, 6));

      const startOffset = diffDays(today, travelStart);
      const endOffset = diffDays(today, travelEnd);

      type TripBlock = {
        source: "forecast" | "seasonal";
        label: string;
        days: WeatherDay[];
        clothing: string[];
        travelTip: string;
      };
      let trip: TripBlock;
      let aiTripCtx:
        | { source: "forecast"; days: WeatherDay[] }
        | { source: "seasonal"; month: string; startDate: string; endDate: string };


      const tripWithinForecast = startOffset >= 0 && startOffset <= 15;

      if (tripWithinForecast) {
        const days: WeatherDay[] = [];
        for (let i = 0; i < forecast.daily.time.length; i++) {
          const date = forecast.daily.time[i];
          const off = diffDays(today, date);
          if (off >= startOffset && off <= endOffset) {
            const m = wmoToLabel(forecast.daily.weather_code[i]);
            days.push({
              date,
              tempMin: Math.round(forecast.daily.temperature_2m_min[i]),
              tempMax: Math.round(forecast.daily.temperature_2m_max[i]),
              condition: m.label,
              conditionIcon: m.icon,
              rainChance: Math.round(forecast.daily.precipitation_probability_max[i] ?? 0),
            });
          }
        }
        aiTripCtx = { source: "forecast", days };
        const enrichment = await aiEnrich(
          geo.name,
          { temp: curTemp, condition: curMeta.label },
          aiTripCtx,
        );
        trip = {
          source: "forecast",
          label: "Live-Vorhersage für deine Reise",
          days,
          clothing: enrichment.clothing,
          travelTip: enrichment.travelTip,
        };
      } else {
        aiTripCtx = {
          source: "seasonal",
          month: monthNameDE(travelStart),
          startDate: travelStart,
          endDate: travelEnd,
        };
        const enrichment = await aiEnrich(
          geo.name,
          { temp: curTemp, condition: curMeta.label },
          aiTripCtx,
        );
        trip = {
          source: "seasonal",
          label: "Saisonale Schätzung — genaue Vorhersage noch nicht verfügbar",
          days: enrichment.seasonalDays ?? [],
          clothing: enrichment.clothing,
          travelTip: enrichment.travelTip,
        };
      }

      return {
        location: { name: geo.name, country: geo.country },
        current: {
          temperature: curTemp,
          unit: "°C",
          condition: curMeta.label,
          conditionIcon: curMeta.icon,
          rainChance: Math.round((forecast.current.precipitation > 0 ? 80 : 0)),
          windSpeed: Math.round(forecast.current.wind_speed_10m),
          windUnit: "km/h",
          humidity: Math.round(forecast.current.relative_humidity_2m),
          summary: `Wetter heute in ${geo.name}: ${curTemp}°C, ${curMeta.label.toLowerCase()}.`,
          lastUpdated: new Date().toISOString(),
        },
        trip,
      };
    } catch (err) {
      console.error("[weather] failed", err);
      return {
        error:
          err instanceof Error ? err.message : "Wetterdaten momentan nicht verfügbar.",
      };
    }
  });
