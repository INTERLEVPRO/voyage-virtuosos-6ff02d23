# Deployment

## Hosting platform
The project is published through Lovable. The build output targets the Cloudflare Worker runtime.

- Worker entry: `src/server.ts`
- Worker config: `wrangler.jsonc` — `name: tanstack-start-app`, `compatibility_date: 2025-09-24`, `compatibility_flags: ["nodejs_compat"]`
- Build config: `vite.config.ts` (Vite 7, `@cloudflare/vite-plugin`, `@tailwindcss/vite`, TanStack router plugin, `vite-tsconfig-paths`). `manualChunks` was deliberately removed — reintroducing it previously broke the React vendor chunk in production.

## URLs
| Purpose | URL |
|---|---|
| Production (custom domain) | `https://weltweiturlaub.de` |
| Published Lovable domain | `https://voyage-virtuosos.lovable.app` |
| Preview | the Lovable preview URL of the project |

Canonical URLs and the sitemap are hard-coded to `https://weltweiturlaub.de`.

## Build process
```bash
bun run build      # production build
bun run build:dev  # development-mode build (used for preview verification)
```

## Production configuration
- Server-only values (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) are injected as environment variables/secrets by the hosting platform and read inside request handlers.
- Browser-visible values (`VITE_SUPABASE_*`) are inlined at build time.
- All npm packages must be bundled at build time; there is no runtime module resolution in the Worker.

## Database deployment
The Supabase project is shared between preview and the published site. Schema changes are applied as new SQL migrations in `supabase/migrations/`.

## Deployment steps
1. Merge/finish the changes in the project.
2. Verify the app in the Lovable preview.
3. Publish from Lovable — this builds and deploys the Worker.
4. The custom domain `weltweiturlaub.de` serves the published deployment.

## Verification steps after deploy
- Load `https://weltweiturlaub.de/` and confirm the hero and chat render (no hydration errors in the console).
- Send a complete travel brief and confirm three packages appear.
- Open a package, confirm the itinerary, weather panel and booking buttons work.
- Trigger "Plan ändern" and confirm a `200` from `/api/refine-package`.
- Load `https://weltweiturlaub.de/sitemap.xml` and confirm valid XML.

## Restart / update process
Redeploy by publishing again from Lovable. There is no separate restart command for the Worker.

## Rollback
Rollback is performed through Lovable's project version history (revert to an earlier version and publish). No rollback script exists in the repository.

## Secrets
No secrets are stored in the repository. Do not add them to `.env`, `wrangler.jsonc` or source files.
