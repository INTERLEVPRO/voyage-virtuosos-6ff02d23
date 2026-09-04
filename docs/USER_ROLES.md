# User Roles

The project does **not** implement a role system. There is no `user_roles` table, no `app_role` enum, and no `has_role()` function in `supabase/migrations/`. Roles beyond the two effective states below: **Not found in the current project.**

## Effective roles

### 1. Anonymous visitor (`anon`)
- **Permissions:** use the entire planning flow. All API routes (`/api/chat`, `/api/refine-package`, `/api/itinerary-weather`, `/api/track-click`) are unauthenticated.
- **Accessible pages:** `/`, `/buchen`, `/transfer`, `/login`, `/register`, `/impressum`, `/sitemap.xml`.
- **Allowed actions:** create a travel brief, generate packages, view details, refine packages, view weather, follow affiliate links, use the transfer widget, register, sign in.
- **Database access:** none directly. No RLS policy grants `anon` any read or write. Server-side writes happen through the service-role client.

### 2. Authenticated user (`authenticated`)
- **How obtained:** email/password sign-up or sign-in on `/register` / `/login` (Supabase auth). A `profiles` row is created automatically by the `on_auth_user_created` trigger.
- **Additional permissions vs. anonymous:** can select, insert and update **their own** `profiles` row (`auth.uid() = id`).
- **Accessible pages:** the same pages as an anonymous visitor — no route is gated behind authentication.
- **Restrictions:** no access to `trip_requests`, `packages` or `affiliate_clicks` (no policies exist for these tables).

### 3. Service role (backend only)
- Used by `src/integrations/supabase/client.server.ts` inside server handlers. Bypasses RLS. Never exposed to the browser.

## Permission matrix

| Capability | anon | authenticated | service_role (server) |
|---|---|---|---|
| Use chat / generate packages | Yes | Yes | n/a |
| Refine package | Yes | Yes | n/a |
| Weather lookup | Yes | Yes | n/a |
| Affiliate click tracking (via API) | Yes | Yes | n/a |
| Read `trip_requests` / `packages` | No | No | Yes |
| Insert `trip_requests` / `packages` | No | No | Yes |
| Insert `affiliate_clicks` | No | No | Yes |
| Read/insert/update own `profiles` row | No | Yes | Yes |
| Read another user's `profiles` row | No | No | Yes |
