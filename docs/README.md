# Weltweiturlaub.de — Developer README

## Project name
Weltweiturlaub.de (package name in `package.json` is still the template default `tanstack_start_ts`).

## Project purpose
A German-language, AI-supported travel planning web app. A user describes a travel wish in free text; the app extracts the trip parameters, generates three non-binding travel packages (Basic / Medium / Premium) with flight, hotel, activities and a day-by-day itinerary, and links out to third-party booking providers via affiliate deep links.

## What the website does
1. User enters a travel brief in the chat on the homepage.
2. `/api/chat` extracts destination, origin, duration, budget, travelers, travel month/date and interests. Missing fields are asked back in German.
3. When the brief is complete, the backend generates research + itinerary text with an AI model, builds 3 packages, validates them against a Zod schema, persists them and streams the result to the client.
4. The user can open a package detail view, see per-day weather, refine the package ("Plan ändern"), and follow affiliate booking links (flights, hotels, activities, airport transfer).

## Main features
- AI chat travel brief extraction and package generation
- 3-tier package results (Basic / Medium / Premium)
- Package detail view with itinerary, ratings and booking links
- Package refinement with price-change confirmation
- Per-day weather via Open-Meteo
- Affiliate deep links + click tracking
- Kiwitaxi airport-transfer page
- Email/password auth (login/register) via Lovable Cloud (Supabase)
- SEO: German metadata, canonical, JSON-LD, dynamic sitemap, GA4

## Technology overview
React 19 + TanStack Start v1 (TanStack Router / Query), Vite 7, Tailwind CSS v4, shadcn/ui + Radix, Zod, AI SDK (`ai`, `@ai-sdk/openai-compatible`), Supabase (Lovable Cloud) for auth + data, Cloudflare Workers as the deployment target. See `TECH_STACK.md`.

## Project structure
```text
src/
├── components/          # App components + components/ui (shadcn)
├── hooks/               # use-auth.tsx, use-mobile.tsx
├── integrations/
│   ├── supabase/        # auto-generated clients, types, auth middleware
│   └── lovable/
├── lib/                 # ai-gateway, deeplinks, package-schema, ratings.server, error handling, utils
├── routes/
│   ├── __root.tsx       # root layout + head
│   ├── index.tsx        # homepage (chat + results)
│   ├── buchen.tsx, impressum.tsx, login.tsx, register.tsx, transfer.tsx
│   ├── sitemap[.]xml.ts
│   └── api/             # chat.ts, refine-package.ts, itinerary-weather.ts, track-click.ts
├── types/travel.ts
├── router.tsx, server.ts, start.ts, styles.css
supabase/migrations/     # SQL migrations
scripts/test-30days.ts   # ad-hoc script (not a test framework)
docs/                    # this documentation
```

## Prerequisites
- Node.js 20+ (or Bun)
- A package manager (`bun` or `npm`)
- Access to the Lovable project (backend/env values are managed by Lovable Cloud)

## Installation
```bash
bun install    # or: npm install
```

## Environment setup
See `ENVIRONMENT.md`. `.env` in the repo contains only Supabase URL / project id / publishable key (`VITE_*` and server duplicates). Secrets such as `OPENAI_API_KEY`, `FIRECRAWL_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the hosting environment and are not stored in the repository.

## Local development
```bash
bun run dev        # vite dev, serves on http://localhost:8080
```

## Build
```bash
bun run build      # production build
bun run build:dev  # development-mode build
bun run preview    # preview the build
```

## Lint / format
```bash
bun run lint
bun run format
```

## How to test
No test framework is configured. See `TESTING.md`.

## Deployment overview
Published through Lovable; the build output targets Cloudflare Workers (`wrangler.jsonc`, entry `src/server.ts`). Live domains: `https://weltweiturlaub.de` and `https://voyage-virtuosos.lovable.app`. See `DEPLOYMENT.md`.
