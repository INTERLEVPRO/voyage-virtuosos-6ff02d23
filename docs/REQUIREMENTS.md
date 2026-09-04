# Requirements

Derived from the implemented behaviour of the current codebase. Nothing here is speculative.

## Functional Requirements

| ID | Requirement | Evidence |
|---|---|---|
| FR-01 | The user can describe a trip in free German text in a chat on the homepage. | `ChatPanel.tsx`, `routes/index.tsx` |
| FR-02 | The system extracts destination, origin, duration, budget, travelers, travel month/date range and interests from the conversation. | `routes/api/chat.ts` |
| FR-03 | Missing fields are requested back from the user in German, one topic at a time. | `routes/api/chat.ts` |
| FR-04 | A budget below 100 € per person is rejected with a German hint. | `MIN_BUDGET_EUR = 100` |
| FR-05 | Before generation, the system shows a confirmation summary of the collected brief. | `buildTripConfirmationReply` |
| FR-06 | The system produces exactly three packages, typed `basic`, `medium`, `premium`. | `TIER_ORDER`, tier assignment |
| FR-07 | Every package must validate against `packageSchema`; if none validate, a 502 with a German error is returned. | `lib/package-schema.ts`, `api/chat.ts` |
| FR-08 | The itinerary length must equal the requested number of days. | itinerary prompt + `parseItineraryDraft` |
| FR-09 | Generated trip requests and packages are stored in the database. | `trip_requests`, `packages` inserts |
| FR-10 | The user can open a package detail view with itinerary, hotel, flight, activities, badges and ratings. | `PackageDetail.tsx` |
| FR-11 | The user can request a change to a single package and receives a refined package plus a German change summary. | `api/refine-package.ts` |
| FR-12 | A price change of 30 € or more requires explicit user confirmation before it is applied. | `PRICE_THRESHOLD = 30`, `PriceConfirmation.tsx` |
| FR-13 | Requests to regenerate all three packages from the detail view are rejected. | `REGEN_ALL_PATTERNS` |
| FR-14 | The user can view expected weather, clothing hints and a tip for each itinerary day. | `api/itinerary-weather.ts`, `DayWeatherPanel.tsx` |
| FR-15 | Booking buttons link to third-party affiliate URLs. | `lib/deeplinks.ts` |
| FR-16 | Outbound affiliate clicks are logged with provider, URL and (when known) package id. | `api/track-click.ts` |
| FR-17 | The user can book an airport transfer through the embedded Kiwitaxi widget. | `routes/transfer.tsx` |
| FR-18 | Users can register and sign in with email and password; a profile row is created automatically. | `login.tsx`, `register.tsx`, `handle_new_user()` |
| FR-19 | The site publishes an XML sitemap and an imprint page. | `sitemap[.]xml.ts`, `impressum.tsx` |
| FR-20 | The homepage states that the operator is not a travel agency or tour operator. | `routes/index.tsx` disclaimer |

## Non-Functional Requirements

| Area | Implemented behaviour |
|---|---|
| Responsiveness | Mobile-first Tailwind layouts; `use-mobile.tsx` hook; touch-target sizing; `overflow-x: clip`, `overscroll-behavior-x: none`, `touch-action: pan-y` in `src/styles.css`. |
| Latency control | AI research/itinerary calls wrapped in `withTimeout(..., 12_000)`; ratings lookup raced against 5 s; itinerary AI skipped for trips > 14 days. |
| Progressive feedback | Streaming chat responses; loading progress capped at 96 % until packages arrive. |
| Hydration safety | Deterministic hero particles (`Math.sin`) instead of `Math.random`. |
| Resilience | Database persistence failures are caught and treated as non-fatal; ratings failures fall back to an empty list. |
| Security | RLS enabled on all public tables; service-role client only imported dynamically inside server handlers; all API payloads Zod-validated. |
| Localisation | All user-facing copy is German; `hreflang de-DE`; prices in EUR, `de-DE` number formatting. |
| SEO | Per-route `head()` with canonical, OG/Twitter, JSON-LD; sitemap; `robots.txt`; `/transfer` set to `noindex`. |
| Accessibility | Radix primitives provide keyboard/ARIA behaviour; `aria-label` on icon-only buttons (e.g. the send button). A dedicated accessibility audit was not found in the project. |

## Technical Requirements
- Node.js-compatible toolchain able to run Vite 7 and TypeScript 5.8; Bun is used in the dev environment.
- Deployment target: Cloudflare Worker runtime with `nodejs_compat` (`wrangler.jsonc`, `src/server.ts`).
- Supabase project for auth and Postgres storage.
- `OPENAI_API_KEY` must be present at runtime, otherwise all AI features return a German service-unavailable message.
- Modern evergreen browser with JavaScript enabled (React 19 SSR + hydration). Exact supported browser versions: not found in the current project.
