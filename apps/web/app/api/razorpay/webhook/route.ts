import { createHmac, timingSafeEqual } from "node:crypto";

import { db, eq } from "@repo/database";
import { subscriptions } from "@repo/database/schema";
import {
  getPlanDetails,
  normalizeRazorpaySubscriptionEvent,
  type BillingPlan,
} from "@repo/services/shipflow/billing";

const HANDLED_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.halted",
  "subscription.completed",
]);

const DOWNGRADE_STATUSES = new Set(["canceled", "halted", "completed"]);

type RazorpayWebhookBody = {
  event: string;
  payload?: {
    subscription?: {
      entity?: {
        id: string;
        current_end?: number;
        notes?: {
          organizationId?: string;
          userId?: string;
          plan?: BillingPlan;
        };
      };
    };
  };
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!isValidRazorpaySignature(body, signature)) {
    return Response.json({ error: "Invalid Razorpay signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as RazorpayWebhookBody;

  if (!HANDLED_EVENTS.has(event.event)) {
    return Response.json({ received: true, ignored: event.event });
  }

  const subscription = event.payload?.subscription?.entity;

  if (!subscription) {
    return Response.json({ error: "Missing subscription" }, { status: 400 });
  }

  const update = normalizeRazorpaySubscriptionEvent({
    event: event.event,
    subscriptionId: subscription.id,
    currentEnd: subscription.current_end,
    organizationId: subscription.notes?.organizationId,
    userId: subscription.notes?.userId,
    plan: subscription.notes?.plan,
  });

  if (update.handled) {
    await applySubscriptionUpdate(update);
  }

  return Response.json({ received: true, update });
}

// Persist the plan change. Match by org (from notes) when available, otherwise
// fall back to the stored Razorpay subscription id.
async function applySubscriptionUpdate(
  update: ReturnType<typeof normalizeRazorpaySubscriptionEvent>,
) {
  const details = getPlanDetails(update.plan);
  const status = DOWNGRADE_STATUSES.has(update.status) ? "canceled" : "active";

  const matcher = update.organizationId
    ? eq(subscriptions.organizationId, update.organizationId)
    : eq(subscriptions.razorpaySubscriptionId, update.subscriptionId);

  await db
    .update(subscriptions)
    .set({
      plan: update.plan,
      status,
      razorpaySubscriptionId: update.subscriptionId,
      currentPeriodEnd: update.renewsAt,
      aiReviewCredits: details.includedCredits,
      repositoryLimit: details.repositoryLimit,
      updatedAt: new Date(),
    })
    .where(matcher);
}

function isValidRazorpaySignature(body: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");

  return (
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}
