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
        blockedReason: z.string().nullish(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({
          status: input.status,
          // Clear the blocked reason whenever a task leaves the blocked column
          blockedReason: input.status === "blocked" ? input.blockedReason ?? null : null,
          ...(input.order !== undefined ? { order: input.order } : {}),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),

  // Persist the full board (status + order + blocked reason) after drag-and-drop
  reorder: orgProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            taskId: z.string(),
            status: z.enum(["todo", "in_progress", "done", "blocked"]),
            order: z.number().int(),
            blockedReason: z.string().nullish(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.items.map((item) =>
          ctx.db
            .update(tasks)
            .set({
              status: item.status,
              order: item.order,
              // Reason only persists while a task is in the blocked column
              blockedReason: item.status === "blocked" ? item.blockedReason ?? null : null,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, item.taskId)),
        ),
      );
      return { success: true };
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
