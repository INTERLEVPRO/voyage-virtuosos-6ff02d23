# Add Login / Register

Add authentication (email+password and Google) with a user profiles table, and an account menu in the header.

## Database (migration)

- Create `public.profiles` table: `id uuid PK refs auth.users(id) on delete cascade`, `display_name text`, `avatar_url text`, `created_at`, `updated_at`.
- Enable RLS. Policies:
  - Select: anyone authenticated can read profiles (or own-only — default own-only).
  - Update/Insert: only `auth.uid() = id`.
- Trigger `handle_new_user()` on `auth.users` insert → creates a `profiles` row with `display_name` from `raw_user_meta_data.full_name` or email.
- `update_updated_at_column()` trigger on profiles.

## Auth config

- Call `supabase--configure_social_auth` with `providers: ["google"]` (keep email enabled).
- Do NOT auto-confirm emails (default).

## Routes (TanStack file-based)

- `src/routes/login.tsx` — public route. Login form (email/password) + "Continue with Google" button using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`. Link to `/register`. Supports `?redirect=` search param.
- `src/routes/register.tsx` — public route. Signup form (email, password, display name) with `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name } } })`. Google button. Link to `/login`.
- Keep home `/` public — no forced auth.

## Auth state plumbing

- Add `src/hooks/use-auth.tsx`: subscribes to `supabase.auth.onAuthStateChange` FIRST, then `getSession()`. Exposes `{ user, session, loading, signOut }`.
- Wrap app in `<AuthProvider>` inside `src/routes/__root.tsx` (around `<Outlet />`).
- On auth state change, also call `queryClient.invalidateQueries()` and `router.invalidate()`.

## Header UI (src/components/SiteHeader or inline in index)

- If logged out: show "Anmelden" + "Registrieren" buttons (Link to `/login`, `/register`).
- If logged in: avatar dropdown (shadcn `DropdownMenu`) with display name, "Abmelden" → calls `signOut()`.

## Validation

- Use `zod` schemas client-side: email format, password min 8, display name 1–80 chars.
- Show inline errors via `react-hook-form` + shadcn `Form`.

## Out of scope

- Password reset page (can add later — note: would require `/reset-password` route).
- Role-based access, protected routes (no `_authenticated` layout needed yet).
- Changes to chat/packages flow.

## Files touched

- New: migration; `src/routes/login.tsx`, `src/routes/register.tsx`, `src/hooks/use-auth.tsx`.
- Edited: `src/routes/__root.tsx` (provider + invalidation), `src/routes/index.tsx` (header auth buttons).
