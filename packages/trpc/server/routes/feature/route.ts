import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "@repo/database";
import {
  clarificationMessages,
  featureRequests,
  prds,
  pullRequests,
  reviewCycles,
  tasks,
} from "@repo/database/schema";

import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

const featureStatusSchema = z.enum([
  "intake",
  "clarifying",
  "prd_ready",
  "tasks_ready",
  "in_progress",
  "in_review",
  "approved",
  "shipped",
  "blocked",
]);

export const featureRouter = router({
  create: orgProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [feature] = await ctx.db
        .insert(featureRequests)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.org.id,
          createdBy: ctx.session.user.id,
          status: "intake",
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          priority: input.priority,
        })
        .returning();

      return feature;
    }),

  list: orgProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          status: featureStatusSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(featureRequests.organizationId, ctx.org.id)];

      if (input?.projectId) {
        conditions.push(eq(featureRequests.projectId, input.projectId));
      }

      if (input?.status) {
        conditions.push(eq(featureRequests.status, input.status));
      }

      return ctx.db
        .select()
        .from(featureRequests)
        .where(and(...conditions))
        .orderBy(desc(featureRequests.createdAt));
    }),

  getById: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [feature] = await ctx.db
        .select()
        .from(featureRequests)
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const messages = await ctx.db
        .select()
        .from(clarificationMessages)
        .where(eq(clarificationMessages.featureId, input.featureId));
      const [prd] = await ctx.db
        .select()
        .from(prds)
        .where(eq(prds.featureId, input.featureId));
      const featureTasks = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.featureId, input.featureId));
      const prs = await ctx.db
        .select()
        .from(pullRequests)
        .where(eq(pullRequests.featureId, input.featureId));
      const cycles = await ctx.db
        .select()
        .from(reviewCycles)
        .where(eq(reviewCycles.featureId, input.featureId));

      return {
        ...feature,
        messages,
        prd: prd ?? null,
        tasks: featureTasks,
        pullRequests: prs,
        reviewCycles: cycles,
      };
    }),

  updateStatus: orgProcedure
    .input(z.object({ featureId: z.string(), status: featureStatusSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(featureRequests)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        )
        .returning();

      return updated;
    }),

  sendClarificationMessage: orgProcedure
    .input(z.object({ featureId: z.string(), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(clarificationMessages).values({
        id: crypto.randomUUID(),
        featureId: input.featureId,
        role: "user",
        content: input.message,
      });

      const aiResponse =
        "Got it. What success metric proves this feature worked for users?";

      await ctx.db.insert(clarificationMessages).values({
        id: crypto.randomUUID(),
        featureId: input.featureId,
        role: "assistant",
        content: aiResponse,
      });

      return { reply: aiResponse };
    }),
});
