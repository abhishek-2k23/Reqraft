import { generatePrdMarkdown, type PrdDraft } from "@repo/services/shipflow/agents";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export function generatePrdFromDraft(draft: PrdDraft) {
  return generatePrdMarkdown(draft);
}

const prdSchema = z.object({
  problemStatement: z.string().describe("Clear explanation of the user problem being solved"),
  goals: z.array(z.string()).describe("Specific, measurable goals this feature achieves"),
  nonGoals: z.array(z.string()).describe("Explicitly out-of-scope items — what this feature will NOT do"),
  userStories: z
    .array(z.string())
    .describe('User stories in the format "As a [user type], I want [goal] so that [reason]"'),
  acceptanceCriteria: z.array(z.string()).describe("Concrete, testable criteria that define done"),
  edgeCases: z.array(z.string()).describe("Edge cases and boundary conditions to handle"),
  successMetrics: z
    .array(z.string())
    .describe("Quantitative metrics to measure success post-launch"),
  technicalRequirements: z
    .array(z.string())
    .describe(
      "Technical requirements, architecture decisions, API contracts, and implementation constraints for developers",
    ),
  dependencies: z
    .array(z.string())
    .describe(
      "External services, internal systems, third-party libraries, or team dependencies required",
    ),
  risks: z
    .array(z.string())
    .describe(
      'Potential risks and mitigations in the format "Risk: [risk] — Mitigation: [mitigation]"',
    ),
  estimatedTotalHours: z
    .number()
    .int()
    .nullable()
    .describe(
      "Realistic total development hours estimate covering design, implementation, testing, and review. Null only if truly impossible to estimate.",
    ),
});

export type PrdContent = z.infer<typeof prdSchema>;

const PRD_SYSTEM_PROMPT = `You are a senior product manager writing a production-quality PRD.
The PRD must be actionable for both managers (who need business context and success metrics) and developers (who need technical detail and acceptance criteria).
Be specific and concrete — avoid vague language. Include realistic effort estimates.`;

export type GeneratePrdInput = {
  title: string;
  description: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function generatePrd(input: GeneratePrdInput): Promise<PrdContent & { rawMarkdown: string }> {
  const conversation = input.messages
    .map((m) => `**${m.role === "user" ? "User" : "Assistant"}**: ${m.content}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: prdSchema,
    system: PRD_SYSTEM_PROMPT,
    prompt: `Feature Title: ${input.title}\nDescription: ${input.description}\n\nClarification conversation:\n${conversation || "(none)"}`,
  });

  const rawMarkdown = generatePrdMarkdown({
    title: input.title,
    problem: object.problemStatement,
    goals: object.goals,
    nonGoals: object.nonGoals,
    userStories: object.userStories,
    acceptanceCriteria: object.acceptanceCriteria,
    edgeCases: object.edgeCases,
    successMetrics: object.successMetrics,
  });

  return { ...object, rawMarkdown };
}

export type EditPrdInput = {
  currentPrd: PrdContent;
  editPrompt: string;
};

export async function editPrdWithAI(input: EditPrdInput): Promise<PrdContent & { rawMarkdown: string }> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: prdSchema,
    system: `${PRD_SYSTEM_PROMPT}\nYou are updating an existing PRD. Apply only the changes requested. Preserve all sections not mentioned in the edit request. Keep the same level of detail and structure.`,
    prompt: `CURRENT PRD:\n${JSON.stringify(input.currentPrd, null, 2)}\n\nEDIT REQUEST:\n${input.editPrompt}`,
  });

  const rawMarkdown = generatePrdMarkdown({
    title: "PRD",
    problem: object.problemStatement,
    goals: object.goals,
    nonGoals: object.nonGoals,
    userStories: object.userStories,
    acceptanceCriteria: object.acceptanceCriteria,
    edgeCases: object.edgeCases,
    successMetrics: object.successMetrics,
  });

  return { ...object, rawMarkdown };
}
