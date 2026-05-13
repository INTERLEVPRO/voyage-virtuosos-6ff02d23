import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  generateText,
  type UIMessage,
} from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

type ChatRequestBody = { messages?: unknown };

const CONCIERGE_SYSTEM = `You are the Concierge — the warm, charming front-of-house AI for Weltweit Urlaub, a luxury travel atelier.
Your job in this turn is to gently understand what the traveller wants. If destination, dates, budget, travelers, or vibe are missing, ask ONE focused question. Keep replies brief, evocative, and human.
If the user has already provided destination + budget, do NOT ask more questions — just acknowledge and let the orchestrator hand off.`;

const RESEARCH_SYSTEM = `You are the Research Agent. Given a travel brief, produce realistic plausible options for flights and hotels.
Return concise bullet data only — no prose. Format:

FLIGHTS:
- <airline> <route> <approx €price> <duration>
(2-3 options)

HOTELS:
- <name> · <neighborhood> · <€/night> · <one-line vibe>
(3 options across price tiers)`;

const BUDGET_SYSTEM = `You are the Budget Optimizer. Build 3 packages (Essential / Signature / Bespoke) from the research data.
For each: total €, what's included (1-line each), and the ONE reason a traveller would pick it. Be crisp.`;

const ITINERARY_SYSTEM = `You are the Itinerary Architect. Build a day-by-day plan for the trip (use number of days from context, default 5).
Format each day as:
**Day N — <theme>**
Morning · Afternoon · Evening (1 line each, evocative not clinical).`;

const PERSONA_SYSTEM = `You are the Persona Agent — final voice of Weltweit Urlaub.
Take the raw concierge + research + budget + itinerary outputs and weave them into ONE elegant, sensory, story-driven response in markdown.
Tone: like a private travel curator writing to a friend. Warm, specific, never generic. Use markdown headings, short paragraphs, and emoji sparingly (1-2 max).
Always end with a soft invitation: ask if they want to refine any package or detail.`;

function isPlanningRequest(text: string): boolean {
  const t = text.toLowerCase();
  // Heuristic: triggers full multi-agent flow when destination + budget/duration cues are present
  const hasBudget = /\b(\d{2,5})\s?(€|eur|usd|\$)/i.test(text) || /budget/i.test(t);
  const hasDestination = /\b(in|to|visit|trip|travel|holiday|vacation)\b/.test(t) && text.split(" ").length > 4;
  return hasBudget && hasDestination;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("LOVABLE_API_KEY missing", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");
        const uiMessages = messages as UIMessage[];
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastUserText =
          lastUser?.parts
            ?.map((p) => (p.type === "text" ? p.text : ""))
            .join(" ") ?? "";

        const modelMessages = await convertToModelMessages(uiMessages);

        // Decide: plan trip (multi-agent) vs concierge chat
        if (!isPlanningRequest(lastUserText)) {
          const result = streamText({
            model,
            system: CONCIERGE_SYSTEM,
            messages: modelMessages,
          });
          return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
        }

        // Multi-agent orchestration — run agents sequentially, then stream final persona response
        const research = await generateText({
          model,
          system: RESEARCH_SYSTEM,
          prompt: `Travel brief from user:\n"""${lastUserText}"""\nProduce flights & hotels.`,
        });

        const budget = await generateText({
          model,
          system: BUDGET_SYSTEM,
          prompt: `User brief: ${lastUserText}\n\nResearch data:\n${research.text}\n\nBuild 3 packages.`,
        });

        const itinerary = await generateText({
          model,
          system: ITINERARY_SYSTEM,
          prompt: `User brief: ${lastUserText}\n\nResearch:\n${research.text}\n\nBudget packages:\n${budget.text}\n\nBuild itinerary.`,
        });

        const finalStream = streamText({
          model,
          system: PERSONA_SYSTEM,
          prompt: `User brief: ${lastUserText}

=== Research Agent output ===
${research.text}

=== Budget Optimizer output ===
${budget.text}

=== Itinerary Architect output ===
${itinerary.text}

Now compose the final luxurious travel proposal in markdown. Include sections: a poetic intro, "✈️ Getting There", "🏛️ Where You'll Stay", "💎 Your Package Options" (the 3 tiers), "🗺️ Day by Day", and a closing invitation.`,
        });

        return finalStream.toUIMessageStreamResponse({ originalMessages: uiMessages });
      },
    },
  },
});
