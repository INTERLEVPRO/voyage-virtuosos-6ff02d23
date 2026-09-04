# Environment Variables

Never commit real keys. All values below are placeholders.

## Present in `.env` (Lovable-managed, do not edit manually)

```text
Variable:  VITE_SUPABASE_URL
Purpose:   Supabase project URL for the browser client
Required:  Yes
Example:   https://<project-ref>.supabase.co
Used by:   src/integrations/supabase/client.ts (build-time inlined)

Variable:  VITE_SUPABASE_PUBLISHABLE_KEY
Purpose:   Publishable/anon key for the browser client
Required:  Yes
Example:   sb_publishable_xxxxxxxxxxxxxxxx
Used by:   src/integrations/supabase/client.ts

Variable:  VITE_SUPABASE_PROJECT_ID
Purpose:   Project reference id
Required:  Yes
Example:   xxxxxxxxxxxxxxxxxxxx
Used by:   generated Supabase integration files

Variable:  SUPABASE_URL
Purpose:   Server-side Supabase URL
Required:  Yes
Example:   https://<project-ref>.supabase.co
Used by:   src/integrations/supabase/client.ts, client.server.ts, auth-middleware.ts

Variable:  SUPABASE_PUBLISHABLE_KEY
Purpose:   Server-side publishable key (RLS-scoped access)
Required:  Yes
Example:   sb_publishable_xxxxxxxxxxxxxxxx
Used by:   src/integrations/supabase/client.ts, auth-middleware.ts

Variable:  SUPABASE_PROJECT_ID
Purpose:   Project reference id (server side)
Required:  Yes
Example:   xxxxxxxxxxxxxxxxxxxx
Used by:   generated Supabase integration files
```

## Runtime secrets (injected by the hosting environment, not in `.env`)

```text
Variable:  OPENAI_API_KEY
Purpose:   Authenticates the OpenAI-compatible client (gpt-4o-mini)
Required:  Yes — without it resolveAiBackend() returns null and all AI features
           reply with a German "service unavailable" message
Example:   sk-xxxxxxxxxxxxxxxxxxxxxxxx
Used by:   src/lib/ai-gateway.ts → /api/chat, /api/refine-package, /api/itinerary-weather

Variable:  SUPABASE_SERVICE_ROLE_KEY
Purpose:   Service-role key for server-side writes that bypass RLS
Required:  Yes for persisting trip requests, packages and affiliate clicks
Example:   <managed by the hosting platform — not retrievable from the app>
Used by:   src/integrations/supabase/client.server.ts

Variable:  FIRECRAWL_API_KEY
Purpose:   Firecrawl search used to look up external ratings
Required:  Optional — without it ratings fall back to an empty list
Example:   fc-xxxxxxxxxxxxxxxx
Used by:   src/lib/ratings.server.ts
```

## Notes
- `process.env.*` is server-only and is read inside handlers; the browser uses the generated Supabase client.
- Affiliate identifiers (`AVIASALES_AFFILIATE_URL`, `KLOOK_ACTIVITIES_AFFILIATE_URL`, `KIWI_TAXI_AFFILIATE_URL`, marker `728432`) and the GA4 tag `G-BYSENCWW5P` are public values hard-coded in `src/lib/deeplinks.ts`, `src/routes/transfer.tsx` and `src/routes/__root.tsx`, not environment variables.
- `src/integrations/supabase/*` and `.env` are auto-generated; do not edit them by hand.
