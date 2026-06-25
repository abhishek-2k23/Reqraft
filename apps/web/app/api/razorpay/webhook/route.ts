import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizeRazorpaySubscriptionEvent } from "@repo/services/shipflow/billing";

const HANDLED_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.halted",
  "subscription.completed",
]);

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

  return Response.json({
    received: true,
    update: normalizeRazorpaySubscriptionEvent({
      event: event.event,
      subscriptionId: subscription.id,
      currentEnd: subscription.current_end,
      organizationId: subscription.notes?.organizationId,
      userId: subscription.notes?.userId,
    }),
  });
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
