import { eq } from "@repo/database";
import { featureRequests, prds } from "@repo/database/schema";

import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

function parsePrd(record: typeof prds.$inferSelect) {
  return {
    ...record,
    goals: JSON.parse(record.goals) as string[],
    nonGoals: JSON.parse(record.nonGoals) as string[],
    userStories: JSON.parse(record.userStories) as string[],
    acceptanceCriteria: JSON.parse(record.acceptanceCriteria) as string[],
    edgeCases: JSON.parse(record.edgeCases) as string[],
    successMetrics: JSON.parse(record.successMetrics) as string[],
  };
}

const getByFeatureProcedure = orgProcedure
  .input(z.object({ featureId: z.string() }))
  .query(async ({ ctx, input }) => {
    const [prd] = await ctx.db
      .select()
      .from(prds)
      .where(eq(prds.featureId, input.featureId));

    return prd ? parsePrd(prd) : null;
  });

export const prdRouter = router({
  byFeature: getByFeatureProcedure,
  getByFeature: getByFeatureProcedure,

  approve: orgProcedure
    .input(z.object({ prdId: z.string(), featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(prds)
        .set({ approvedBy: ctx.session.user.id, approvedAt: new Date() })
        .where(eq(prds.id, input.prdId));

      await ctx.db
        .update(featureRequests)
        .set({ status: "tasks_ready", updatedAt: new Date() })
        .where(eq(featureRequests.id, input.featureId));

      return { success: true };
    }),
});
