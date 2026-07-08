import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

import type { AgentProvider } from "@repo/database/schema";

import { formatContextForPrompt, getRepoContext } from "@/features/copilot/server/repo-context";

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

const agentPlanSchema = z.object({
  title: z.string().describe("Short, PR-ready title for this change (imperative mood)."),
  summary: z
    .string()
    .describe("2-3 sentence reply to the user: what you're building and how it maps to the PRD/tasks."),
  plan: z.array(z.string()).describe("Ordered, concrete implementation steps."),
  files: z
    .array(
      z.object({
        path: z.string().describe("Repo-relative path of the file to create or modify."),
        action: z.enum(["create", "modify"]),
        content: z
          .string()
          .describe("The FULL intended contents of the file after the change (not a diff)."),
        rationale: z.string().describe("Why this file changes."),
      }),
    )
    .describe("Every file that must change, with full resulting content."),
  prDescription: z
    .string()
    .describe(
      "A complete, well-structured PR description in markdown: what changed, why, how it satisfies the PRD/tasks, and testing notes.",
    ),
  notes: z
    .string()
    .describe("Caveats, assumptions, manual follow-ups (migrations, env vars, tests)."),
});

export type AgentPlan = z.infer<typeof agentPlanSchema>;

export type AgentTaskContext = {
  title: string;
  description: string;
  type: string;
  status: string;
};

export type AgentRunInput = {
  repositoryId: string;
  provider: AgentProvider;
  modelId: string;
  apiKey: string;
  prompt: string;
  /** PRD problem + acceptance criteria, when a feature is selected. */
  prd?: { problem: string; acceptanceCriteria: string[] } | null;
  /** The tasks the user selected to implement (task-wise coding). */
  tasks?: AgentTaskContext[] | null;
  /** Earlier turns of this Agent conversation, oldest first. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

/**
 * The BYOK coding agent: reasons over the stored repo context plus the
 * feature's PRD and selected tasks, and produces an implementation plan with
 * full file contents and a ready-to-use PR title/description. Runs entirely on
 * the user's own model + API key.
 */
export async function generateAgentPlan(input: AgentRunInput): Promise<AgentPlan> {
  const context = await getRepoContext(input.repositoryId);
  if (!context) {
    throw new Error(
      "This repository hasn't been analyzed yet. Open its dashboard and generate the AI summary first.",
    );
  }

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

  const { object } = await generateObject({
    model: resolveByokModel(input.provider, input.modelId, input.apiKey),
    schema: agentPlanSchema,
    system: `You are a senior engineer implementing a change in an EXISTING repository, working from a PRD and its task breakdown.
Match the repo's stack, file layout, naming, and import conventions exactly — reuse existing utilities and paths rather than inventing new ones.
For every file you touch, output its complete resulting contents (not a diff) so it can be committed directly. Keep the change set as small as possible.
Write the prDescription as the actual PR body a reviewer would read: summary of changes, how they satisfy the PRD acceptance criteria / tasks, and how to test.
If something can't be done safely without more info, say so in notes rather than guessing.`,
    messages: [
      ...(input.history ?? []),
      {
        role: "user" as const,
        content: `${formatContextForPrompt(context)}
${prdBlock}${tasksBlock}
Request: ${input.prompt}`,
      },
    ],
  });

  return object;
}
