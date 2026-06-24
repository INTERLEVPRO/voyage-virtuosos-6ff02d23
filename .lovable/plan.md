## Problem

On https://weltweiturlaub.de the chat is "dead": Schnellstart cards don't click, send button doesn't react, only the frontend UI shows. Locally everything works because we replaced `useChat` (AI SDK) with a custom `fetch`-based client in `src/components/ChatPanel.tsx`. The deployed bundle still contains the older broken build.

## Plan

1. Verify the live bundle is stale (compare deployed JS hash vs current source behavior).
2. Re-run `preview_ui--publish` so the latest `ChatPanel.tsx` (custom chat client) and the working `/api/chat` server route ship to weltweiturlaub.de.
3. After deploy, smoke-test the live domain:
   - POST `/api/chat` returns a streaming SSE response
   - Quickstart card click triggers a request
   - Typing + send/Enter triggers a request and shows the assistant reply
4. If a Schnellstart card still doesn't trigger after redeploy, inspect its handler in `ChatPanel.tsx` — it must call the same `submit()` path as the send button, not the old `useChat` `append`.

## Notes for the user (plain language)

The backend (`/api/chat`) is already working on the live domain — I tested it directly and it streamed a German reply. The reason the buttons feel dead is that the published site is still running the old frontend code. Republishing pushes the fixed chat code live, and then the cards + send button + Enter will all work.

No database, no env vars, no secret changes needed.
