import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  generateObject,
  streamObject,
  streamText,
  type LanguageModel,
} from "ai";

import type { AgentProvider } from "@repo/database/schema";

import { formatContextForPrompt, type RepoContext } from "@/features/copilot/server/repo-context";

import { agentPlanSchema, type AgentPlan } from "../plan-schema";

/**
 * Resolve a LanguageModel for the user's own (decrypted) API key. The key is
 * used for this one request and never persisted in plaintext or logged.
 */
export function resolveByokModel(
  provider: AgentProvider,
  modelId: string,
  apiKey: string,
): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
  }
}

export type AgentTaskContext = {
  title: string;
  description: string;
  type: string;
  status: string;
};

export type AgentRunInput = {
  provider: AgentProvider;
  modelId: string;
  apiKey: string;
  prompt: string;
  /**
   * The repo's AI context, already loaded from the `repo_context` DB snapshot
   * by the caller. Passed in (not re-read here) so a run is a single DB read +
   * one model call — nothing is re-fetched from GitHub at generation time.
   */
  context: RepoContext;
  /** PRD problem + acceptance criteria, when a feature is selected. */
  prd?: { problem: string; acceptanceCriteria: string[] } | null;
  /** The tasks the user selected to implement (task-wise coding). */
  tasks?: AgentTaskContext[] | null;
  /** Earlier turns of this Agent conversation, oldest first. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

const SYSTEM_PROMPT = `You are a senior engineer implementing a change in an EXISTING repository, working from a PRD and its task breakdown.

Scope — follow strictly:
- You only help with THIS repository: its code, the linked PRD, its feature/tasks, and directly related engineering questions (architecture, testing, debugging of this code).
- Act on the LATEST user message only. Earlier turns are context for follow-ups — never regenerate or extend a previous change set unless the latest message explicitly asks you to.
- If the latest message is a question or discussion (not a request to implement something), answer it in "summary" and return empty "questions", "plan" and "files" arrays and an empty "prDescription".
- If decisions from the user are needed before you can implement safely (naming, missing backend, stack constraints, scope conflicts), put ONE decision per entry in "questions" with its options spelled out inline, keep "summary" to a single line saying what you're blocked on, and return empty "plan"/"files"/"prDescription". Never bury questions inside summary or notes.
- If the latest message is unrelated to this repository, its PRD, or software engineering on it, do NOT comply: briefly say in "summary" that you only help with this repo's PRD-driven code generation and related coding questions, and return empty "plan"/"files".

When implementing:
Match the repo's stack, file layout, naming, and import conventions exactly — reuse existing utilities and paths rather than inventing new ones.
For every file you touch, output its complete resulting contents (not a diff) so it can be committed directly. Keep the change set as small as possible.
Write the prDescription as the actual PR body a reviewer would read: summary of changes, how they satisfy the PRD acceptance criteria / tasks, and how to test.
If something can't be done safely without more info, say so in notes rather than guessing.`;

// Build the system + messages for a run. Pure — no I/O — so both the batch and
// streaming entry points share exactly the same prompt.
function buildRequest(input: AgentRunInput): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const prdBlock = input.prd
    ? `\nLinked PRD:\nProblem: ${input.prd.problem}\nAcceptance criteria:\n${input.prd.acceptanceCriteria
        .map((c) => `- ${c}`)
        .join("\n")}\n`
    : "";
  const tasksBlock = input.tasks?.length
    ? `\nTasks to implement (code task-wise — each task should be clearly addressed):\n${input.tasks
        .map((t) => `- [${t.type}] ${t.title} (${t.status}): ${t.description}`)
        .join("\n")}\n`
    : "";

  return {
    system: SYSTEM_PROMPT,
    messages: [
      ...(input.history ?? []),
      {
        role: "user" as const,
        content: `${formatContextForPrompt(input.context)}
${prdBlock}${tasksBlock}
Request: ${input.prompt}`,
      },
    ],
  };
}

/**
 * The BYOK coding agent (batch). Reasons over the preloaded repo context plus
 * the feature's PRD and selected tasks, and returns a full implementation plan
 * with file contents and a ready-to-use PR title/description.
 */
export async function generateAgentPlan(input: AgentRunInput): Promise<AgentPlan> {
  const { object } = await generateObject({
    model: resolveByokModel(input.provider, input.modelId, input.apiKey),
    schema: agentPlanSchema,
    ...buildRequest(input),
  });
  return object;
}

/**
 * Streaming variant — returns the `streamObject` result so the caller can relay
 * the stream to the client (files/plan appear as they're written) and
 * `await result.object` for the validated final plan. `abortSignal` lets the
 * caller cancel the provider call (e.g. when the client disconnects).
 */
export function streamAgentPlan(input: AgentRunInput, abortSignal?: AbortSignal) {
  return streamObject({
    model: resolveByokModel(input.provider, input.modelId, input.apiKey),
    schema: agentPlanSchema,
    abortSignal,
    ...buildRequest(input),
  });
}

/**
 * Continuation variant — used when a previous invocation streamed part of the
 * plan JSON but hit the serverless time budget (or the client disconnected)
 * before finishing. We can't resume a `streamObject` call, so we replay the
 * original request, prefill the assistant turn with the JSON produced so far,
 * and ask the model to emit ONLY the remaining characters. The caller
 * concatenates the two halves — the client parses the whole thing as partial
 * JSON exactly as it does for a single-shot run.
 *
 * Returns a `streamText` result; read `result.textStream` for the remainder.
 */
export function continueAgentPlan(
  input: AgentRunInput,
  partialJson: string,
  abortSignal?: AbortSignal,
) {
  const { system, messages } = buildRequest(input);
  return streamText({
    model: resolveByokModel(input.provider, input.modelId, input.apiKey),
    system,
    abortSignal,
    messages: [
      ...messages,
      // The partial JSON already produced, replayed as the assistant's turn.
      { role: "assistant" as const, content: partialJson },
      {
        role: "user" as const,
        content:
          "Your previous JSON response was cut off before it finished. Continue the SAME JSON object from EXACTLY where it stopped. Output ONLY the remaining characters needed to complete and close the single JSON object — do not repeat any earlier content, do not restart the object, and do not wrap the output in markdown code fences or add any explanation.",
      },
    ],
  });
}
