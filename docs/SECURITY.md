# Security

## Authentication
- Supabase email/password authentication (`/login`, `/register`).
- Session handling in `src/hooks/use-auth.tsx`: the `onAuthStateChange` listener is registered **before** `getSession()` is read, then React Query and the router are invalidated on change.
- Tokens are managed by `@supabase/supabase-js` (generated client in `src/integrations/supabase/client.ts`). Passwords are never handled by application code — they are sent directly to Supabase Auth, which stores them hashed.
- `src/integrations/supabase/auth-attacher.ts` and `auth-middleware.ts` exist for attaching/validating bearer tokens on server functions. No API route currently uses them.

## Authorization
- No role system exists (no `user_roles` table, no `has_role()` function). See `USER_ROLES.md`.
- Every API route under `src/routes/api/` is publicly callable. There is no rate limiting, captcha or origin check in the current project.
- No route in the UI is gated behind authentication.

## Row Level Security
RLS is enabled on `trip_requests`, `packages`, `affiliate_clicks` and `profiles`.
- `profiles`: policies restrict select/insert/update to `auth.uid() = id` for role `authenticated`.
- `trip_requests`, `packages`, `affiliate_clicks`: no policies remain (public read/insert policies were dropped in migrations `20260519061831` and `20260525043059`), so no client-side access is possible. All writes go through the service-role client.
- `handle_new_user()` and `update_updated_at_column()` have EXECUTE revoked from `PUBLIC`, `anon` and `authenticated`.

## Secret management
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` and `FIRECRAWL_API_KEY` are runtime environment variables, never committed and never sent to the browser.
- `src/integrations/supabase/client.server.ts` (service-role client) is imported **dynamically inside server handlers** (`await import(...)`) so it cannot leak into the client bundle.
- `.env` contains only the publishable Supabase values.

## Input validation
- `/api/refine-package`: Zod schema with length caps (`changeRequest` ≤ 2000, `tripBrief` ≤ 4000) and full package-schema validation of the model output.
- `/api/itinerary-weather`: Zod schema (`destination` ≤ 200 chars, 1–60 days, day numbers 1–60).
- `/api/track-click`: Zod schema (`provider` ≤ 32, `url` must be a valid URL ≤ 2048); `package_id` is only persisted when it matches a UUID pattern.
- `/api/chat`: budget floor `MIN_BUDGET_EUR = 100`; AI output is validated with `packageSchema` and discarded when invalid.

## Data protection
- No payment data is processed anywhere in the project.
- `trip_requests` stores the raw brief; users may type personal details into free text — this is not stripped.
- Affiliate click logs store provider, URL and optional package id; no user identifier is stored.

## API security posture
- Model output is never executed; it is parsed as JSON after stripping code fences and validated with Zod.
- AI calls are time-boxed (`withTimeout`, 12 s) and the ratings lookup is raced against 5 s, which limits resource exhaustion from slow upstreams.
- Database failures are caught and treated as non-fatal, so an error never propagates raw details to the client.

## CORS
No custom CORS configuration was found in the project; the API routes are same-origin routes of the app.

## Known limitations
1. Unauthenticated, unthrottled AI endpoints — a third party can consume the OpenAI budget by calling `/api/chat` directly.
2. `/api/track-click` accepts arbitrary provider/URL values and can be used to write noise into `affiliate_clicks`.
3. Free-text briefs may contain personal data with no redaction or retention policy.
4. No `/datenschutz` (privacy policy) page exists; the footer link points to `/`.
5. No automated security tests.
