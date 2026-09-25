# Fix: Chat misreads short messages like "hi"

## The bug (from the screenshot)
When someone types "hi", the assistant skips "Wohin soll es gehen?" and the welcome message. It jumps straight to the budget question. So the chat treats "hi" (or the AI's guess about it) as a destination and other details that were never given.

## Cause (confirmed in the code, exact source still to pin down)
- The check for "do we already know the destination?" accepts a destination from three sources: a loose text pattern, earlier dialog answers, and the AI's own guess. None of these sources are checked against the existing list of filler words ("hi", "hallo", "ok", "ja", ...).
- Other details (duration, travelers, origin, month, interests) also accept the AI's guess without checking.
- The friendly welcome only shows when 5 or more details are missing. Once wrong details count as known, the welcome is skipped too.

## Fix
1. **Greetings and filler get a proper reply.** If a message contains only a greeting or filler word, show the welcome text with the example and ask where the trip should go. No details are extracted from it.
2. **Check every destination source against the filler list.** A destination such as "hi", "hallo" or "ok" never counts, no matter where it came from.
3. **Only trust the AI's guess when the user actually wrote it.** A detail from the AI counts only when matching words appear in the user's own messages (for example a number for travelers or duration, or a place name for the destination). This stops invented details.
4. **Keep last turn's fixes:** no repeated questions, all details read from one message, and the latest answer wins.

## How it will be tested
Tests go directly against the chat. Each case should get these replies:
- "hi" gets the welcome and the destination question
- "hallo" then "Mallorca" asks for the next missing detail, not the destination again
- "hi, 7 Tage Mallorca zu zweit, 1500 €, ab Frankfurt im Juni, Strand" goes straight to the summary
- The earlier Sri Lanka and "3000 insgesamt" flows still produce packages

## Technical details
- File: `src/routes/api/chat.ts`, in the `has` / `fieldHas` block (about lines 2380–2460) and `buildConciergeReply`.
- Add `isGreetingOnly(lastUserText)` and return the welcome early.
- Run `isStopDestination(stripCopula(...))` on `regexSignals`, `dialogPreview.destination` and `extracted.destination`.
- Gate `llmHas[field]` behind a check that the value appears in `userHistory`.
- Log the extracted values for "hi" first to confirm which source is at fault.
