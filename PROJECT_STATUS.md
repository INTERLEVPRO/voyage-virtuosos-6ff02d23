# PROJECT_STATUS.md — Weltweiturlaub.de

> This file reflects the project state as confirmed from the actual codebase. No guessed or invented facts are included.

## Initial Project

- **Scaffold**: Lovable-generated TanStack Start v1 TypeScript template (`tanstack_start_ts`), first commit `86becaa template: tanstack_start_ts_2026-05-12`.
- **Original stack**: React 19, TanStack Router/Query, Vite 7, Tailwind CSS v4, Supabase client integration, shadcn/ui component library, Cloudflare Workers deployment scaffold (`wrangler.jsonc`, `src/server.ts`).
- **Template artifacts still present**: generic `package.json` name `tanstack_start_ts`, full `src/components/ui/*` shadcn set, `src/integrations/lovable/index.ts`, `@lovable.dev/cloud-auth-js` / `@lovable.dev/vite-tanstack-config` dependencies.

## Changes Made

Major customizations since the initial scaffold (≈ 940 commits):

- **AI travel concierge**: Replaced generic template content with a chat-driven German travel planner that generates three tiered packages (Basic / Medium / Premium) with flights, hotels, and day-by-day itineraries.
- **Chat engine rewrite**: `src/components/ChatPanel.tsx` switched from `useChat`/Vercel helper to a custom `fetch`-based streaming client to avoid vendor chunking issues in production.
- **AI backend**: `src/lib/ai-gateway.ts` introduced `resolveAiBackend()`, currently locked to `OPENAI_API_KEY` + `gpt-4o-mini` (Lovable AI Gateway fallback removed per project requirement).
- **Route & extraction fixes**: `src/routes/api/chat.ts` gained deterministic field extraction for destination, origin, duration, budget, travelers, travel month, and interests; destination-overwrite and parsing bugs fixed.
- **Package refinement**: `src/routes/api/refine-package.ts` added with price-difference confirmation flow (`PriceConfirmation.tsx`) and DB persistence for saved packages.
- **Weather endpoint**: `src/routes/api/itinerary-weather.ts` provides day-level weather via Open-Meteo geocoding + forecast.
- **Affiliate deep-linking**: `src/lib/deeplinks.ts` builds tracked links for Aviasales flights, Klook activities, and Kiwitaxi transfers; `src/routes/api/track-click.ts` logs affiliate clicks.
- **Transfer page**: `src/routes/transfer.tsx` embeds the Kiwitaxi white-label widget.
- **SEO**: German meta, canonical tags, JSON-LD Organization/WebApplication/Service/WebSite schema, dynamic `sitemap.xml.ts`, hreflang `de-DE`, GA4 tag `G-BYSENCWW5P`.
- **Legal/disclaimer**: Added `/impressum` and homepage disclaimer that the site is **not** a travel agency/operator.
- **Mobile & hydration fixes**: Deterministic hero particles (`Math.sin`), calendar popover sizing, touch targets, `overflow-x: clip`, `overscroll-behavior-x: none`, loading-screen `undefined` fix, progress bar capped at 96%.
- **Footer cleanup**: Address kept, menu labels translated to German, social links present.
- **Security dependency**: `seroval` upgraded via `@tanstack/react-router`/`@tanstack/react-start` update to resolve critical vulnerable-dependency finding.
- **Database evolution**: Supabase migrations created `trip_requests`, `packages`, `affiliate_clicks`, and later `profiles` with RLS; public-read policies on `trip_requests`/`packages` were dropped in migration `20260525043059`.

## Current Status

### Purpose
Weltweiturlaub.de is a German-language, AI-powered travel-planning web app. It turns a free-text travel brief into three non-binding travel package suggestions (flight + hotel + activities), priced in EUR, and links users to third-party booking providers for actual purchase.

### Working Features
- Homepage with chat input and animated hero (`src/routes/index.tsx`).
- Streaming chat that extracts travel intent and produces structured packages (`src/components/ChatPanel.tsx`, `src/routes/api/chat.ts`).
- Package results and detail view with itinerary, ratings, weather, and booking links (`PackageResults.tsx`, `PackageDetail.tsx`, `DayWeatherPanel.tsx`).
- Package refinement / “Plan ändern” with price confirmation (`RefineComposer.tsx`, `PriceConfirmation.tsx`, `src/routes/api/refine-package.ts`).
- Per-day weather lookup (`src/routes/api/itinerary-weather.ts`).
- Airport transfer booking page via Kiwitaxi widget (`src/routes/transfer.tsx`).
- Supabase auth login/register/session (`src/routes/login.tsx`, `src/routes/register.tsx`, `src/hooks/use-auth.tsx`).
- SEO/sitemap/structured data and GA4 tracking.
- Affiliate click tracking (`src/routes/api/track-click.ts`).
- Imprint page (`src/routes/impressum.tsx`).

