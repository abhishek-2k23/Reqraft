import { CheckCircle2 } from "lucide-react";

import { PageHeader } from "~/components/shipflow/ui-kit";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

const plans = [
  { id: "free", label: "Free", price: "Rs 0", period: "/month", features: ["1 repository", "100 AI review credits/mo", "Full workflow access", "Community support"] },
  { id: "pro", label: "Pro", price: "Rs 2,999", period: "/month", features: ["10 repositories", "Unlimited AI reviews", "Priority support", "Advanced analytics"], highlight: true },
  { id: "scale", label: "Scale", price: "Rs 9,999", period: "/month", features: ["Unlimited repos", "Unlimited reviews", "Custom workflows", "SLA and dedicated support"] },
];

export default async function BillingPage() {
  const subscription = await api.billing.getSubscription.query().catch(() => null);
  const currentPlan = subscription?.plan ?? "free";

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and AI review credits." />
      <div className="grid gap-6">
        {subscription ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Current usage</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-xs text-slate-500">Plan</p>
                <p className="text-lg font-bold capitalize text-white">{subscription.plan}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">AI review credits</p>
                <p className="text-lg font-bold text-white">{subscription.aiReviewCredits === -1 ? "Unlimited" : subscription.aiReviewCredits}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">Repository limit</p>
                <p className="text-lg font-bold text-white">{subscription.repositoryLimit === -1 ? "Unlimited" : subscription.repositoryLimit}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className={cn(
              "rounded-lg border p-5",
              plan.highlight ? "border-cyan-300/40 bg-cyan-300/5" : "border-white/10 bg-white/[0.03]",
              currentPlan === plan.id && "ring-1 ring-cyan-300/50",
            )}>
              {currentPlan === plan.id ? (
                <span className="mb-3 inline-block rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  Current plan
                </span>
              ) : null}
              <h3 className="mb-1 text-sm font-semibold text-slate-300">{plan.label}</h3>
              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{plan.price}</span>
                <span className="text-xs text-slate-500">{plan.period}</span>
              </div>
              <ul className="mb-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="size-3 shrink-0 text-cyan-300" />
                    {feature}
                  </li>
                ))}
              </ul>
              {currentPlan !== plan.id && plan.id !== "free" ? (
                <button className={cn(
                  "w-full rounded-md py-2 text-sm font-semibold transition",
                  plan.highlight ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "border border-white/10 text-slate-300 hover:border-white/20",
                )}>
                  Upgrade to {plan.label}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
