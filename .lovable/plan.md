# Wetter-Sektion v2 — Live-Wetter + Reisedaten-Vorhersage

## Ziel
Auf der Paket-Detailseite zwei Wetter-Karten anzeigen:
1. **Heute am Reiseziel** — Live-Wetter von Open-Meteo (kostenlos, kein API-Key)
2. **Wetter während deiner Reise** — echte Tagesvorhersage (falls Reisedaten ≤ 16 Tage entfernt) oder saisonale KI-Schätzung mit klarer Kennzeichnung

Auto-Update beim Öffnen, kurzer Cache (30–60 Min), manueller Refresh-Button.

## Datenquellen
- **Open-Meteo Geocoding API** (`https://geocoding-api.open-meteo.com/v1/search`) — Destination-String → Lat/Lon
- **Open-Meteo Forecast API** (`https://api.open-meteo.com/v1/forecast`) — aktuelles Wetter + Tagesvorhersage bis 16 Tage
- **Lovable AI** (`google/gemini-2.5-flash`) — nur für: Kleidungstipps, Reise-Tipps, saisonale Schätzung (wenn Reise > 16 Tage entfernt)

Keine API-Keys nötig.

## Was wird gebaut

### 1. Server-Funktion `src/lib/weather.functions.ts`

**`getWeather`** — `createServerFn({ method: "POST" })`, kein Auth
- Input (Zod): `{ destination: string, travelStartDate?: string (ISO), travelEndDate?: string (ISO) }`
- Falls keine Reisedaten geliefert: Default = heute + 30 Tage, Dauer aus `pkg.duration` ableitbar später
- Ablauf:
  1. Geocoding: Destination → `{ lat, lon, name, country, timezone }`
  2. Open-Meteo Forecast holen (current + daily für 16 Tage):
     - `current=temperature_2m,weather_code,precipitation,wind_speed_10m,relative_humidity_2m`
     - `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max`
     - `forecast_days=16`, `timezone=auto`
  3. **Current-Block** bauen: temp, condition (WMO-Code → DE-Label), regenChance, wind, lastUpdated (server now ISO)
  4. **Trip-Block**:
     - Wenn `travelStartDate` innerhalb der nächsten 16 Tage → echte Tagesdaten extrahieren (`source: "forecast"`)
     - Sonst → Lovable AI Call (JSON-Tool) für saisonale Schätzung für den Reisemonat (`source: "seasonal"`)
  5. **AI-Anreicherung** (ein Call, beide Blöcke gemeinsam): Kleidungstipps + Reise-Tipp für aktuelle + Reisewetter-Bedingungen
  6. Return DTO:
     ```ts
     {
       location: { name, country };
       current: {
         temperature: number; unit: "°C";
         condition: string;          // "Sonnig", "Bewölkt", ...
         conditionIcon: string;      // lucide-Name: "Sun" | "Cloud" | "CloudRain" | ...
         rainChance: number;         // 0-100
         windSpeed: number; windUnit: "km/h";
         humidity: number;
         summary: string;            // "Wetter heute in Mallorca: 26°C, sonnig …"
         lastUpdated: string;        // ISO
       };
       trip: {
         source: "forecast" | "seasonal";
         label: string;              // forecast: "Vorhersage für deine Reise" | seasonal: "Saisonale Schätzung — genaue Vorhersage noch nicht verfügbar"
         days: Array<{
           date: string;             // ISO date
           tempMin: number; tempMax: number;
           condition: string; conditionIcon: string;
           rainChance: number;
         }>;
         clothing: string[];         // ["Leichte Sommerkleidung", "Sonnenhut", "Badesachen"]
         travelTip: string;
       };
     }
     ```
- Fehlerpfade: Geocoding fehlgeschlagen → return `{ error: "Ort nicht gefunden" }`; AI-Fehler → Trip-Block ohne Kleidung/Tipp; Open-Meteo down → return `{ error }`
- WMO-Code-Mapper (kleine Helper-Map) → deutsches Label + Lucide-Icon-Name

