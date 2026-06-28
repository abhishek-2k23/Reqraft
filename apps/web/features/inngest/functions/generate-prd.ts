import { db, eq } from "@repo/database";
import {
  clarificationMessages,
  featureRequests,
  prds,
} from "@repo/database/schema";

import { generatePrd } from "@/features/ai/prd-generator";

import { inngest } from "../client";

export const generatePrdFunction = inngest.createFunction(
  { id: "generate-prd", triggers: [{ event: "feature/clarification-complete" }] },
  async ({ event, step }) => {
    const { featureId } = event.data as { featureId: string };

    const context = await step.run("fetch-context", async () => {
      // Idempotency guard: skip entirely if a PRD already exists (handles Inngest replays)
      const [existingPrd] = await db
        .select({ id: prds.id })
        .from(prds)
        .where(eq(prds.featureId, featureId));
      if (existingPrd) return null;

      const [feature] = await db
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, featureId));
      const messages = await db
        .select()
        .from(clarificationMessages)
        .where(eq(clarificationMessages.featureId, featureId));

      if (!feature) throw new Error(`Feature ${featureId} not found`);

      return { feature, messages };
    });

    // PRD already existed — nothing to do
    if (context === null) return { featureId, status: "skipped" };

    await step.run("set-generating", async () => {
      await db
        .update(featureRequests)
        .set({ status: "prd_generating", updatedAt: new Date() })
        .where(eq(featureRequests.id, featureId));
    });

    const prdContent = await step.run("ai-generate-prd", async () =>
      generatePrd({
        title: context.feature.title,
        description: context.feature.description,
        messages: context.messages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
      }),
    );

    await step.run("save-prd", async () => {
      // Guard: abort if the user cancelled generation (status reverted to clarifying)
      const [current] = await db
        .select({ status: featureRequests.status })
        .from(featureRequests)
        .where(eq(featureRequests.id, featureId));

      if (!current || current.status !== "prd_generating") {
        return { skipped: true };
      }

      await db.insert(prds).values({
        id: crypto.randomUUID(),
        featureId,
        problem: prdContent.problemStatement,
        goals: JSON.stringify(prdContent.goals),
        nonGoals: JSON.stringify(prdContent.nonGoals),
        userStories: JSON.stringify(prdContent.userStories),
        acceptanceCriteria: JSON.stringify(prdContent.acceptanceCriteria),
        edgeCases: JSON.stringify(prdContent.edgeCases),
        successMetrics: JSON.stringify(prdContent.successMetrics),
        technicalRequirements: JSON.stringify(prdContent.technicalRequirements),
        dependencies: JSON.stringify(prdContent.dependencies),
        risks: JSON.stringify(prdContent.risks),
        estimatedTotalHours: prdContent.estimatedTotalHours,
        rawMarkdown: prdContent.rawMarkdown,
      });
      await db
        .update(featureRequests)
        .set({ status: "prd_ready", updatedAt: new Date() })
        .where(eq(featureRequests.id, featureId));
    });

    return { featureId, status: "prd_ready" };
  },
);
