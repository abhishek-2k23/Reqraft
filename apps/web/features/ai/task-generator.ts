
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export type GeneratedTask = {
  title: string;
  description: string;
  type: "frontend" | "backend" | "database" | "infra" | "testing" | "docs";
  priority: "p0" | "p1" | "p2" | "p3" | "p4";
  status: "todo";
};

export type GenerateTasksInput = {
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  acceptanceCriteria: string[];
  edgeCases: string[];
};

export async function generateTasks(input: GenerateTasksInput): Promise<GeneratedTask[]> {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      tasks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        type: z.enum(["frontend", "backend", "database", "infra", "testing", "docs"]),
        priority: z.enum(["p0", "p1", "p2", "p3", "p4"]),
      }))
    }),
    system: "You are an expert technical product manager and software architect. Break down the provided PRD (Product Requirements Document) into technical tasks. Provide clear and actionable task titles and descriptions. Categorize them appropriately and set priority levels. Output a minimum of 3 tasks and a maximum of 10 tasks.",
    prompt: `PRD Definition:
Problem: ${input.problemStatement}
Goals: ${input.goals.join('; ')}
Non-Goals: ${input.nonGoals.join('; ')}
Acceptance Criteria: ${input.acceptanceCriteria.join('; ')}
Edge Cases: ${input.edgeCases.join('; ')}
`
  });

  return object.tasks.map(task => ({
    ...task,
    status: "todo" as const
  }));
}
