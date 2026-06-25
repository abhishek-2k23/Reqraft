import { asc, eq } from "@repo/database";
import { tasks } from "@repo/database/schema";

import type { Context } from "../../context";
import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

async function listGroupedTasks(ctx: Context, featureId: string) {
  const all = await ctx.db
    .select()
    .from(tasks)
    .where(eq(tasks.featureId, featureId))
    .orderBy(asc(tasks.order));

  return {
    todo: all.filter((task) => task.status === "todo"),
    in_progress: all.filter((task) => task.status === "in_progress"),
    done: all.filter((task) => task.status === "done"),
    blocked: all.filter((task) => task.status === "blocked"),
  };
}

export const taskRouter = router({
  byFeature: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .query(({ ctx, input }) => listGroupedTasks(ctx, input.featureId)),

  listByFeature: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .query(({ ctx, input }) => listGroupedTasks(ctx, input.featureId)),

  updateStatus: orgProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(["todo", "in_progress", "done", "blocked"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),

  assignTo: orgProcedure
    .input(z.object({ taskId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ assignedTo: input.userId, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),
});
