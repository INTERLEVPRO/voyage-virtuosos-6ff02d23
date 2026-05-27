# Plan: Switch from Lovable AI Gateway to OpenAI

## Step 0 — Security (do this FIRST)
- Revoke the leaked key at https://platform.openai.com/api-keys
- Generate a new key
- I'll request it via secure form as `OPENAI_API_KEY` — never paste in chat again

## Step 1 — Store the new key
Add `OPENAI_API_KEY` as a project secret (runtime env var).

## Step 2 — Create OpenAI provider helper
New file `src/lib/openai-provider.ts` using `@ai-sdk/openai` (Vercel AI SDK, already used). All current code uses `streamText` / `generateText` from `ai` — no logic changes needed, only the provider swap.

```ts
import { createOpenAI } from "@ai-sdk/openai";
export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
```
Install: `bun add @ai-sdk/openai`

## Step 3 — Swap model in all 4 agents
Replace in both files:
- `src/routes/api/chat.ts` (concierge + research + itinerary + packager)
- `src/routes/api/refine-package.ts` (refiner)

**Before:**
```ts
const gateway = createLovableAiGatewayProvider(key);
const model = gateway("google/gemini-3-flash-preview");
```
**After:**
```ts
const model = openai("gpt-4o-mini");
```

Also: remove the `LOVABLE_API_KEY` check, replace with `OPENAI_API_KEY` check.

## Step 4 — Model choice
- **`gpt-4o-mini`** — recommended (cheap ≈ $0.15/1M input tokens, fast, JSON-good)
- Can switch to `gpt-4o` later if quality needs upgrade

## Step 5 — Verify
- Test concierge greeting (short reply)
- Test full planning flow → 3 packages German JSON
- Test refine flow on detail page
- Check server logs for errors

## Files touched
- `src/lib/openai-provider.ts` (new)
- `src/routes/api/chat.ts` (edit)
- `src/routes/api/refine-package.ts` (edit)
- `package.json` (+ `@ai-sdk/openai`)

## What stays the same
- All prompts (German concierge, research, itinerary, packager, refiner)
- Zod schemas, DB persistence, UI streaming, booking links, price-gate logic
- Frontend (`ChatPanel`, `PackageCard`, `PackageDetail`, etc.) — zero changes

## Notes
- `LOVABLE_API_KEY` won't be deleted — just unused by these routes. Other Lovable services still need it.
- Billing now goes to your OpenAI account, not Lovable credits — so the 402 error stops.
