import { desc, eq } from "@repo/database";
import { reviewCycles, reviewIssues } from "@repo/database/schema";

import type { Context } from "../../context";
import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

async function attachIssues(
  ctx: Context,
  cycle: typeof reviewCycles.$inferSelect,
) {
  const issues = await ctx.db
    .select()
    .from(reviewIssues)
    .where(eq(reviewIssues.reviewCycleId, cycle.id));

  return { ...cycle, issues };
}

export const reviewRouter = router({
  listCyclesByFeature: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cycles = await ctx.db
        .select()
        .from(reviewCycles)
        .where(eq(reviewCycles.featureId, input.featureId))
        .orderBy(desc(reviewCycles.createdAt));

      return Promise.all(cycles.map((cycle) => attachIssues(ctx, cycle)));
    }),

  getLatestCycle: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [cycle] = await ctx.db
        .select()
        .from(reviewCycles)
        .where(eq(reviewCycles.featureId, input.featureId))
        .orderBy(desc(reviewCycles.createdAt))
        .limit(1);

      return cycle ? attachIssues(ctx, cycle) : null;
    }),

  resolveIssue: orgProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(reviewIssues)
        .set({ resolved: true })
        .where(eq(reviewIssues.id, input.issueId))
        .returning();

      return updated;
    }),
});
