import { eq } from "@repo/database";
import { subscriptions } from "@repo/database/schema";

import { orgProcedure, router } from "../../trpc";

export const billingRouter = router({
  getSubscription: orgProcedure.query(async ({ ctx }) => {
    const [subscription] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, ctx.org.id));

    if (subscription) {
      return subscription;
    }

    const [created] = await ctx.db
      .insert(subscriptions)
      .values({
        id: crypto.randomUUID(),
        organizationId: ctx.org.id,
        plan: "free",
        status: "active",
        aiReviewCredits: 100,
        repositoryLimit: 1,
      })
      .returning();

    return created;
  }),

  summary: orgProcedure.query(async ({ ctx }) => {
    const [subscription] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, ctx.org.id));

    return subscription ?? null;
  }),
});
