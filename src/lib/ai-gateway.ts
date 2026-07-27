import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Resolves an AI provider + model id from whatever backend key is available.
 * Prefers a direct OpenAI key, falls back to the Lovable AI gateway.
 */
export const resolveAiBackend = () => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${openaiKey}` },
      }),
      modelId: "gpt-4o-mini",
    };
  }

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return {
      provider: createOpenAICompatible({
        name: "lovable",
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: {
          "Lovable-API-Key": lovableKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        },
      }),
      modelId: "openai/gpt-5.4-mini",
    };
  }

  return null;
};

export const createLovableAiGatewayProvider = (openaiApiKey: string) =>
  createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
    },
  });