### 2. UI-Komponente `src/components/WeatherSection.tsx`

**Props**: `destination: string`, `duration: string`, optional `travelStartDate?, travelEndDate?`

**Data-Fetching**: TanStack Query
- `queryKey: ["weather", destination, travelStartDate]`
- `queryFn: () => getWeather({ data: { destination, travelStartDate, travelEndDate } })`
- `staleTime: 30 * 60 * 1000` (30 Min — kürzer als „Session-only")
- `gcTime: 60 * 60 * 1000`
- `refetchOnWindowFocus: true`, `refetchOnMount: true` → Auto-Update beim Öffnen
- `useServerFn(getWeather)` für korrekte RPC-Bindung

**Layout** (zwei Karten in Grid, mobil gestackt):
- **Section-Header**: H2 „Wetter für deine Reise" + Refresh-Button rechts (`refetch()` aus useQuery, mit Spinner während `isFetching`)
- **Karte 1 — „Heute am Reiseziel"**:
  - Großes Icon (Lucide aus DTO) + Temperatur
  - Condition-Label
  - Reihe mit: 💧 Regen %, 💨 Wind km/h, 💧 Luftfeuchtigkeit
  - Summary-Satz
  - Footer: „Zuletzt aktualisiert: {HH:MM} Uhr"
- **Karte 2 — „Wetter während deiner Reise"**:
  - Badge oben: forecast → grün „Live-Vorhersage" / seasonal → amber „Saisonale Schätzung — genaue Vorhersage noch nicht verfügbar"
  - Horizontal scrollbare Tages-Chips (Datum, Icon, min/max, Regen %)
  - Kleidungs-Chips
  - Reise-Tipp in Hinweis-Box
- **Loading**: Skeleton-Versionen beider Karten (Skeleton-Komponente schon vorhanden)
- **Error**: kompakte Info-Box „Wetterdaten momentan nicht verfügbar" + Retry-Button (`refetch`)

### 3. Integration in `src/components/PackageDetail.tsx`
- Neuen Block direkt nach dem Hero-Bild (vor „Deine Reiseübersicht"):
  ```tsx
  <WeatherSection destination={currentPkg.destination} duration={currentPkg.duration} />
  ```
- Da Pakete kein konkretes Reisedatum tragen, vorerst kein `travelStartDate` übergeben — Komponente nimmt heute+30 Tage als Default-Reisefenster. Sobald später Datum-Auswahl kommt, kann es nachgeschoben werden.
- **Nichts anderes ändern**: Package Generation, Refine-Flow, Affiliate-Links, Maps-Links, Mail-Button bleiben wie sie sind.

## Technische Details
- TanStack Query ist bereits konfiguriert (siehe `__root.tsx` QueryClientProvider) — `useQuery` direkt verwendbar
- `LOVABLE_API_KEY` als Runtime-Secret bereits vorhanden, nur im Handler via `process.env.LOVABLE_API_KEY` lesen
- Server-Worker-Runtime: nur `fetch` nötig — Open-Meteo + Lovable Gateway sind beide HTTPS-fetch-kompatibel
- WMO-Codes: kleine statische Map (0=Klar, 1-3=Wolken, 45/48=Nebel, 51-67=Regen, 71-77=Schnee, 80-82=Schauer, 95-99=Gewitter) → DE-Label + Lucide-Icon-Name
- JSON-Schema-Tool-Call beim AI-Call für garantiert valide Struktur

## Nicht im Scope
- Datumsauswahl-UI für Reisetermin (kommt evtl. später, dann wird `travelStartDate` durchgereicht)
- Stündliche Vorhersage
- Wetter-Karte/Radar
- Mehrsprachigkeit der Condition-Labels (nur DE)
- Änderungen an Paketerzeugung, Refinement, Affiliate-Links, Maps, Mail
