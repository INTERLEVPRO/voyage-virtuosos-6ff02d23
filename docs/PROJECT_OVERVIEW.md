# Project Overview

## Why this project exists
Planning a trip normally requires comparing flights, hotels and activities across several portals. Weltweiturlaub.de turns a single free-text travel wish (in German) into three ready-made, comparable travel package suggestions.

## Main purpose
Convert a natural-language travel brief into three tiered travel packages (Basic / Medium / Premium) including flight description, hotel, activities, day-by-day itinerary and a total price in EUR.

## Business objective
The site is explicitly **not** a travel agency or tour operator (stated in the homepage disclaimer and `/impressum`). Packages are non-binding suggestions. Monetisation is through affiliate deep links to third-party providers (Aviasales/Travelpayouts, Klook, Kiwitaxi), with clicks logged in `affiliate_clicks`.

## Target users
German-speaking travellers who want a fast, inspiration-driven trip suggestion instead of manual portal comparison.

## Main user problems solved
- No need to fill a structured search form — a free-text wish is enough.
- Three price tiers make comparison easy.
- Day-by-day itinerary plus weather expectations per day.
- Direct hand-off links to booking providers.

## Website scope
- Public marketing/product homepage with the chat planner
- Package results, package detail, package refinement
- Airport transfer widget page
- Auth pages (login/register) — auth exists but no protected route subtree is present
- Legal page (`/impressum`), sitemap
- Booking page `/buchen` exists as a placeholder only

## Major modules
| Module | Location |
|---|---|
| Chat & extraction & package generation | `src/routes/api/chat.ts`, `src/components/ChatPanel.tsx` |
| Package presentation | `PackageResults.tsx`, `PackageCard.tsx`, `PackageDetail.tsx` |
| Refinement | `RefineComposer.tsx`, `PriceConfirmation.tsx`, `src/routes/api/refine-package.ts` |
| Weather | `DayWeatherPanel.tsx`, `src/routes/api/itinerary-weather.ts` |
| Affiliate links & tracking | `src/lib/deeplinks.ts`, `src/routes/api/track-click.ts` |
| Auth | `src/hooks/use-auth.tsx`, `src/routes/login.tsx`, `src/routes/register.tsx` |
| AI provider resolution | `src/lib/ai-gateway.ts` |
| Validation | `src/lib/package-schema.ts` |

## Main pages
`/`, `/buchen`, `/transfer`, `/login`, `/register`, `/impressum`, `/sitemap.xml`.

## Important integrations
OpenAI (`gpt-4o-mini` via OpenAI-compatible client), Open-Meteo (geocoding + forecast), Firecrawl (ratings lookup, optional), Supabase / Lovable Cloud (auth + database), Aviasales/Travelpayouts, Klook, Kiwitaxi, Google Analytics 4 (`G-BYSENCWW5P`).

## Current implementation status
Core planning flow (chat → packages → detail → refine → affiliate hand-off) is implemented and live. `/buchen` is a placeholder. There are no automated tests. Footer "Kontakt" and "Datenschutz" links point to `/`.
