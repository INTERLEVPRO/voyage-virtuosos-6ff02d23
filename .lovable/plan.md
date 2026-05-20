# Wetter-Sektion — Live + Reisedaten + Auto-Update

Same as the previously approved plan. Re-confirming for build.

## Ziel
Auf der Paket-Detailseite zwei Wetter-Karten:
1. **Heute am Reiseziel** — Live von Open-Meteo (kostenlos, kein API-Key)
2. **Wetter während deiner Reise** — echte Vorhersage (≤ 16 Tage) oder saisonale KI-Schätzung mit klarem Label

Auto-Refresh beim Öffnen + bei Window-Focus, Cache 30 Min, manueller „Wetter aktualisieren"-Button.

## Datenquellen
- Open-Meteo Geocoding + Forecast API (current + daily, 16 Tage)
- Lovable AI (`google/gemini-2.5-flash`) nur für Kleidungstipp, Reise-Tipp, saisonale Schätzung

## Build-Schritte

### 1. `src/lib/weather.functions.ts` — neue Server-Funktion
- `createServerFn({ method: "POST" })`, kein Auth
- Input (Zod): `{ destination, travelStartDate?, travelEndDate? }`
- Flow: Geocoding → Open-Meteo Forecast → Current-Block + Trip-Block (forecast oder seasonal) → ein AI-Call für Kleidung/Tipp → DTO
- DTO: `{ location, current{temp, condition, icon, rainChance, wind, humidity, summary, lastUpdated}, trip{source:"forecast"|"seasonal", label, days[], clothing[], travelTip} }` oder `{ error }`
- WMO-Code → DE-Label + Lucide-Icon-Name (kleine Helper-Map)

### 2. `src/components/WeatherSection.tsx` — neue UI-Komponente
- `useQuery({ queryKey:["weather",destination,travelStartDate], queryFn:useServerFn(getWeather), staleTime:30min, refetchOnMount:true, refetchOnWindowFocus:true })`
- Header: H2 „Wetter für deine Reise" + Refresh-Button (`refetch`, Spinner via `isFetching`)
- Karte 1 „Heute am Reiseziel": Icon + Temp groß, Condition, Regen %, Wind, Luftfeuchtigkeit, Summary, „Zuletzt aktualisiert: HH:MM"
- Karte 2 „Wetter während deiner Reise": Badge (grün „Live-Vorhersage" / amber „Saisonale Schätzung — genaue Vorhersage noch nicht verfügbar"), Tages-Chips, Kleidungs-Chips, Reise-Tipp
- Skeleton-Loading, Error-Box mit Retry

### 3. `src/components/PackageDetail.tsx` — Integration
- Block direkt nach Hero-Bild, vor „Deine Reiseübersicht":
  `<WeatherSection destination={currentPkg.destination} duration={currentPkg.duration} />`
- Kein `travelStartDate` (Pakete haben kein festes Datum) → Komponente nimmt heute+30 Tage Default → trip-block fällt korrekt auf „seasonal"
- Nichts anderes ändern (Generation, Refine, Affiliate-Links, Maps, Mail bleiben unangetastet)

## Nicht im Scope
Datumsauswahl-UI, stündliche Vorhersage, Wetter-Radar, andere Sprachen, sonstige Features.
