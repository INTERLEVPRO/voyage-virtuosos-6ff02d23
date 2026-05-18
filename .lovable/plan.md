# Home page: structured intake form (matches reference)

Replace the chat composer on the right side of the home page with a clean structured form like the reference image. The form collects all key trip details once, then sends a single composed prompt to the existing AI agent — same backend, same package generation, same refinement/affiliate flow.

## What changes

Only the home page right column. Everything else (agent, /api/chat, package generation, PackageResults, PackageDetail, refinement, price gate, affiliate tracking) stays exactly as is.

## Form fields (match reference)

1. Travel dates — date range picker (e.g. 20.06.2025 – 27.06.2025)
2. Budget (total) — number input in € (e.g. 2000)
3. Departure airport — select (Frankfurt FRA, München MUC, Berlin BER, Hamburg HAM, Düsseldorf DUS, Wien VIE, Zürich ZRH, + "Andere")
4. Number of travelers — select (1–6 Adults, with optional kids note)
5. Destination / Region — text input with suggestions (Portugal – Algarve, Mallorca, Bali, …) — free text allowed
6. What kind of vacation — multi-chip select (Beach, Relaxation, City, Culture, Adventure, Wellness, Family, Honeymoon, Food, Nature)

Primary CTA: **„Meinen perfekten Urlaub finden ✨"** (green, full width).
Below CTA: small lock line „Deine Daten sind sicher und werden nicht weitergegeben."
Bottom trust row keeps the 3 badges: Einfach · Persönlich · Top bewertet (already exists).

## Submission flow

On submit:
1. Validate required fields (dates, budget, airport, travelers, destination, ≥1 vacation type).
2. Build a single German prompt string from the answers, e.g.:
   `"Reiseziel: Portugal – Algarve. Reisedaten: 20.06.2025–27.06.2025 (7 Nächte). Reisende: 2 Erwachsene. Budget: 2000€ gesamt. Abflug: Frankfurt (FRA). Stil: Beach, Relaxation."`
3. Call existing `/api/chat` via the same `useChat`/`DefaultChatTransport` already used in `ChatPanel` — send that composed prompt as the first user message.
4. While streaming, show the same "Agent stages" loader currently in `ChatPanel` (Concierge hört zu… → Research-Agent … → Pakete werden zusammengestellt…) — full-card loading state, no chat bubbles.
5. When the assistant message contains the `packages_ready` JSON block, parse it with the existing `extractPackages` helper and call `setPackages(...)` on the home route — this triggers the existing `PackageResults` view exactly as today.

No new API, no schema change, no edge function, no change to refinement or PackageDetail.

## Files

- New: `src/components/TripIntakeForm.tsx`
  - Self-contained form + submit + agent-stage loader.
  - Uses `useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) })` internally (same as ChatPanel) and exposes `onPackagesReady` callback.
  - Reuses existing `extractPackages` logic (extract into a tiny shared util `src/lib/extract-packages.ts` and import from both ChatPanel and the new form, so behavior stays identical).
- Edited: `src/routes/index.tsx`
  - Replace `<ChatPanel onPackagesReady={setPackages} />` with `<TripIntakeForm onPackagesReady={setPackages} />`.
  - Keep left greeting card, header, footer, trust badges.
- Untouched: `ChatPanel.tsx` stays in repo (still used nowhere on home but kept for potential reuse); we can delete later if you confirm. All other files unchanged.

## Technical notes

- Date range: use a lightweight inline date input pair (`<input type="date">` × 2) styled to match — avoids adding a heavy calendar dependency. Display formatted summary in the field.
- Vacation type chips: toggle buttons with `aria-pressed`, primary tint when selected.
- Validation: inline error text under each invalid field; CTA disabled until all required fields filled.
- Form layout: stacked rows with leading icon (Calendar, Euro, Plane, Users, MapPin, Heart) matching reference exactly.
- Mobile-first; the existing two-column grid collapses to single column on small screens.
- No backend changes — `/api/chat` still receives a normal user text message.

Confirm and I'll implement.
