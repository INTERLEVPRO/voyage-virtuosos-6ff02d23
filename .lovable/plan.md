## Goal

Transform the current chat-only experience into the full **Weltweit Urlaub** funnel from your handoff doc: AI chat → 3 package cards (Basic / Medium / Premium) → detail page with affiliate booking links, all in German, with Supabase persistence and click tracking.

## Scope (MVP — matches your handoff)

In:
- German UI + slogan *"Reise planen in 2 Minuten"*
- Structured 3-tier package output from the AI
- Package results grid + detail page
- Affiliate buttons only on detail page
- Supabase tables: `trip_requests`, `packages`, `affiliate_clicks`
- Click tracking endpoint

Out (later phase):
- Real Booking / Amadeus / GetYourGuide APIs (placeholder affiliate URLs for now)
- Auth / "My Trips" (no login required for MVP)

## Build steps

**1. Types** — `src/types/travel.ts` with `TravelPackage`, `ItineraryDay`, `BookingLinks` exactly per handoff.

**2. AI pipeline rewrite** — `src/routes/api/chat.ts`
- Keep Concierge for small-talk / data gathering (German prompts).
- When planning brief is complete, run Research → Itinerary agents, then a final **Packager agent** that uses AI SDK `Output.object` (Zod schema) to emit `{ status: "packages_ready", packages: [3] }` — Basic/Medium/Premium with budgets at 0.85x / 1.0x / 1.15x.
- Stream the JSON back as a single text part wrapped in a fenced ```json block so `useChat` still works without a custom transport.
- Persist `trip_requests` + `packages` rows server-side, return DB ids inside each package.

**3. ChatPanel** — accept `onPackagesReady(packages)` prop. After each assistant message arrives, scan for the JSON block, parse, call the callback. Translate UI strings + starter prompts to German.

**4. New components**
- `PackageCard.tsx` — tier label, title, destination, price, rating, match score, badges, CTA *"Paket ansehen"*. No booking links.
- `PackageResults.tsx` — heading *"Deine Reisevorschläge"*, 3-col grid.
- `PackageDetail.tsx` — hero, overview, flight, hotel, activities, day-by-day, sticky booking box with *Hotel buchen / Flug ansehen / Aktivitäten buchen* buttons. Each click POSTs to `/api/track-click` then opens link in new tab.

**5. Index route** — 3-state render: chat → results → detail, with back navigation.

**6. Click tracking** — `src/routes/api/track-click.ts` (POST) inserts into `affiliate_clicks`, returns 200.

**7. Supabase migration** — three tables per handoff. Public insert policies (no auth in MVP); reads server-side via service role.

**8. Branding** — hero headline, header badge, chat subtitle in German per handoff.

## Technical details

- Model: keep `google/gemini-3-flash-preview`.
- Structured output: `generateText` + `Output.object(z.object({ packages: z.array(packageSchema).length(3) }))` for the final agent — avoids brittle prompt-only JSON.
- Stream the final structured result as a single message containing both a short German intro paragraph + a fenced ```json … ``` block; `ChatPanel` extracts via regex.
- Affiliate URLs stored in `packages.data` jsonb; placeholder URLs (booking.com / skyscanner / getyourguide) for MVP.
- Click tracking uses `supabaseAdmin` (server route under `/api/`, not `/api/public/`, since called from same origin).
- All new copy in German; keep code/comments in English.

## Out-of-scope reminders

- No auth, no saved trips list, no PDF export, no map view — those can come after MVP ships.
- Real travel APIs deferred until you provide keys (Amadeus / Booking partner / GetYourGuide).

After you approve, I'll run the Supabase migration first, then implement files in the order above.