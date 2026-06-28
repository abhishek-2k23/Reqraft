"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { ShipFlowShell } from "~/components/shipflow/shell";
import { useActiveProject } from "~/components/shipflow/project-context";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

const FADE_UP_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function ReviewsPage() {
  const { activeProjectId, ready, isLoading } = useActiveProject();
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );
  const reviewedFeatures = features.filter((feature) => ["in_review", "approved", "shipped", "blocked"].includes(feature.status));

  return (
    <ShipFlowShell
      active="/reviews"
      title="Review History"
      description="AI code review cycles across all features."
    >
      <motion.div 
        initial="hidden" 
        animate="show" 
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} 
        className="mt-6"
      >
        {reviewedFeatures.length === 0 ? (
          <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-16 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-sm text-zinc-500">No reviews yet. Link a GitHub PR to trigger AI review.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {reviewedFeatures.map((feature) => (
              <motion.div variants={FADE_UP_ANIMATION_VARIANTS} key={feature.id}>
                <Link href={`/features/${feature.id}?tab=review-history`} className="group block cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 hover:bg-zinc-900/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white group-hover:text-orange-200 transition-colors">{feature.title}</h2>
                      <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500">{feature.description}</p>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
                      feature.status === "approved" || feature.status === "shipped" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
                        feature.status === "blocked" ? "border-red-500/20 bg-red-500/10 text-red-400" :
                          "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
                    )}>
                      {feature.status === "in_review" ? <><Loader2 className="size-3.5 animate-spin" /> Reviewing</> : null}
                      {feature.status === "approved" || feature.status === "shipped" ? <><CheckCircle2 className="size-3.5" /> Passed</> : null}
                      {feature.status === "blocked" ? <><XCircle className="size-3.5" /> Changes needed</> : null}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </ShipFlowShell>
  );
}
