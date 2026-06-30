import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "@repo/database";
import {
  featureRequests,
  pullRequests,
  reviewCycles,
  reviewIssues,
} from "@repo/database/schema";

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
  // Every review cycle in the org (optionally scoped to a project / status), with
  // its feature + PR context joined in — powers the org-wide /reviews table.
  listAllCycles: orgProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          status: z.enum(["running", "passed", "failed"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(featureRequests.organizationId, ctx.org.id)];
      if (input?.projectId) {
        conditions.push(eq(featureRequests.projectId, input.projectId));
      }
      if (input?.status) {
        conditions.push(eq(reviewCycles.status, input.status));
      }

      return ctx.db
        .select({
          id: reviewCycles.id,
          status: reviewCycles.status,
          overallVerdict: reviewCycles.overallVerdict,
          prdComplianceScore: reviewCycles.prdComplianceScore,
          createdAt: reviewCycles.createdAt,
          completedAt: reviewCycles.completedAt,
          featureId: reviewCycles.featureId,
          featureTitle: featureRequests.title,
          prNumber: pullRequests.number,
          prUrl: pullRequests.githubPrUrl,
          repoFullName: pullRequests.repoFullName,
        })
        .from(reviewCycles)
        .innerJoin(featureRequests, eq(reviewCycles.featureId, featureRequests.id))
        .innerJoin(pullRequests, eq(reviewCycles.pullRequestId, pullRequests.id))
        .where(and(...conditions))
        .orderBy(desc(reviewCycles.createdAt));
    }),

  // One cycle with its full finding list + feature/PR context for the detail
  // drawer. Org-scoped so a cycle id from another org can't be read.
  getCycle: orgProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          cycle: reviewCycles,
          featureTitle: featureRequests.title,
          prNumber: pullRequests.number,
          prUrl: pullRequests.githubPrUrl,
          repoFullName: pullRequests.repoFullName,
        })
        .from(reviewCycles)
        .innerJoin(featureRequests, eq(reviewCycles.featureId, featureRequests.id))
        .innerJoin(pullRequests, eq(reviewCycles.pullRequestId, pullRequests.id))
        .where(
          and(
            eq(reviewCycles.id, input.cycleId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );

      if (!row) return null;

      const issues = await ctx.db
        .select()
        .from(reviewIssues)
        .where(eq(reviewIssues.reviewCycleId, input.cycleId));

      return {
        ...row.cycle,
        featureTitle: row.featureTitle,
        prNumber: row.prNumber,
        prUrl: row.prUrl,
        repoFullName: row.repoFullName,
        issues,
      };
    }),

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
      // Confirm the issue belongs to this org (via its cycle → feature) before
      // mutating — otherwise any member could resolve another org's finding by id.
      const [owned] = await ctx.db
        .select({ id: reviewIssues.id })
        .from(reviewIssues)
        .innerJoin(reviewCycles, eq(reviewIssues.reviewCycleId, reviewCycles.id))
        .innerJoin(featureRequests, eq(reviewCycles.featureId, featureRequests.id))
        .where(
          and(
            eq(reviewIssues.id, input.issueId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );

      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review issue not found" });
      }

      const [updated] = await ctx.db
        .update(reviewIssues)
        .set({ resolved: true })
        .where(eq(reviewIssues.id, input.issueId))
        .returning();

      return updated;
    }),
});
