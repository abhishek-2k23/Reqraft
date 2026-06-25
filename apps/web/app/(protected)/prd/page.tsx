"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, FileText } from "lucide-react";

import { ShipFlowShell } from "~/components/shipflow/shell";
import { trpc } from "~/trpc/client";

const FADE_UP_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function PrdListPage() {
  const { data: features = [] } = trpc.feature.list.useQuery();
  const withPrd = features.filter((feature) => !["intake", "clarifying"].includes(feature.status));

  return (
    <ShipFlowShell
      active="/prd"
      title="PRDs"
      description="Product Requirements Documents for all features."
    >
      <motion.div 
        initial="hidden" 
        animate="show" 
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} 
        className="mt-6"
      >
        {withPrd.length === 0 ? (
          <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-16 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-sm text-zinc-500">No PRDs yet. Create a feature request to generate your first PRD.</p>
            <Link href="/features/new" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all hover:scale-105 hover:bg-orange-400 active:scale-95">
              Create feature
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {withPrd.map((feature) => (
              <motion.div variants={FADE_UP_ANIMATION_VARIANTS} key={feature.id}>
                <Link
                  href={`/features/${feature.id}?tab=prd`}
                  className="group flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/40 px-6 py-5 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 hover:bg-zinc-900/40"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid size-10 place-items-center rounded-full bg-white/5 transition-colors group-hover:bg-orange-500/20 group-hover:text-orange-400 text-zinc-500">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-orange-200 transition-colors">{feature.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {feature.status === "prd_ready" ? "Awaiting approval" : "PRD workflow active"}
                      </p>
                    </div>
                  </div>
                  {feature.status === "prd_ready" ? 
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400"><Clock className="size-3.5" /> Pending</span> 
                    : <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400"><CheckCircle2 className="size-3.5" /> Active</span>
                  }
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </ShipFlowShell>
  );
}
