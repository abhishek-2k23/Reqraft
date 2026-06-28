"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Clock3, GitPullRequestArrow, Rocket, ShieldCheck } from "lucide-react";

import { statusLabel, statusTone } from "~/components/shipflow/status";
import { ShipFlowShell } from "~/components/shipflow/shell";
import { useActiveProject } from "~/components/shipflow/project-context";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

type FeatureStatus = keyof typeof statusLabel;

const finishedStatuses = new Set(["approved", "shipped"]);
const blockedStatuses = new Set(["blocked"]);

const FADE_UP_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Rocket;
}) {
  return (
    <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 hover:bg-zinc-900/40 cursor-default">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl transition-all group-hover:bg-orange-500/20" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">{label}</p>
        <div className="rounded-full bg-white/10 p-2 text-zinc-300 transition-colors group-hover:bg-orange-500/20 group-hover:text-orange-400">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{detail}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { activeProjectId, activeProject, ready, isLoading } = useActiveProject();
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );

  const shipped = features.filter((feature) => feature.status === "shipped").length;
  const finished = features.filter((feature) => finishedStatuses.has(feature.status)).length;
  const blockers = features.filter((feature) => blockedStatuses.has(feature.status)).length;
  const shippedPercent = features.length ? Math.round((shipped / features.length) * 100) : 0;
  const latest = features.slice(0, 5);

  return (
    <ShipFlowShell
      active="/dashboard"
      title="Dashboard"
      description="One control room for product discovery, PRD generation, engineering tasks, AI review, and release approval."
    >
      <motion.div 
        initial="hidden" 
        animate="show" 
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} 
        className="grid gap-8"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Features shipped" value={`${shippedPercent}%`} detail={`${shipped} of ${features.length} features live`} icon={Rocket} />
          <StatCard label="Approved flow" value={`${finished}`} detail="Features approved or already shipped" icon={ShieldCheck} />
          <StatCard label="Active work" value={`${Math.max(features.length - finished, 0)}`} detail="Requests still moving through Reqraft" icon={Clock3} />
          <StatCard label="Open blockers" value={`${blockers}`} detail="Issues preventing release today" icon={GitPullRequestArrow} />
        </div>

        <motion.section variants={FADE_UP_ANIMATION_VARIANTS} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/5 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Active features</h2>
              <p className="text-sm text-zinc-400">
                {activeProject ? `Requests in ${activeProject.name}.` : "Real requests from your current organization."}
              </p>
            </div>
            <Link href="/features/new" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all hover:scale-105 hover:bg-orange-400 active:scale-95">
              New Request
            </Link>
          </div>

          {latest.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm text-zinc-500">No features yet. Create the first request and Reqraft will start the workflow.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {latest.map((feature) => {
                const status = feature.status as FeatureStatus;

                return (
                <Link key={feature.id} href={`/features/${feature.id}`} className="grid cursor-pointer gap-4 px-6 py-5 transition hover:bg-white/[0.02] md:grid-cols-[1.5fr_0.8fr_0.8fr] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-white">{feature.title}</p>
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", statusTone[status])}>
                        {statusLabel[status]}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm text-zinc-500">{feature.description}</p>
                  </div>
                  <p className="text-sm capitalize text-zinc-400">{feature.priority}</p>
                  <p className="text-sm text-zinc-500">{new Date(feature.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </Link>
                );
              })}
            </div>
          )}
        </motion.section>
      </motion.div>
    </ShipFlowShell>
  );
}
