import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCreditUsage,
  getPlanDetails,
  normalizeRazorpaySubscriptionEvent,
} from "./billing";

test("getPlanDetails returns the product limits for each plan", () => {
  assert.deepEqual(getPlanDetails("pro"), {
    plan: "pro",
    label: "Pro",
    monthlyPriceInr: 4999,
    includedCredits: 1000,
    repositoryLimit: 10,
    seatsIncluded: 5,
  });
});

test("calculateCreditUsage protects percentage math when credits are empty", () => {
  assert.deepEqual(calculateCreditUsage({ usedCredits: 25, includedCredits: 0 }), {
    usedCredits: 25,
    includedCredits: 0,
    remainingCredits: 0,
    usedPercent: 100,
    status: "over_limit",
  });
});

test("normalizeRazorpaySubscriptionEvent returns a stable subscription update", () => {
  assert.deepEqual(
    normalizeRazorpaySubscriptionEvent({
      event: "subscription.activated",
      subscriptionId: "sub_123",
      currentEnd: 1_767_225_600,
      organizationId: "org_123",
      userId: "user_123",
    }),
    {
      handled: true,
      subscriptionId: "sub_123",
      organizationId: "org_123",
      userId: "user_123",
      plan: "pro",
      status: "active",
      renewsAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  );
});
