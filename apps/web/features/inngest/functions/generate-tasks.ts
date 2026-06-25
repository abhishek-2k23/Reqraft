import { db, eq } from "@repo/database";
import { featureRequests, prds, tasks } from "@repo/database/schema";

import { generateTasks } from "@/features/ai/task-generator";

import { inngest } from "../client";

export const generateTasksFunction = inngest.createFunction(
  { id: "generate-tasks", triggers: { event: "prd/approved" } },
  async ({ event, step }) => {
    const { featureId } = event.data as { featureId: string };

    const prd = await step.run("fetch-prd", async () => {
      const [record] = await db
        .select()
        .from(prds)
        .where(eq(prds.featureId, featureId));

      if (!record) {
        throw new Error(`PRD not found for feature ${featureId}`);
      }

      return record;
    });

    await step.run("set-planning", async () => {
      await db
        .update(featureRequests)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(featureRequests.id, featureId));
    });

    const generatedTasks = await step.run("ai-generate-tasks", async () =>
      generateTasks({
        problemStatement: prd.problem,
        goals: JSON.parse(prd.goals) as string[],
        nonGoals: JSON.parse(prd.nonGoals) as string[],
        acceptanceCriteria: JSON.parse(prd.acceptanceCriteria) as string[],
        edgeCases: JSON.parse(prd.edgeCases) as string[],
      }),
    );

    await step.run("save-tasks", async () => {
      await db.insert(tasks).values(
        generatedTasks.map((task, index) => ({
          id: crypto.randomUUID(),
          prdId: prd.id,
          featureId,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          status: task.status,
          order: index,
        })),
      );
      await db
        .update(featureRequests)
        .set({ status: "tasks_ready", updatedAt: new Date() })
        .where(eq(featureRequests.id, featureId));
    });

    return { featureId, taskCount: generatedTasks.length };
  },
);
