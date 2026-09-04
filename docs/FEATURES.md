# Features

Status values used: **Implemented**, **Partially implemented**, **Not implemented**.

---

## 1. AI travel chat (brief intake)
- **Purpose:** collect destination, origin, duration, budget, travelers, timeframe, interests from free German text.
- **How it works:** `/api/chat` runs deterministic extractors plus an AI extraction step, asks targeted German follow-up questions for missing fields, enforces `MIN_BUDGET_EUR = 100`, and shows a confirmation summary before generating.
- **User interaction:** typing in the chat composer on `/`; a date-range calendar popover is available.
- **Page/component:** `/` → `src/components/ChatPanel.tsx`.
- **Backend:** `POST /api/chat`.
- **Status:** Implemented.

## 2. Three-tier package generation
- **Purpose:** produce Basic / Medium / Premium packages with flight, hotel, activities, itinerary, price, match score, rating.
- **How it works:** parallel research + itinerary AI calls (only for ≤ 14 days; longer trips use the deterministic itinerary builder), `buildPackagesFromResearch`, validation with `packageSchema`, tier assignment, persistence to `trip_requests`/`packages`.
- **Page/component:** `PackageResults.tsx`, `PackageCard.tsx`.
- **Status:** Implemented.

## 3. Package detail view
- **Purpose:** show full itinerary, hotel/flight, badges, activities, ratings and booking buttons.
- **Page/component:** `PackageDetail.tsx`, `PlaceImage.tsx`, `AgentBadge.tsx`.
- **Status:** Implemented.

## 4. Package refinement ("Plan ändern")
- **Purpose:** adjust a single package from a German change request or a quick chip ("Anderes Hotel", "Günstiger machen", "Mehr Luxus", "Mehr Aktivitäten").
- **How it works:** `POST /api/refine-package`; if the price changes by ≥ 30 € the user must confirm; regenerate-all requests are rejected with a hint to start a new chat.
- **Component:** `RefineComposer.tsx`, `PriceConfirmation.tsx`.
- **Status:** Implemented.

## 5. Per-day weather
- **Purpose:** expected weather, clothing hints and a travel tip per itinerary day.
- **How it works:** `POST /api/itinerary-weather` → Open-Meteo geocoding + forecast, WMO code mapping, AI-written German tips.
- **Component:** `DayWeatherPanel.tsx`.
- **Status:** Implemented.

## 6. Hotel/flight/activity ratings
- **Purpose:** show external ratings on packages.
- **How it works:** `src/lib/ratings.server.ts` uses Firecrawl (`FIRECRAWL_API_KEY`); the lookup is raced against a 5 s timeout and falls back to an empty list. Ratings without a URL are not displayed.
- **Status:** Implemented (degrades to no ratings when the key or the timeout budget is unavailable).

## 7. Affiliate deep links
- **Purpose:** hand the user off to booking providers.
- **How it works:** `src/lib/deeplinks.ts` maps cities to IATA codes and builds Aviasales (marker `728432`), Klook and Kiwitaxi URLs.
- **Status:** Implemented.

## 8. Affiliate click tracking
- **Purpose:** log outbound clicks.
- **How it works:** `POST /api/track-click` inserts into `affiliate_clicks` via the service-role client.
- **Status:** Implemented.

## 9. Airport transfer page
- **Purpose:** book an airport transfer.
- **How it works:** `/transfer` embeds the Kiwitaxi white-label widget (`https://widget-white-label.kiwitaxi.com/js/index.js`, marker `728432`) and accepts `from|to|country|pax|date` search params. The page is `noindex,follow`.
- **Status:** Implemented.

## 10. Authentication (email/password)
- **Purpose:** allow users to register and sign in.
- **How it works:** Supabase auth on `/login` and `/register`; session context in `use-auth.tsx`; a `profiles` row is created by a database trigger on signup.
- **Restriction:** no route in the app is gated behind auth, and no user-specific data is read back in the UI.
- **Status:** Implemented (sign-in/sign-up only).

## 11. Booking page `/buchen`
- **Purpose:** intended booking step.
- **Current state:** static German text ("Deine Buchungsdaten werden hier verarbeitet…") plus a back link. No form, payment or confirmation logic.
- **Status:** Partially implemented (placeholder).

## 12. Legal / imprint
- `/impressum` with head metadata and breadcrumb JSON-LD; homepage disclaimer that the site is not a travel agency or tour operator.
- **Status:** Implemented.

## 13. SEO & analytics
- German head metadata with canonical URLs, OG/Twitter tags, hreflang `de-DE`, JSON-LD (Organization, WebApplication, Service, WebSite, BreadcrumbList), dynamic `/sitemap.xml`, `public/robots.txt`, GA4 tag `G-BYSENCWW5P`.
- **Status:** Implemented.

## 14. Contact / privacy pages
Footer links "Kontakt" and "Datenschutz" currently point to `/`; no dedicated pages exist.
- **Status:** Not implemented.

## 15. Automated tests
No test framework or test files. `scripts/test-30days.ts` is an ad-hoc script, not part of a test suite.
- **Status:** Not implemented.
