## Goal
Travel assistant should accept **flexible / vague travel time answers** (e.g. "Sommer", "nächsten Monat", "Juli–August", "in 3 Monaten", "flexibel") and never force an exact calendar date.

## Changes

### 1. `src/routes/api/chat.ts` — Concierge prompt
Update `CONCIERGE_SYSTEM` so:
- The required field becomes **Reisezeitraum (flexibel erlaubt)** instead of an exact date.
- Example question phrasing: *"Wann möchtest du ungefähr reisen? Ein Monat, eine Saison oder ein grober Zeitraum reicht völlig — z. B. ‚im Juli', ‚nächsten Sommer', ‚in 2–3 Monaten' oder ‚flexibel'."*
- Explicit instruction: **Do NOT ask for an exact date.** Accept months, seasons, ranges, relative time ("nächstes Jahr"), or "flexibel".
- Treat any of those as a satisfied answer for the travel-time slot.

### 2. `isPlanningRequest` heuristic (same file)
Currently only checks budget + destination/type. Keep as is — date is not required to trigger planning, so vague dates won't block the flow.

### 3. Packager prompt
Add one line to `PACKAGER_SYSTEM`: if the user gave only a season/month/range, pick a reasonable specific travel month within that window for itinerary realism, but keep the package `duration` purely in days (no fixed start date shown to user).

### 4. Itinerary weather route (`itinerary-weather.ts`)
No prompt change needed — it already accepts an optional `startDate` and falls back to seasonal estimates when no forecast is available. Flexible input keeps working.

## Out of scope
- No new UI / date-picker component.
- No DB schema changes.
- No changes to other agents (research, refine, weather logic).

Result: user can answer the "when" question casually in natural German, and the concierge moves forward without nagging for a precise date.