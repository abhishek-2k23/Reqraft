"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Clock, FileText, Loader2, Sparkles } from "lucide-react";

import { ShipFlowShell } from "~/components/shipflow/shell";
import { useActiveProject } from "~/components/shipflow/project-context";
import { trpc } from "~/trpc/client";

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function PrdListPage() {
  const router = useRouter();
  const { activeProjectId, ready, isLoading } = useActiveProject();
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );
  const withPrd = features.filter((f) => !["intake", "clarifying"].includes(f.status));
  const hasGenerating = withPrd.some((f) => f.status === "prd_generating");

  // Poll while any PRD is being generated
  useEffect(() => {
    if (!hasGenerating) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [hasGenerating, router]);

  return (
    <ShipFlowShell
      active="/prd"
      title="PRDs"
      description="Product Requirements Documents for all features."
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="mt-6"
      >
        {withPrd.length === 0 ? (
          <motion.div variants={FADE_UP} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-16 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-sm text-zinc-500">No PRDs yet. Create a feature request to generate your first PRD.</p>
            <Link href="/features/new" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all hover:scale-105 hover:bg-orange-400 active:scale-95">
              Create feature
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {withPrd.map((feature) => {
              const isGenerating = feature.status === "prd_generating";
              return (
                <motion.div variants={FADE_UP} key={feature.id}>
                  <Link
                    href={`/features/${feature.id}?tab=prd`}
                    className={
                      isGenerating
                        ? "group flex items-center justify-between rounded-2xl border border-purple-400/20 bg-gradient-to-r from-purple-950/40 via-zinc-950/60 to-zinc-950/40 px-6 py-5 shadow-2xl backdrop-blur-xl transition-all hover:border-purple-400/30"
                        : "group flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/40 px-6 py-5 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 hover:bg-zinc-900/40"
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className={`grid size-10 place-items-center rounded-full transition-colors ${isGenerating ? "bg-purple-400/10 text-purple-300" : "bg-white/5 text-zinc-500 group-hover:bg-orange-500/20 group-hover:text-orange-400"}`}>
                        {isGenerating
                          ? <Sparkles className="size-5" />
                          : <FileText className="size-5" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold transition-colors ${isGenerating ? "text-white" : "text-white group-hover:text-orange-200"}`}>
                          {feature.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                          {isGenerating && <Loader2 className="size-3 animate-spin text-purple-400" />}
                          {isGenerating
                            ? "AI is writing the PRD…"
                            : feature.status === "prd_ready"
                              ? "Awaiting approval"
                              : "PRD workflow active"}
                        </p>
                      </div>
                    </div>

                    {isGenerating ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                        <Loader2 className="size-3 animate-spin" />
                        Generating
                      </span>
                    ) : feature.status === "prd_ready" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                        <Clock className="size-3.5" /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Active
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </ShipFlowShell>
  );
}
