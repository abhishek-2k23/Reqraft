import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "@repo/database";
import {
  clarificationMessages,
  featureRequests,
  prds,
  pullRequests,
  reviewCycles,
  reviewIssues,
  tasks,
  usersTable,
} from "@repo/database/schema";

import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

const featureStatusSchema = z.enum([
  "intake",
  "clarifying",
  "prd_generating",
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
          status: "clarifying",
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          priority: input.priority,
        })
        .returning();

      if (!feature) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Auto-start: have the AI ask its first clarifying question immediately
      try {
        const { reply } = await ctx.ai.clarify({
          title: input.title,
          description: input.description,
          messages: [],
        });
        await ctx.db.insert(clarificationMessages).values({
          featureId: feature.id,
          role: "assistant",
          content: reply,
        });
      } catch {
        // Non-fatal — clarification can be started manually from the feature page
      }

      await ctx.publish(ctx.org.id, {
        type: "feature.created",
        featureId: feature.id,
        title: feature.title,
        actorName: ctx.session.user.name ?? ctx.session.user.email ?? "Someone",
      });

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
        .select({
          id: tasks.id,
          featureId: tasks.featureId,
          prdId: tasks.prdId,
          title: tasks.title,
          description: tasks.description,
          type: tasks.type,
          priority: tasks.priority,
          status: tasks.status,
          blockedReason: tasks.blockedReason,
          assignedTo: tasks.assignedTo,
          order: tasks.order,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          assigneeName: usersTable.name,
          assigneeImage: usersTable.image,
        })
        .from(tasks)
        .leftJoin(usersTable, eq(tasks.assignedTo, usersTable.id))
        .where(eq(tasks.featureId, input.featureId));
      const prs = await ctx.db
        .select()
        .from(pullRequests)
        .where(eq(pullRequests.featureId, input.featureId));
      const cyclesRaw = await ctx.db
        .select()
        .from(reviewCycles)
        .where(eq(reviewCycles.featureId, input.featureId))
        .orderBy(desc(reviewCycles.createdAt));
      const cycles = await Promise.all(
        cyclesRaw.map(async (cycle) => ({
          ...cycle,
          issues: await ctx.db
            .select()
            .from(reviewIssues)
            .where(eq(reviewIssues.reviewCycleId, cycle.id)),
        })),
      );

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

      if (updated) {
        await ctx.publish(ctx.org.id, {
          type: "feature.updated",
          featureId: updated.id,
          title: updated.title,
          status: updated.status,
        });
      }

      return updated;
    }),

  cancelTaskGeneration: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(featureRequests)
        .set({ status: "prd_ready", updatedAt: new Date() })
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
            eq(featureRequests.status, "in_progress"),
          ),
        );
      return { cancelled: true };
    }),

  cancelPrdGeneration: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Revert status to clarifying so the Inngest save-prd step will abort on its status check
      await ctx.db
        .update(featureRequests)
        .set({ status: "clarifying", updatedAt: new Date() })
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
            eq(featureRequests.status, "prd_generating"),
          ),
        );
      return { cancelled: true };
    }),

  // Manually trigger PRD generation — fires the same Inngest event the AI uses when done clarifying
  triggerPrdGeneration: orgProcedure
    .input(z.object({ featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(featureRequests)
        .set({ status: "prd_generating", updatedAt: new Date() })
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );

      await ctx.emit({
        name: "feature/clarification-complete",
        data: { featureId: input.featureId },
      });

      return { triggered: true };
    }),

  // Manually trigger task generation — fires the same Inngest event as PRD approval
  triggerTaskGeneration: orgProcedure
    .input(z.object({
      featureId: z.string(),
      specialtyOverrides: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(featureRequests)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );

      await ctx.emit({
        name: "prd/approved",
        data: { featureId: input.featureId, specialtyOverrides: input.specialtyOverrides ?? {} },
      });

      return { triggered: true };
    }),

  sendClarificationMessage: orgProcedure
    .input(z.object({ featureId: z.string(), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Save the user's message first
      await ctx.db.insert(clarificationMessages).values({
        id: crypto.randomUUID(),
        featureId: input.featureId,
        role: "user",
        content: input.message,
      });

      // Fetch the feature for title/description context
      const [feature] = await ctx.db
        .select()
        .from(featureRequests)
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );

      if (!feature) throw new TRPCError({ code: "NOT_FOUND" });

      // Move from intake → clarifying on the first message
      if (feature.status === "intake") {
        await ctx.db
          .update(featureRequests)
          .set({ status: "clarifying", updatedAt: new Date() })
          .where(eq(featureRequests.id, input.featureId));
      }

      // Fetch the full conversation (including the message we just saved)
      const allMessages = await ctx.db
        .select()
        .from(clarificationMessages)
        .where(eq(clarificationMessages.featureId, input.featureId))
        .orderBy(asc(clarificationMessages.createdAt));

      // Call GPT-4o to get the next question or a completion confirmation
      const { reply, isDone } = await ctx.ai.clarify({
        title: feature.title,
        description: feature.description,
        messages: allMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      // Save the AI response
      await ctx.db.insert(clarificationMessages).values({
        id: crypto.randomUUID(),
        featureId: input.featureId,
        role: "assistant",
        content: reply,
      });

      // When the AI has enough info, trigger the PRD generation pipeline
      if (isDone) {
        await ctx.emit({
          name: "feature/clarification-complete",
          data: { featureId: input.featureId },
        });
      }

      return { reply, isDone };
    }),
});