### Pages / Routes
| Route | File | Status |
|-------|------|--------|
| `/` | `src/routes/index.tsx` | Live — chat + results |
| `/buchen` | `src/routes/buchen.tsx` | Stub / placeholder |
| `/transfer` | `src/routes/transfer.tsx` | Live — Kiwitaxi widget |
| `/login` | `src/routes/login.tsx` | Live — Supabase auth |
| `/register` | `src/routes/register.tsx` | Live — Supabase auth |
| `/impressum` | `src/routes/impressum.tsx` | Live |
| `/sitemap.xml` | `src/routes/sitemap[.]xml.ts` | Live — dynamic XML |
| `/api/chat` | `src/routes/api/chat.ts` | Live — main AI endpoint |
| `/api/refine-package` | `src/routes/api/refine-package.ts` | Live |
| `/api/itinerary-weather` | `src/routes/api/itinerary-weather.ts` | Live |
| `/api/track-click` | `src/routes/api/track-click.ts` | Live |

### Key Components
- `ChatPanel.tsx`, `PackageResults.tsx`, `PackageCard.tsx`, `PackageDetail.tsx`, `RefineComposer.tsx`, `PriceConfirmation.tsx`, `DayWeatherPanel.tsx`, `PlaceImage.tsx`, `AgentBadge.tsx`, `FloatingIcons.tsx`, `Footer.tsx`, plus `src/components/ui/*` shadcn components.

### Key Libraries
- `src/lib/ai-gateway.ts` — OpenAI provider resolution.
- `src/lib/package-schema.ts` — Zod schema for AI-generated packages.
- `src/lib/deeplinks.ts` — IATA code maps and deep-link builders for Aviasales, Klook, Kiwitaxi.
- `src/lib/ratings.server.ts` — server-side rating fetch.
- `src/lib/error-capture.ts`, `src/lib/error-page.ts` — SSR error handling.

### Technology Stack
- **Framework**: TanStack Start `^1.168.32`, TanStack Router `^1.170.18`, TanStack Query `^5.83.0`, React `^19.2.0`.
- **Build / deploy**: Vite `^7.3.1`, `@cloudflare/vite-plugin`, `nitro`, `wrangler`, `src/server.ts` Worker entry.
- **Styling**: Tailwind CSS `^4.2.1`, `@tailwindcss/vite`, `tw-animate-css`, `class-variance-authority`, `tailwind-merge`.
- **UI**: Radix UI primitives, shadcn-style components, `lucide-react`, `embla-carousel-react`, `react-day-picker`, `sonner`, `recharts`.
- **AI**: `ai` SDK, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`, `@mendable/firecrawl-js`.
- **Data / validation**: `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`.
- **Auth / backend**: `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js`, Supabase migrations.
- **Tooling**: TypeScript `^5.8.3`, ESLint `^9`, Prettier.

### Integrations
- **OpenAI** (`gpt-4o-mini`) via `OPENAI_API_KEY` for chat, refinement, and itinerary generation.
- **Open-Meteo** for geocoding and weather forecast.
- **Aviasales / Travelpayouts** affiliate flight links (`AVIASALES_AFFILIATE_URL`, marker `728432`).
- **Klook** affiliate activity links (`KLOOK_ACTIVITIES_AFFILIATE_URL`).
- **Kiwitaxi** affiliate transfer links and white-label widget (`KIWI_TAXI_AFFILIATE_URL`, `WIDGET_SCRIPT_SRC`).
- **Supabase** for auth and data persistence (`trip_requests`, `packages`, `affiliate_clicks`, `profiles`).
- **Google Analytics 4** tag `G-BYSENCWW5P`.

## Pending / Incomplete Work

- **`/buchen` is a placeholder**: `src/routes/buchen.tsx` only shows static text (“Deine Buchungsdaten werden hier verarbeitet…”) and a back link; no booking form, payment, or confirmation logic exists.
- **Footer links**: “Kontakt” and “Datenschutz” both link to `/` (not to dedicated pages).
- **No README**: Project root has no `README.md` documenting setup, env vars, or contribution.
- **Package name not rebranded**: `package.json` still uses template name `tanstack_start_ts`.
- **RLS state on `trip_requests`/`packages`**: Public-read policies were dropped in migration `20260525043059`; no replacement authenticated-read policies were found in the migrations directory. If the client still queries these tables directly, reads may fail.
- **No automated tests**: No test suite, test scripts, or visible test files were found.
- **No TODO/FIXME markers**: Incomplete work is not self-documented in source comments.
- **Dependency usage unconfirmed**: `firecrawl` and `@lovable.dev/cloud-auth-js` are listed in `package.json`; active call sites beyond `src/integrations/lovable/index.ts` were not verified.

## Next Steps

1. **Decide scope of `/buchen`**: either implement a real booking request/payment flow or remove the page if it is not needed.
2. **Add dedicated `/datenschutz` and `/kontakt` pages** and update footer links.
3. **Verify and fix RLS policies** for `trip_requests`/`packages` so authenticated reads work as intended.
4. **Add a `README.md`** with setup instructions, required env vars, and deployment notes.
5. **Rename `package.json` name** from `tanstack_start_ts` to `weltweiturlaub` or similar.
6. **Confirm live secret presence** of `OPENAI_API_KEY`; without it the chat pipeline returns a service-unavailable error.
7. **Audit leftover dependencies** (`firecrawl`, `@lovable.dev/cloud-auth-js`) and remove any that are unused.
8. **Add automated tests** for critical paths (chat extraction, package schema validation, deep-link builders).
