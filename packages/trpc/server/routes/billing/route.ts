import { count, eq } from "@repo/database";
import {
  featureRequests,
  members,
  repositories,
  reviewCycles,
  subscriptions,
} from "@repo/database/schema";

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

  // Real consumption for the active org — what the org has actually used so the
  // billing page can render usage against each plan's included limits.
  usage: orgProcedure.query(async ({ ctx }) => {
    const [subscription] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, ctx.org.id));

    const [seats] = await ctx.db
      .select({ value: count() })
      .from(members)
      .where(eq(members.organizationId, ctx.org.id));

    const [repos] = await ctx.db
      .select({ value: count() })
      .from(repositories)
      .where(eq(repositories.organizationId, ctx.org.id));

    const [features] = await ctx.db
      .select({ value: count() })
      .from(featureRequests)
      .where(eq(featureRequests.organizationId, ctx.org.id));

    // AI review cycles are the credit-consuming action.
    const [reviews] = await ctx.db
      .select({ value: count() })
      .from(reviewCycles)
      .innerJoin(featureRequests, eq(reviewCycles.featureId, featureRequests.id))
      .where(eq(featureRequests.organizationId, ctx.org.id));

    return {
      plan: subscription?.plan ?? "free",
      status: subscription?.status ?? "active",
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      usage: {
        seatsUsed: seats?.value ?? 0,
        repositoriesUsed: repos?.value ?? 0,
        featuresCreated: features?.value ?? 0,
        aiReviewsUsed: reviews?.value ?? 0,
      },
    };
  }),
});
