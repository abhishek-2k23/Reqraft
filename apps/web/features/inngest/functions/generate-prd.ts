import { db, eq } from "@repo/database";
import {
  clarificationMessages,
  featureRequests,
  prds,
} from "@repo/database/schema";

import { generatePrd } from "@/features/ai/prd-generator";

import { inngest } from "../client";

export const generatePrdFunction = inngest.createFunction(
  { id: "generate-prd", triggers: { event: "feature/clarification-complete" } },
  async ({ event, step }) => {
    const { featureId } = event.data as { featureId: string };

    const context = await step.run("fetch-context", async () => {
      const [feature] = await db
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, featureId));
      const messages = await db
        .select()
        .from(clarificationMessages)
        .where(eq(clarificationMessages.featureId, featureId));

      if (!feature) {
        throw new Error(`Feature ${featureId} not found`);
      }

      return { feature, messages };
    });

    await step.run("set-generating", async () => {
      await db
        .update(featureRequests)
        .set({ status: "clarifying", updatedAt: new Date() })
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
