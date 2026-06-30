"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useActiveProject } from "~/components/shipflow/project-context";
import { FADE_UP, PageHeader, STAGGER } from "~/components/shipflow/ui-kit";
import { trpc } from "~/trpc/client";

export default function ReviewsPage() {
  const { activeProjectId, ready, isLoading } = useActiveProject();
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );
  const reviewedFeatures = features.filter((feature) =>
    ["in_review", "approved", "shipped", "blocked"].includes(feature.status),
  );

  return (
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-6">
      <motion.div variants={FADE_UP}>
        <PageHeader title="Review history" description="AI code review cycles across all features." />
      </motion.div>

      {reviewedFeatures.length === 0 ? (
        <motion.div variants={FADE_UP} className="border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No reviews yet. Link a GitHub PR to trigger AI review.</p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          {reviewedFeatures.map((feature) => {
            const passed = feature.status === "approved" || feature.status === "shipped";
            const blocked = feature.status === "blocked";
            return (
              <motion.div variants={FADE_UP} key={feature.id}>
                <Link
                  href={`/features/${feature.id}?tab=review-history`}
                  className="group block border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.03]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {feature.title}
                      </h2>
                      <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                    <span
                      className={
                        passed
                          ? "inline-flex shrink-0 items-center gap-1.5 border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-success"
                          : blocked
                            ? "inline-flex shrink-0 items-center gap-1.5 border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-destructive"
                            : "inline-flex shrink-0 items-center gap-1.5 border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary"
                      }
                    >
                      {feature.status === "in_review" ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Reviewing
                        </>
                      ) : passed ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> Passed
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3.5" /> Changes needed
                        </>
                      )}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
