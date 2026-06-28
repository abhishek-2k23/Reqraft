import { and, eq } from "@repo/database";
import { featureRequests, prds } from "@repo/database/schema";

import { managerProcedure, orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

function safeParseArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function parsePrd(record: typeof prds.$inferSelect) {
  return {
    ...record,
    goals: safeParseArray(record.goals),
    nonGoals: safeParseArray(record.nonGoals),
    userStories: safeParseArray(record.userStories),
    acceptanceCriteria: safeParseArray(record.acceptanceCriteria),
    edgeCases: safeParseArray(record.edgeCases),
    successMetrics: safeParseArray(record.successMetrics),
    technicalRequirements: safeParseArray(record.technicalRequirements),
    dependencies: safeParseArray(record.dependencies),
    risks: safeParseArray(record.risks),
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

  // Edit PRD content using an AI prompt — locked after approval
  editWithAI: managerProcedure
    .input(z.object({ prdId: z.string(), featureId: z.string(), prompt: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(prds)
        .where(and(eq(prds.id, input.prdId), eq(prds.featureId, input.featureId)));

      if (!existing) throw new Error("PRD not found");
      if (existing.approvedAt) throw new Error("Cannot edit an approved PRD");

      const currentPrd = {
        problemStatement: existing.problem,
        goals: safeParseArray(existing.goals),
        nonGoals: safeParseArray(existing.nonGoals),
        userStories: safeParseArray(existing.userStories),
        acceptanceCriteria: safeParseArray(existing.acceptanceCriteria),
        edgeCases: safeParseArray(existing.edgeCases),
        successMetrics: safeParseArray(existing.successMetrics),
        technicalRequirements: safeParseArray(existing.technicalRequirements),
        dependencies: safeParseArray(existing.dependencies),
        risks: safeParseArray(existing.risks),
        estimatedTotalHours: existing.estimatedTotalHours,
      };

      const updated = await ctx.ai.editPrd({ currentPrd, editPrompt: input.prompt });

      const [saved] = await ctx.db
        .update(prds)
        .set({
          problem: updated.problemStatement,
          goals: JSON.stringify(updated.goals),
          nonGoals: JSON.stringify(updated.nonGoals),
          userStories: JSON.stringify(updated.userStories),
          acceptanceCriteria: JSON.stringify(updated.acceptanceCriteria),
          edgeCases: JSON.stringify(updated.edgeCases),
          successMetrics: JSON.stringify(updated.successMetrics),
          technicalRequirements: JSON.stringify(updated.technicalRequirements),
          dependencies: JSON.stringify(updated.dependencies),
          risks: JSON.stringify(updated.risks),
          estimatedTotalHours: updated.estimatedTotalHours,
          rawMarkdown: updated.rawMarkdown,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(prds.id, input.prdId))
        .returning();

      return saved ? parsePrd(saved) : null;
    }),

  // Manager manually edits the estimated total hours — locked after approval
  updateEstimate: managerProcedure
    .input(z.object({ prdId: z.string(), estimatedTotalHours: z.number().int().min(0).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ approvedAt: prds.approvedAt })
        .from(prds)
        .where(eq(prds.id, input.prdId));

      if (!existing) throw new Error("PRD not found");
      if (existing.approvedAt) throw new Error("Cannot edit an approved PRD");

      await ctx.db
        .update(prds)
        .set({ estimatedTotalHours: input.estimatedTotalHours, updatedAt: new Date() })
        .where(eq(prds.id, input.prdId));
      return { success: true };
    }),

  // Manager sets the target deadline manually
  setDeadline: managerProcedure
    .input(z.object({ prdId: z.string(), targetDeadline: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(prds)
        .set({
          targetDeadline: input.targetDeadline ? new Date(input.targetDeadline) : null,
          updatedAt: new Date(),
        })
        .where(eq(prds.id, input.prdId));
      return { success: true };
    }),

  approve: managerProcedure
    .input(z.object({ prdId: z.string(), featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(prds)
        .set({ approvedBy: ctx.session.user.id, approvedAt: new Date() })
        .where(eq(prds.id, input.prdId));

      await ctx.emit({
        name: "prd/approved",
        data: { featureId: input.featureId },
      });

      return { success: true };
    }),
});
