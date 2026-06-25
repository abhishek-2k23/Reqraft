import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { statusLabel, statusTone } from "~/components/shipflow/status";
import { ShipFlowShell } from "~/components/shipflow/shell";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

type FeatureStatus = keyof typeof statusLabel;

export default async function FeaturesPage() {
  const features = await api.feature.list.query().catch(() => []);

  return (
    <ShipFlowShell
      active="/features"
      title="Feature requests"
      description="Capture rough product asks, clarify missing context, generate PRDs, and track each feature until it ships."
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Sparkles className="size-4" />
              AI intake starts here
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-50/75">
              Add a client ask, missing requirement, or founder idea. ShipFlow will clarify it, produce a PRD, create tasks, and review the final PR.
            </p>
          </div>
          <Link href="/features/new" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
            <Plus className="size-4" />
            New feature
          </Link>
        </div>

        {features.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-10 text-center">
            <p className="text-sm text-slate-500">No feature requests yet.</p>
            <Link href="/features/new" className="mt-4 inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
              Create first feature
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const status = feature.status as FeatureStatus;

              return (
              <Link key={feature.id} href={`/features/${feature.id}`} className="rounded-lg border border-white/10 bg-white/[0.045] p-5 transition hover:border-cyan-300/30 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-white">{feature.title}</h2>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", statusTone[status])}>
                    {statusLabel[status]}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize">{feature.priority} priority</span>
                  <span>{new Date(feature.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </ShipFlowShell>
  );
}
