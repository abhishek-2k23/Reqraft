export const billingPlans = ["free", "pro", "scale"] as const;
export type BillingPlan = (typeof billingPlans)[number];

export type PlanDetails = {
  plan: BillingPlan;
  label: string;
  monthlyPriceInr: number;
  includedCredits: number;
  repositoryLimit: number;
  seatsIncluded: number;
};

export type CreditUsageInput = {
  usedCredits: number;
  includedCredits: number;
};

export type CreditUsageSummary = CreditUsageInput & {
  remainingCredits: number;
  usedPercent: number;
  status: "healthy" | "attention" | "over_limit";
};

export type RazorpaySubscriptionEventInput = {
  event: string;
  subscriptionId: string;
  currentEnd?: number;
  organizationId?: string;
  userId?: string;
};

export type SubscriptionUpdate = {
  handled: boolean;
  subscriptionId: string;
  organizationId?: string;
  userId?: string;
  plan: BillingPlan;
  status: "active" | "charged" | "canceled" | "halted" | "completed";
  renewsAt: Date | null;
};

const planDetails: Record<BillingPlan, PlanDetails> = {
  free: {
    plan: "free",
    label: "Free",
    monthlyPriceInr: 0,
    includedCredits: 100,
    repositoryLimit: 1,
    seatsIncluded: 2,
  },
  pro: {
    plan: "pro",
    label: "Pro",
    monthlyPriceInr: 4999,
    includedCredits: 1000,
    repositoryLimit: 10,
    seatsIncluded: 5,
  },
  scale: {
    plan: "scale",
    label: "Scale",
    monthlyPriceInr: 14999,
    includedCredits: 5000,
    repositoryLimit: 50,
    seatsIncluded: 20,
  },
};

const eventStatusMap: Record<
  string,
  Pick<SubscriptionUpdate, "plan" | "status">
> = {
  "subscription.activated": { plan: "pro", status: "active" },
  "subscription.charged": { plan: "pro", status: "charged" },
  "subscription.cancelled": { plan: "free", status: "canceled" },
  "subscription.halted": { plan: "free", status: "halted" },
  "subscription.completed": { plan: "free", status: "completed" },
};

export function getPlanDetails(plan: BillingPlan): PlanDetails {
  return planDetails[plan];
}

export function calculateCreditUsage(
  input: CreditUsageInput,
): CreditUsageSummary {
  const remainingCredits = Math.max(input.includedCredits - input.usedCredits, 0);
  const usedPercent =
    input.includedCredits === 0
      ? 100
      : Math.min(Math.round((input.usedCredits / input.includedCredits) * 100), 100);

  let status: CreditUsageSummary["status"] = "healthy";

  if (input.includedCredits === 0 || input.usedCredits > input.includedCredits) {
    status = "over_limit";
  } else if (usedPercent >= 80) {
    status = "attention";
  }

  return {
    ...input,
    remainingCredits,
    usedPercent,
    status,
  };
}

export function normalizeRazorpaySubscriptionEvent(
  input: RazorpaySubscriptionEventInput,
): SubscriptionUpdate {
  const eventStatus = eventStatusMap[input.event];

  if (!eventStatus) {
    return {
      handled: false,
      subscriptionId: input.subscriptionId,
      organizationId: input.organizationId,
      userId: input.userId,
      plan: "free",
      status: "completed",
      renewsAt: null,
    };
  }

  return {
    handled: true,
    subscriptionId: input.subscriptionId,
    organizationId: input.organizationId,
    userId: input.userId,
    plan: eventStatus.plan,
    status: eventStatus.status,
    renewsAt: input.currentEnd ? new Date(input.currentEnd * 1000) : null,
  };
}
