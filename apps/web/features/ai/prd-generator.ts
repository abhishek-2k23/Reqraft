import {
  generatePrdMarkdown,
  type PrdDraft,
} from "@repo/services/shipflow/agents";

export function generatePrdFromDraft(draft: PrdDraft) {
  return generatePrdMarkdown(draft);
}

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export type GeneratePrdInput = {
  title: string;
  description: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function generatePrd(input: GeneratePrdInput) {
  const conversation = input.messages.map(m => `**${m.role === 'user' ? 'User' : 'Assistant'}**: ${m.content}`).join('\n\n');

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      problemStatement: z.string().describe('Clear explanation of the user problem to solve'),
      goals: z.array(z.string()).describe('List of project goals'),
      nonGoals: z.array(z.string()).describe('List of out-of-scope non-goals'),
      userStories: z.array(z.string()).describe('User stories in the format "As a [type of user], I want [some goal] so that [some reason]"'),
      acceptanceCriteria: z.array(z.string()).describe('Clear, testable acceptance criteria'),
      edgeCases: z.array(z.string()).describe('List of edge cases to consider'),
      successMetrics: z.array(z.string()).describe('Metrics to determine if the feature was successful')
    }),
    system: "You are an expert product manager. Given a feature title, description, and chat conversation context, generate a comprehensive and highly structured Product Requirements Document (PRD). Make sure the PRD is actionable, focused, and covers all essential requirements.",
    prompt: `Feature Title: ${input.title}\nDescription: ${input.description}\n\nConversation Context:\n${conversation}`
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

  return {
    ...object,
    rawMarkdown,
    conversationSummary: input.messages.map((message) => message.content).join("\n"),
  };
}
