import Link from "next/link";

import { ShipFlowShell } from "~/components/shipflow/shell";
import { statusLabel, statusTone } from "~/components/shipflow/status";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

type FeatureStatus = keyof typeof statusLabel;

export default async function TasksPage() {
  const features = await api.feature.list.query().catch(() => []);
  const activeFeatures = features.filter((feature) => !["intake", "clarifying", "prd_ready"].includes(feature.status));

  return (
    <ShipFlowShell
      active="/tasks"
      title="Task Board"
      description="Engineering tasks across all active features."
    >
      {activeFeatures.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-10 text-center">
          <p className="text-sm text-slate-500">No tasks yet. Approve a PRD to generate engineering tasks.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeFeatures.map((feature) => {
            const status = feature.status as FeatureStatus;

            return (
            <Link key={feature.id} href={`/features/${feature.id}?tab=tasks`} className="block rounded-lg border border-white/10 bg-white/[0.045] p-5 transition hover:bg-white/[0.07]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{feature.title}</h2>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{feature.description}</p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", statusTone[status])}>
                  {statusLabel[status]}
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-500">Open feature to view and manage tasks.</p>
            </Link>
            );
          })}
        </div>
      )}
    </ShipFlowShell>
  );
}
