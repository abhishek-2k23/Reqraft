import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCreditUsage,
  getPlanDetails,
  normalizeRazorpaySubscriptionEvent,
  resolveCreditPeriod,
} from "./billing";

test("getPlanDetails returns the product limits for each plan", () => {
  assert.deepEqual(getPlanDetails("pro"), {
    plan: "pro",
    label: "Pro",
    monthlyPriceInr: 999,
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

test("normalizeRazorpaySubscriptionEvent keeps the targeted plan from notes", () => {
  const update = normalizeRazorpaySubscriptionEvent({
    event: "subscription.charged",
    subscriptionId: "sub_456",
    plan: "scale",
  });
  assert.equal(update.plan, "scale");
  assert.equal(update.status, "charged");
});

test("normalizeRazorpaySubscriptionEvent downgrades to free on cancellation", () => {
  const update = normalizeRazorpaySubscriptionEvent({
    event: "subscription.cancelled",
    subscriptionId: "sub_789",
    plan: "scale",
  });
  assert.equal(update.plan, "free");
  assert.equal(update.status, "canceled");
});

test("resolveCreditPeriod treats a missing reset boundary as expired", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  const result = resolveCreditPeriod(now, null, null);
  assert.equal(result.expired, true);
  // No billing cycle → next window is 30 days out.
  assert.equal(
    result.nextResetAt.getTime(),
    new Date("2026-07-30T00:00:00.000Z").getTime(),
  );
});

test("resolveCreditPeriod expires once the reset boundary has passed", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  const result = resolveCreditPeriod(now, new Date("2026-06-29T00:00:00.000Z"), null);
  assert.equal(result.expired, true);
});

test("resolveCreditPeriod stays in-period while the reset is still in the future", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  const periodEnd = new Date("2026-07-15T00:00:00.000Z");
  const result = resolveCreditPeriod(now, periodEnd, periodEnd);
  assert.equal(result.expired, false);
});

test("resolveCreditPeriod rolls a paid plan to its billing-cycle end", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  const periodEnd = new Date("2026-07-31T00:00:00.000Z");
  // Reset already lapsed, but the next cycle end is still ahead → snap to it.
  const result = resolveCreditPeriod(now, new Date("2026-06-01T00:00:00.000Z"), periodEnd);
  assert.equal(result.expired, true);
  assert.equal(result.nextResetAt.getTime(), periodEnd.getTime());
});
