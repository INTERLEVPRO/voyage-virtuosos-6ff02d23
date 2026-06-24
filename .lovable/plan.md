## Problem

The chat backend (`src/routes/api/chat.ts`) extracts and remembers travel data unreliably:

1. When the bot asks for an airport and the user replies with a city, the city overwrites the **destination** instead of only filling **origin**.
2. Routes like *"von Jaffna nach Indien"* / *"India to Sri Lanka"* aren't parsed into `{origin, destination}` reliably (current `extractRouteParts` only matches the literal `India → Sri Lanka` pair).
3. Duration phrasings *"eine Woche"*, *"vom 30. Juni bis zum 5. Juli"* aren't always captured → bot re-asks.
4. Budget is shown as **"pro Person"** even when the user just says *"Budget 5.000 €"* (the trip-confirmation reply hardcodes "pro Person").
5. Country-only origins (e.g. *"India"*, *"Indien"*) are accepted as a valid `origin` — should trigger "Von welcher Stadt/Flughafen in …?".
6. Route text like *"indiya to srilanka"* leaks into the `interests` field.
7. Loading screen renders `… perfektes dein Traumziel-Paket zusammen…undefined` when no destination is detected on the client.

## Fix Plan

### A. Backend — `src/routes/api/chat.ts`

1. **Generalize route parsing** (`extractRouteParts`)
   - Match `von X nach Y`, `from X to Y`, `X to Y`, `X → Y`, `X -> Y`, `X bis Y` for any place names (not just India↔Sri Lanka).
   - Normalize both sides via `normalizePlaceName` (extended to common country aliases: srilanka→Sri Lanka, indiya→Indien, germany→Deutschland, etc.).
   - Return `{origin, destination}`; used by both `extractOrigin` and `extractDestination`.

2. **Lock fields once answered** (destination overwrite fix)
   - When the assistant's last question was `origin`, run a guarded `extractFieldAnswer("origin", reply)` that:
     - rejects route-like text,
     - rejects pure country names (see step 4),
     - never touches `destination`.
   - In the final resolution block (lines ~1208–1216), prefer the *earliest* validly-extracted destination (from history / route-parse) over any later free-text reinterpretation, unless the user explicitly says *"eigentlich/lieber/statt … nach X"*.

3. **Duration parsing**
   - Extend `parseAnswerDurationDays` / `parseDurationDays` to accept word-form `"eine Woche"`, `"eine halbe Woche"`, `"zwei Wochen"`, and treat `parseDateRangeDays` result as duration even when phrased with "vom … bis zum …".
   - Add `vom` / `zum` tolerance in the date-range regex.
   - When duration OR a date range is present, mark `hasDuration = true` so the bot stops asking.

4. **Country-only origin guard**
   - Maintain a small set `COUNTRY_ONLY = {indien, india, sri lanka, deutschland, germany, türkei, …}`.
   - In `isAnswerValid("origin", …)` and final validation gate, if the resolved origin matches `COUNTRY_ONLY`, treat origin as **missing** and ask `Von welcher Stadt oder welchem Flughafen in <Land> möchtest du abfliegen?` (new branch in `formatMissingField`).

5. **Budget total vs per-person**
   - Add `parseBudgetType(text)`: returns `"perPerson"` if text contains `pro person|p\.?p\.?|per person|je person|pro kopf`, else `"total"`.
   - Store it alongside the amount and pass through to `buildTripConfirmationReply`:
     - `total` → `"5.000 € insgesamt"` and ask `Sind die 5.000 € insgesamt oder pro Person?` (only if not explicit).
     - `perPerson` → keep `"… € pro Person"`.
   - Default to `total` (current code wrongly hardcodes per-person).

6. **Interests sanitization**
   - In `extractInterests`, drop any token that matches the route regex, contains `to|nach|bis|→|->`, or is a place name already used as origin/destination.
   - Whitelist real interest words (Strand, Kultur, Natur, Tempel, Shopping, Sehenswürdigkeiten, Wellness, Abenteuer, Kulinarik, …) before falling back to free text.

7. **Validation gate** (already exists near line 1253) — extend with the new rules above (country-only origin = missing, etc.) so the bot asks for the missing field instead of generating wrong packages.

### B. Frontend — `src/components/ChatPanel.tsx`

8. **Loading text bug** (`buildGenericGuide` + `FullScreenTypingLoader` ~lines 695–730)
   - When no destination is detected, render `"Ich stelle jetzt dein perfektes Traumziel-Paket zusammen…"` (drop the leading `dein`, drop trailing `undefined`).
   - Inspect the section array for any `undefined` concatenation (`base.sections[0]` may be undefined for guides with only intro+closing) and guard with `?? ""`.

### C. Tests (manual, against `/api/chat` on dev)

Run the three regression cases from the report and confirm:

- **Case A** *"indiya to srilanka"* + follow-up → `Reiseziel: Sri Lanka`, `Abflug` = ask for city in Indien, `Interessen` ≠ "indiya to srilanka".
- **Case B** *"Ich reise von Jaffna nach Indien …"* (full sentence) → no re-ask for duration/origin, interests = Tempel + Shopping.
- **Case C** *"Sri Lanka → Deutschland …"* + reply *"colombo jayawathinapura airport"* → destination stays **Deutschland**, origin becomes **Colombo Jayawathinapura Airport**, budget shown as **insgesamt**.

### D. Publish

After the fixes pass locally, republish to `weltweiturlaub.de`.

## Out of Scope

- No DB / schema / auth changes.
- No UI redesign — only the loading-text string fix in `ChatPanel.tsx`.
- The earlier `vite.config.ts` `manualChunks` removal stays as-is.
