"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, GitPullRequestArrow, Plus, Rocket, ShieldCheck } from "lucide-react";

import { useActiveProject } from "~/components/shipflow/project-context";
import { LinkPending } from "~/components/shipflow/link-pending";
import {
  FADE_UP,
  PageHeader,
  SectionCard,
  STAGGER,
  StatTile,
  StatusBadge,
} from "~/components/shipflow/ui-kit";
import { statusLabel } from "~/components/shipflow/status";
import { trpc } from "~/trpc/client";

type FeatureStatus = keyof typeof statusLabel;

const finishedStatuses = new Set(["approved", "shipped"]);

const pipelineStages = [
  { label: "Intake", statuses: ["intake", "clarifying"] },
  { label: "PRD", statuses: ["prd_generating", "prd_ready"] },
  { label: "Tasks", statuses: ["tasks_ready", "in_progress"] },
  { label: "Review", statuses: ["in_review"] },
  { label: "Shipped", statuses: ["approved", "shipped"] },
] as const;

function NewRequestButton() {
  return (
    <Link
      href="/features/new"
      className="inline-flex h-9 items-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:opacity-95 active:scale-[0.97]"
    >
      <Plus className="size-4" />
      New request
      <LinkPending />
    </Link>
  );
}

export default function DashboardPage() {
  const { activeProjectId, activeProject, ready, isLoading } = useActiveProject();
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );

  const shipped = features.filter((f) => f.status === "shipped").length;
  const finished = features.filter((f) => finishedStatuses.has(f.status)).length;
  const blockers = features.filter((f) => f.status === "blocked").length;
  const shippedPercent = features.length ? Math.round((shipped / features.length) * 100) : 0;
  const latest = features.slice(0, 5);

  const stageCounts = pipelineStages.map((stage) => ({
    label: stage.label,
    count: features.filter((f) => (stage.statuses as readonly string[]).includes(f.status)).length,
  }));

  return (
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-8">
        <motion.div variants={FADE_UP}>
          <PageHeader
            title="Dashboard"
            description="One control room for product discovery, PRD generation, engineering tasks, AI review, and release approval."
            action={<NewRequestButton />}
          />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Features shipped" value={shippedPercent} suffix="%" detail={`${shipped} of ${features.length} features live`} icon={Rocket} />
          <StatTile label="Approved flow" value={finished} detail="Approved or already shipped" icon={ShieldCheck} />
          <StatTile label="Active work" value={Math.max(features.length - finished, 0)} detail="Requests still moving through Reqraft" icon={Clock3} />
          <StatTile label="Open blockers" value={blockers} detail="Issues preventing release today" icon={GitPullRequestArrow} />
        </div>

        {/* Delivery pipeline — blueprint band */}
        <motion.div variants={FADE_UP}>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Delivery pipeline
          </p>
          <div className="grid grid-cols-2 overflow-hidden border border-border bg-card sm:grid-cols-3 lg:grid-cols-5">
            {stageCounts.map((stage, i) => (
              <div
                key={stage.label}
                className="relative flex items-center justify-between gap-2 border-b border-border p-4 last:border-b-0 sm:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stage.label}</p>
                  <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">{stage.count}</p>
                </div>
                {i < stageCounts.length - 1 ? (
                  <ArrowRight aria-hidden className="hidden size-4 shrink-0 text-foreground/20 lg:block" />
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active features */}
        <SectionCard
          title="Active features"
          subtitle={activeProject ? `Requests in ${activeProject.name}.` : "Real requests from your current organization."}
          action={<NewRequestButton />}
        >
          {latest.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm text-muted-foreground">
                No features yet. Create the first request and Reqraft will start the workflow.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {latest.map((feature) => {
                const status = feature.status as FeatureStatus;
                return (
                  <Link
                    key={feature.id}
                    href={`/features/${feature.id}`}
                    className="group grid gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[1.5fr_0.7fr_0.7fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="truncate font-medium text-foreground">{feature.title}</p>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                    <p className="text-sm capitalize text-muted-foreground">{feature.priority}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {new Date(feature.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-foreground/20 transition-colors group-hover:text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
    </motion.div>
  );
}
