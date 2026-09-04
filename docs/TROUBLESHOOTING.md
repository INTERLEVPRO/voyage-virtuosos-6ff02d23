# Troubleshooting

Only issues that are traceable to the actual implementation or that were encountered in this project are listed.

---

```text
Problem:  Chat or "Plan ändern" answers "KI-Dienst ist derzeit nicht verfügbar."
Cause:    resolveAiBackend() in src/lib/ai-gateway.ts returns null because
          OPENAI_API_KEY is not set in the runtime environment.
Solution: Provide OPENAI_API_KEY as a project secret / environment variable.
Verify:   Send a complete travel brief; /api/chat must respond 200 with German text.
```

```text
Problem:  /api/refine-package returns 502.
Cause:    The AI call failed or the model output did not pass packageSchema
          validation. In this project it was previously caused by an exhausted
          OpenAI credit balance.
Solution: Check the OpenAI account balance/key; retry. The server logs
          "[refine-package] generation failed".
Verify:   Trigger a quick chip such as "Günstiger machen" and expect 200.
```

```text
Problem:  Packages appear but nothing is written to the database.
Cause:    SUPABASE_SERVICE_ROLE_KEY is missing or the insert failed. Persistence
          errors are caught and intentionally treated as non-fatal.
Solution: Ensure the service-role key is available in the runtime environment.
Verify:   A new row appears in trip_requests and three rows in packages, and the
          package ids in the UI are UUIDs instead of "basic-<timestamp>-0".
```

```text
Problem:  A refined package is not persisted.
Cause:    /api/refine-package only updates the packages row when the package id
          is a UUID; generated fallback ids such as "refined-<timestamp>" are skipped.
Solution: Expected behaviour when the original insert did not happen. Fix the
          persistence issue above first.
Verify:   The refined package keeps its UUID id in the response.
```

```text
Problem:  No ratings shown on packages.
Cause:    FIRECRAWL_API_KEY missing, the Firecrawl lookup failed, or the 5 s
          ratings race expired. Ratings without a URL are never displayed.
Solution: Set FIRECRAWL_API_KEY, or accept the empty state (by design).
Verify:   Ratings with links appear in the package detail view.
```

```text
Problem:  Production error such as "Sa is not a function" / "Xl is not a function".
Cause:    Historic issue caused by manualChunks in vite.config.ts splitting the
          React vendor chunk.
Solution: Do not reintroduce manualChunks in vite.config.ts.
Verify:   Load the published site and check the browser console is clean.
```

```text
Problem:  React hydration mismatch on the homepage hero.
Cause:    Historic issue from random particle positions.
Solution: Keep HERO_PARTICLES deterministic (Math.sin based) in src/routes/index.tsx.
Verify:   No hydration warning in the console on first load of "/".
```

```text
Problem:  The loading progress bar reaches 100% before packages are shown.
Cause:    Historic issue; the bar is now capped at 96% until the packages arrive.
Solution: Keep the cap in ChatPanel.tsx.
Verify:   Generate a package set and watch the bar stop at 96% until results render.
```

```text
Problem:  Horizontal scrolling / drift on mobile.
Cause:    Wide content plus default touch behaviour.
Solution: Keep overflow-x: clip, overscroll-behavior-x: none and touch-action: pan-y
          in src/styles.css.
Verify:   Swipe horizontally on a phone viewport; the page must not move sideways.
```

```text
Problem:  Destination and origin end up identical (e.g. both "Chennai").
Cause:    A short follow-up answer leaked into destination extraction.
Solution: The guard in /api/chat recovers the destination from route patterns
          ("X nach Y", "X to Y"). Keep extractRouteParts and the guard intact.
Verify:   Enter "Chennai to Jaffna" and check the package destination is Jaffna.
```

```text
Problem:  A build error mentions FileRoutesByPath or a missing route.
Cause:    A Link/navigate target has no route file, or src/routeTree.gen.ts is stale.
Solution: Create the missing file under src/routes. Never edit routeTree.gen.ts.
Verify:   bun run build completes without route type errors.
```

```text
Problem:  Reads from trip_requests or packages fail from the browser.
Cause:    The public read policies were dropped in migration 20260525043059 and
          no replacement policies exist.
Solution: Expected. These tables are server-only today. Adding client reads
          requires new RLS policies and GRANTs — confirm with the project owner.
Verify:   No client-side query of these tables exists in src/.
```
