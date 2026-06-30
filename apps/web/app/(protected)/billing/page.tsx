import { CheckCircle2 } from "lucide-react";

import { billingPlans, getPlanDetails, type BillingPlan } from "@repo/services/shipflow/billing";

import { UpgradeButton } from "~/features/billing/components/upgrade-button";
import { CancelButton } from "~/features/billing/components/cancel-button";
import { PageHeader } from "~/components/shipflow/ui-kit";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

const INR = new Intl.NumberFormat("en-IN");

function planFeatures(plan: BillingPlan): string[] {
  const d = getPlanDetails(plan);
  const credits = d.includedCredits >= 0 ? `${INR.format(d.includedCredits)} AI review credits/mo` : "Unlimited AI reviews";
  const repos = d.repositoryLimit >= 0 ? `${d.repositoryLimit} ${d.repositoryLimit === 1 ? "repository" : "repositories"}` : "Unlimited repositories";
  const seats = `${d.seatsIncluded} team seats`;
  const extras: Record<BillingPlan, string> = {
    free: "Community support",
    pro: "Priority support & analytics",
    scale: "SLA & dedicated support",
  };
  return [repos, credits, seats, extras[plan]];
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const hasLimit = typeof limit === "number" && limit > 0;
  const pct = hasLimit ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const tone = !hasLimit
    ? "bg-primary"
    : pct >= 100
      ? "bg-red-400"
      : pct >= 80
        ? "bg-amber-400"
        : "bg-primary";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-xs text-foreground/80">
          {INR.format(used)}
          {hasLimit ? <span className="text-muted-foreground"> / {INR.format(limit)}</span> : null}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${hasLimit ? pct : 6}%` }} />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const data = await api.billing.usage.query().catch(() => null);
  const currentPlan = (data?.plan ?? "free") as BillingPlan;
  const details = getPlanDetails(currentPlan);
  const usage = data?.usage ?? {
    seatsUsed: 0,
    repositoriesUsed: 0,
    repositoryLimit: details.repositoryLimit,
    featuresCreated: 0,
    creditsUsed: 0,
    creditsIncluded: details.includedCredits,
  };
  const isPaid = currentPlan !== "free";

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and track how much of each plan you've used." />

      <div className="grid gap-6">
        {/* Current plan + real usage */}
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.045] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Current usage</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                You&apos;re on the{" "}
                <span className="font-medium capitalize text-primary">{details.label}</span> plan
                {data?.currentPeriodEnd
                  ? ` — renews ${new Date(data.currentPeriodEnd).toLocaleDateString("en-IN")}`
                  : ""}
                .
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {details.monthlyPriceInr === 0 ? "Free" : `₹${INR.format(details.monthlyPriceInr)}/mo`}
              </span>
              {isPaid ? <CancelButton /> : null}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <UsageBar label="AI review credits used" used={usage.creditsUsed} limit={usage.creditsIncluded} />
            <UsageBar label="Repositories connected" used={usage.repositoriesUsed} limit={usage.repositoryLimit} />
            <UsageBar label="Team seats" used={usage.seatsUsed} limit={details.seatsIncluded} />
            <UsageBar label="Feature requests created" used={usage.featuresCreated} limit={null} />
          </div>
        </div>

        {/* Plan catalog */}
        <div className="grid gap-5 sm:grid-cols-3">
          {billingPlans.map((planId) => {
            const plan = getPlanDetails(planId);
            const isCurrent = currentPlan === planId;
            const highlight = planId === "pro";

            return (
              <div
                key={planId}
                className={cn(
                  "flex flex-col rounded-lg border p-5",
                  highlight ? "border-primary/40 bg-primary/5" : "border-foreground/10 bg-foreground/[0.03]",
                  isCurrent && "ring-1 ring-primary/50",
                )}
              >
                {isCurrent ? (
                  <span className="mb-3 inline-block w-fit rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    Current plan
                  </span>
                ) : null}
                <h3 className="mb-1 text-sm font-semibold text-foreground/80">{plan.label}</h3>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {plan.monthlyPriceInr === 0 ? "₹0" : `₹${INR.format(plan.monthlyPriceInr)}`}
                  </span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
                <ul className="mb-5 space-y-2">
                  {planFeatures(planId).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="size-3 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {!isCurrent && planId !== "free" ? (
                    <UpgradeButton plan={planId as "pro" | "scale"} label={plan.label} highlight={highlight} />
                  ) : isCurrent ? (
                    <p className="text-center text-xs text-muted-foreground">Your active plan</p>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">No charge</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
