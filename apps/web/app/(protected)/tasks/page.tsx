"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { ProjectTag, useActiveProject } from "~/components/shipflow/project-context";
import { TasksListSkeleton } from "~/components/shipflow/page-skeletons";
import { FADE_UP, PageHeader, STAGGER, StatusBadge } from "~/components/shipflow/ui-kit";
import { statusLabel } from "~/components/shipflow/status";
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
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-6">
      <motion.div variants={FADE_UP}>
        <PageHeader
          title="Task board"
          description={activeProject ? `Engineering tasks across ${activeProject.name}.` : "Engineering tasks across all active features."}
        />
      </motion.div>

      {showSkeleton ? (
        <TasksListSkeleton rows={3} />
      ) : activeFeatures.length === 0 ? (
        <motion.div variants={FADE_UP} className="border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks yet. Approve a PRD to generate engineering tasks.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {activeFeatures.map((feature) => {
            const status = feature.status as FeatureStatus;
            return (
              <motion.div variants={FADE_UP} key={feature.id}>
                <Link
                  href={`/features/${feature.id}?tab=tasks`}
                  className="group block border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.03]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-medium text-foreground">{feature.title}</h2>
                        <ProjectTag projectId={feature.projectId} className="shrink-0" />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    Open feature to view and manage tasks
                    <ArrowRight aria-hidden className="size-3.5 text-foreground/20 transition-colors group-hover:text-primary" />
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
