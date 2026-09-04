# API Documentation

All endpoints are TanStack Start server routes under `src/routes/api/`. None of them require authentication — no auth middleware is applied to any API route in the current project.

---

## POST /api/chat
File: `src/routes/api/chat.ts`

**Purpose:** Main planning endpoint. Extracts trip fields from the conversation, asks follow-up questions when fields are missing, and — when the brief is complete — generates 3 travel packages, persists them and streams the reply.

**Auth:** none.

**Request body:** JSON containing the UI message history (as produced by `ChatPanel.tsx`).

**Response:** a streamed text response (`createTextStreamResponse`). Two possible shapes:
1. A German follow-up question / confirmation text (missing destination, origin, duration, budget, travelers, timeframe, interests). Minimum budget is `MIN_BUDGET_EUR = 100`.
2. A short German intro text followed by a fenced JSON block:
```json
{ "status": "packages_ready", "tripRequestId": "uuid|undefined", "packages": [ /* 3 TravelPackage objects */ ] }
```

**Processing:** deterministic extraction helpers (`extractRouteParts`, `parseBudgetValue`, `extractInterests`, `extractTravelMonth`, `extractDateRangeString`, …) → two parallel AI calls (`RESEARCH_SYSTEM`, `ITINERARY_SYSTEM`) each wrapped in `withTimeout(..., 12_000)` and only for durations ≤ 14 days → `buildPackagesFromResearch` → `packageSchema.safeParse` → tier assignment (`TIER_ORDER`) → optional ratings via `fetchPackageRatings` (hard 5 s race) → insert into `trip_requests` + `packages`.

**Errors:** `502` with a German message if no package passes schema validation. DB persistence failures are non-fatal (caught and ignored).

**Frontend usage:** `src/components/ChatPanel.tsx` (custom `fetch`-based streaming client, not `useChat`).

---

## POST /api/refine-package
File: `src/routes/api/refine-package.ts`

**Purpose:** Refine one existing package from a German change request.

**Auth:** none.

**Request body (Zod validated):**
```ts
{
  selectedPackage: Package & { id?: string; bookingLinks?: { hotel?, flight?, activities? } },
  changeRequest: string,           // 1..2000 chars
  userConfirmedBudget?: boolean,   // default false
  tripBrief?: string               // max 4000 chars
}
```

**Responses:**
| status | Meaning |
|---|---|
| `rejected` | change request matches a "regenerate all packages" pattern; user is told to start a new chat |
| `needs_confirmation` | price difference ≥ `PRICE_THRESHOLD` (30 €) and not yet confirmed; returns `proposedPackage`, `oldPrice`, `newPrice`, `priceDifference`, `changeSummary` |
| `updated` | returns `updatedPackage` and `changeSummary`; persists to `packages` when the id is a UUID |
| `error` | `400` invalid request, `500` AI backend unavailable, `502` generation/schema failure |

**Frontend usage:** `RefineComposer.tsx` + `PriceConfirmation.tsx`, driven from `PackageDetail.tsx`.

---

## POST /api/itinerary-weather
File: `src/routes/api/itinerary-weather.ts`

**Purpose:** Per-day weather expectation for an itinerary.

**Auth:** none.

**Request body (Zod validated):**
```ts
{
  destination: string,                                  // 1..200
  days: Array<{ day: 1..60, title?: string, date?: string }>,  // 1..60 entries
  startDate?: string
}
```

**Response (`WeatherResponse`):**
```ts
{
  destination, resolvedPlace, generatedAt,
  days: Array<{ day, date, placeName, weather: {
    source: "forecast"|"seasonal"|"current",
    label, temperatureMin, temperatureMax, condition,
    rainChance, windSpeed, clothing[], travelTip, reference, disclaimer
  }}>
}
```
Conditions are mapped from WMO weather codes to German labels (`wmoToCondition`).

**External calls:** Open-Meteo geocoding + forecast; the AI backend (`resolveAiBackend`) is used for the textual tips.

**Frontend usage:** `DayWeatherPanel.tsx`.

---

## POST /api/track-click
File: `src/routes/api/track-click.ts`

**Purpose:** Log an affiliate outbound click.

**Auth:** none.

**Request body (Zod validated):**
```ts
{ packageId?: string (1..64), provider: string (1..32), url: string (valid URL, max 2048) }
```

**Response:** `{ "ok": true }`. `400` for invalid JSON/payload. `package_id` is only stored when it looks like a UUID, otherwise `null`.

---

## GET /sitemap.xml
File: `src/routes/sitemap[.]xml.ts`. Returns an XML sitemap for `https://weltweiturlaub.de` with entries `/` (daily, 1.0), `/buchen` (monthly, 0.6), `/impressum` (yearly, 0.3), `/login` (0.2), `/register` (0.2). `Cache-Control: public, max-age=3600`.

---

## Third-party APIs used
| Service | Usage |
|---|---|
| OpenAI (`https://api.openai.com/v1`, `gpt-4o-mini`) | chat extraction, research, itinerary, refinement, weather text — via `resolveAiBackend()` |
| Open-Meteo geocoding + forecast | `/api/itinerary-weather` |
| Firecrawl | `src/lib/ratings.server.ts` (`FIRECRAWL_API_KEY`), optional; failures fall back to empty ratings |
| Supabase REST | server-side inserts/updates via service-role client; client-side auth |
| Aviasales / Travelpayouts | deep links, marker `728432` (`src/lib/deeplinks.ts`) |
| Klook | activity/hotel deep links |
| Kiwitaxi | transfer deep link + white-label widget on `/transfer` |
| Google Analytics 4 | tag `G-BYSENCWW5P` in `src/routes/__root.tsx` |
