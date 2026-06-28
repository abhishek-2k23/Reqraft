"use client";

import Link from "next/link";

import { ShipFlowShell } from "~/components/shipflow/shell";
import { statusLabel, statusTone } from "~/components/shipflow/status";
import { useActiveProject } from "~/components/shipflow/project-context";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

type FeatureStatus = keyof typeof statusLabel;

export default function TasksPage() {
  const { activeProjectId, activeProject, ready, isLoading: projectsLoading } = useActiveProject();
  const { data: features = [], isLoading } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !projectsLoading },
  );

  const activeFeatures = features.filter(
    (feature) => !["intake", "clarifying", "prd_ready"].includes(feature.status),
  );
  const showSkeleton = !ready || projectsLoading || isLoading;

  return (
    <ShipFlowShell
      active="/tasks"
      title="Task Board"
      description={activeProject ? `Engineering tasks across ${activeProject.name}.` : "Engineering tasks across all active features."}
    >
      {showSkeleton ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : activeFeatures.length === 0 ? (
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
