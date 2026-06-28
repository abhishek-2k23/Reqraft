import { and, db, eq } from "@repo/database";
import { featureRequests, members, prds, tasks, usersTable } from "@repo/database/schema";

import { generateTasks, type Developer } from "@/features/ai/task-generator";

import { inngest } from "../client";

export const generateTasksFunction = inngest.createFunction(
  { id: "generate-tasks", triggers: [{ event: "prd/approved" }] },
  async ({ event, step }) => {
    const { featureId } = event.data as { featureId: string };

    const { prd, feature } = await step.run("fetch-prd", async () => {
      const [record] = await db
        .select()
        .from(prds)
        .where(eq(prds.featureId, featureId));

      const [feat] = await db
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, featureId));

      if (!record || !feat) throw new Error(`PRD or feature not found for ${featureId}`);
      return { prd: record, feature: feat };
    });

    await step.run("set-planning", async () => {
      await db
        .update(featureRequests)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(featureRequests.id, featureId));
    });

    // Fetch developers in the org so the AI can assign tasks to real people
    const developers = await step.run("fetch-developers", async (): Promise<Developer[]> => {
      const rows = await db
        .select({ userId: usersTable.id, name: usersTable.name })
        .from(members)
        .innerJoin(usersTable, eq(members.userId, usersTable.id))
        .where(
          and(
            eq(members.organizationId, feature.organizationId),
            eq(members.role, "developer"),
          ),
        );

      return rows.map((r) => ({ userId: r.userId, name: r.name, skills: [] }));
    });

    const generatedTasks = await step.run("ai-generate-tasks", async () =>
      generateTasks({
        problemStatement: prd.problem,
        goals: JSON.parse(prd.goals) as string[],
        nonGoals: JSON.parse(prd.nonGoals) as string[],
        acceptanceCriteria: JSON.parse(prd.acceptanceCriteria) as string[],
        edgeCases: JSON.parse(prd.edgeCases) as string[],
        developers,
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
          assignedTo: task.assignedTo,
          order: index,
        })),
      );
      await db
        .update(featureRequests)
        .set({ status: "tasks_ready", updatedAt: new Date() })
        .where(eq(featureRequests.id, featureId));
    });

    return { featureId, taskCount: generatedTasks.length, developerCount: developers.length };
  },
);
