import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const SHIPFLOW_AI_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export type ShipflowAiTextInput = {
  system: string;
  prompt: string;
  fallback: string;
};

export async function generateShipflowText(input: ShipflowAiTextInput) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return input.fallback;
  }

  const result = await generateText({
    model: anthropic(SHIPFLOW_AI_MODEL),
    system: input.system,
    prompt: input.prompt,
  });

  return result.text;
}
