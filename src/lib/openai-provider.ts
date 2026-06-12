import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Routes through Lovable AI Gateway. Name kept for backwards compatibility.
export const createOpenAIProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
