"use server";

import { requireAuth } from "@/features/auth/actions";

import { getRazorpayInstance } from "../lib/razorpay";

export async function createCheckoutSubscription() {
  const session = await requireAuth();
  const planId = process.env.RAZORPAY_PRO_PLAN_ID;

  if (!planId) {
    return {
      ok: false,
      error: "RAZORPAY_PRO_PLAN_ID is not configured.",
    };
  }

  const razorpay = getRazorpayInstance();
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    customer_notify: 1,
    notes: {
      userId: session.user.id,
      organizationId: session.session.activeOrganizationId ?? "",
    },
  });

  return {
    ok: true,
    subscriptionId: subscription.id,
  };
}

export async function cancelCheckoutSubscription() {
  await requireAuth();

  return {
    ok: false,
    error: "Subscription cancellation requires a saved Razorpay subscription id.",
  };
}
