# Tech Stack

Source of truth: `package.json`, `vite.config.ts`, `wrangler.jsonc`, `tsconfig.json`, `components.json`, `supabase/config.toml`.

## Languages
- TypeScript `^5.8.3`
- SQL (Supabase/Postgres migrations)
- CSS (Tailwind v4 via `src/styles.css`)

## Framework & runtime
| Item | Version |
|---|---|
| React / React DOM | `^19.2.0` |
| @tanstack/react-start | `^1.168.32` |
| @tanstack/react-router | `^1.170.18` |
| @tanstack/router-plugin | `^1.168.23` |
| @tanstack/react-query | `^5.83.0` |
| nitro | `3.0.260603-beta` |
| Vite | `^7.3.1` |
| @cloudflare/vite-plugin | `^1.25.5` |

## Styling & UI
- tailwindcss `^4.2.1`, `@tailwindcss/vite`, `tw-animate-css`
- shadcn/ui components in `src/components/ui` (config: `components.json`)
- Radix UI primitives (accordion, dialog, popover, select, tabs, tooltip, …)
- `lucide-react` `^0.575.0`, `class-variance-authority`, `clsx`, `tailwind-merge`
- `sonner` `^2.0.7`, `vaul`, `cmdk`, `embla-carousel-react` `^8.6.0`, `recharts` `^2.15.4`, `react-resizable-panels`, `input-otp`

## AI
- `ai` `^6.0.208`
- `@ai-sdk/openai` `^3.0.74`, `@ai-sdk/openai-compatible` `^2.0.51`, `@ai-sdk/react` `^3.0.210`
- `@mendable/firecrawl-js` `^4.25.1` (used in `src/lib/ratings.server.ts`)
- Model in use: `gpt-4o-mini` through an OpenAI-compatible client pointed at `https://api.openai.com/v1` (`src/lib/ai-gateway.ts`)

## Data, forms & validation
- `zod` `^3.24.2`
- `react-hook-form` `^7.71.2` + `@hookform/resolvers` `^5.2.2`
- `date-fns` `^4.1.0`, `react-day-picker` `^9.14.0`
- `react-markdown` `^10.1.0`

## Database & auth
- Supabase (Lovable Cloud), `@supabase/supabase-js` `^2.105.4`
- `@lovable.dev/cloud-auth-js` `^1.1.2`
- Auth: Supabase email/password sessions via `src/hooks/use-auth.tsx`

## Build tooling
- Vite 7, `@vitejs/plugin-react` `^5.0.4`, `vite-tsconfig-paths` `^6.0.2`, `@lovable.dev/vite-tanstack-config` `2.13.1`
- ESLint `^9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, Prettier `^3.7.3`

## Package manager
`bun` is used in the dev environment (`bunfig.toml` present); npm also works with `package.json` scripts.

## Hosting
Lovable publishing; worker entry `src/server.ts`, `wrangler.jsonc` with `compatibility_date 2025-09-24` and `nodejs_compat`.

## External services
OpenAI, Open-Meteo, Firecrawl, Supabase, Aviasales/Travelpayouts, Klook, Kiwitaxi (white-label widget `https://widget-white-label.kiwitaxi.com/js/index.js`), Google Analytics 4.
