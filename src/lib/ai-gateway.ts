import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Resolves an AI provider + model id from the direct OpenAI key.
 * (No Lovable AI gateway fallback per project requirement.)
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

