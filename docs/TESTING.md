# Testing

## Current testing status
**No automated test suite exists in this project.**

- No test framework is installed (no Vitest, Jest, Playwright or Cypress in `package.json`).
- No `test` script exists in `package.json` (available scripts: `dev`, `build`, `build:dev`, `preview`, `lint`, `format`).
- No `*.test.ts(x)` or `*.spec.ts(x)` files exist in the repository.
- Test coverage: not measured. No coverage numbers are available.

## Existing script
`scripts/test-30days.ts` — an ad-hoc script kept in the repository. It is not wired into any npm script and is not part of a test framework.

## Static checks that do exist
```bash
bun run lint     # ESLint 9 (typescript-eslint, react-hooks, react-refresh, prettier)
bun run format   # Prettier
```
TypeScript type checking runs as part of the build.

## Recommended manual test scenarios
These are the flows that carry the most logic and should be re-checked after changes:

1. **Complete brief** — enter destination, origin, duration, budget, travelers and month in one message; expect a confirmation summary followed by three packages.
2. **Incomplete brief** — omit the budget; expect a German follow-up question. Enter `50 €`; expect the minimum-budget hint (100 €).
3. **Route parsing** — "von Frankfurt nach Bali"; origin and destination must not collapse to the same value.
4. **Long trip** — 30 days; the AI itinerary is skipped and the deterministic builder must still produce 30 days.
5. **Refinement without price gate** — a change with a price delta below 30 € must return `updated` directly.
6. **Refinement with price gate** — "Mehr Luxus"; expect `needs_confirmation` and a working confirm step.
7. **Regenerate-all rejection** — "alle Pakete neu"; expect the `rejected` message.
8. **Weather** — open a package detail and confirm every itinerary day receives a weather entry.
9. **Affiliate tracking** — click a booking button and confirm `POST /api/track-click` returns `{ ok: true }`.
10. **Auth** — register a new account and confirm a `profiles` row is created.
11. **Mobile** — check the calendar popover, touch targets and that no horizontal scrolling occurs.

## Adding tests (not yet done)
Nothing in the project prescribes a framework. Any addition would be a new decision and requires confirmation from the project owner.
