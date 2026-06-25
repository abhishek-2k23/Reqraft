import { TRPCError } from "@trpc/server";
import { eq } from "@repo/database";
import { featureRequests } from "@repo/database/schema";

import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

export const approvalRouter = router({
  approve: orgProcedure
    .input(z.object({ featureId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [feature] = await ctx.db
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, input.featureId));

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (feature.status !== "in_review" && feature.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Feature is not ready for approval",
        });
      }

      const [updated] = await ctx.db
        .update(featureRequests)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(featureRequests.id, input.featureId))
        .returning();

      return updated;
    }),

  reject: orgProcedure
    .input(z.object({ featureId: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(featureRequests)
        .set({ status: "blocked", updatedAt: new Date() })
        .where(eq(featureRequests.id, input.featureId))
        .returning();

      return updated;
    }),

  ship: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [feature] = await ctx.db
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, input.featureId));

      if (!feature || feature.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Feature must be approved before shipping",
        });
      }

      const [updated] = await ctx.db
        .update(featureRequests)
        .set({ status: "shipped", updatedAt: new Date() })
        .where(eq(featureRequests.id, input.featureId))
        .returning();

      return updated;
    }),
});
