# Changelog

The project does not maintain release versions or dated release notes. The entries below are reconstructed only from artefacts that exist in the repository (migrations, `PROJECT_STATUS.md`, and code comments). Exact release dates per change: **not available in the current project**.

---

## Unreleased — current state

### Added
- AI travel concierge flow: chat brief intake, three-tier package generation (Basic / Medium / Premium) with flight, hotel, activities and day-by-day itinerary.
- `/api/refine-package` with a 30 € price-difference confirmation flow (`PriceConfirmation.tsx`) and database persistence of refined packages.
- `/api/itinerary-weather` — per-day weather via Open-Meteo geocoding and forecast.
- `/api/track-click` — affiliate click logging into `affiliate_clicks`.
- Affiliate deep-link builder `src/lib/deeplinks.ts` (Aviasales/Travelpayouts marker `728432`, Klook, Kiwitaxi).
- `/transfer` page embedding the Kiwitaxi white-label widget.
- Supabase auth pages `/login` and `/register` plus the `use-auth` session context.
- `/impressum` page and a homepage disclaimer stating the site is not a travel agency or tour operator.
- SEO: German metadata, canonical tags, JSON-LD (Organization / WebApplication / Service / WebSite / BreadcrumbList), dynamic `sitemap.xml`, `hreflang de-DE`, GA4 tag `G-BYSENCWW5P`.
- `PROJECT_STATUS.md` at the repository root.
- This `/docs` documentation set.

### Changed
- `src/components/ChatPanel.tsx` replaced the `useChat` helper with a custom `fetch`-based streaming client.
- `src/lib/ai-gateway.ts` introduced `resolveAiBackend()`; the AI backend is now locked to `OPENAI_API_KEY` with `gpt-4o-mini` (the Lovable AI Gateway fallback was removed on request).
- `src/routes/api/chat.ts` gained deterministic extraction for destination, origin, duration, budget, travelers, travel month and interests, plus `withTimeout` guards around the AI calls.
- Footer menu labels translated to German.
- `seroval` upgraded through a TanStack Router/Start dependency update to clear a critical vulnerable-dependency finding.

### Fixed
- Production vendor bundling failure caused by `manualChunks` in `vite.config.ts` (removed).
- Hydration mismatch from random hero particles (now deterministic via `Math.sin`).
- Destination-overwrite bug where a follow-up answer replaced the destination.
- `undefined` text in the loading screen; progress bar now capped at 96 %.
- Mobile issues: calendar popover sizing, touch-target sizes, horizontal overflow (`overflow-x: clip`, `overscroll-behavior-x: none`, `touch-action: pan-y`).
- `currentPkg.travelers` possibly-undefined type error in `PackageDetail.tsx` (defaults to 2).

### Removed
- Public read policies on `trip_requests` and `packages` (migration `20260525043059`).
- Public insert policy on `affiliate_clicks` (migration `20260519061831`).
- Lovable AI Gateway fallback from the AI backend resolver.

---

## Database migration history

| Migration | Content |
|---|---|
| `20260514093255_*` | Created `trip_requests`, `packages`, `affiliate_clicks`; enabled RLS; added public read policies on `trip_requests`/`packages` and a public insert policy on `affiliate_clicks`. |
| `20260514093318_*` | Follow-up migration in the same batch. |
| `20260519061831_*` | Dropped the public insert policy on `affiliate_clicks`. |
| `20260519061854_*` | Created `profiles` with owner-scoped RLS policies, `update_updated_at_column()` + trigger, `handle_new_user()` + `on_auth_user_created` trigger, and revoked EXECUTE from `PUBLIC`/`anon`/`authenticated`. |
| `20260525043059_*` | Dropped the public read policies on `trip_requests` and `packages`. |

---

## Note
Historical version numbers and release dates were not available in the project; the timeline above is derived from migration filenames and repository artefacts only.
