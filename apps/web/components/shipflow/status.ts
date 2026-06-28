import type { DemoFeature } from "@repo/services/shipflow/demo";

export const statusLabel: Record<DemoFeature["status"], string> = {
  intake: "Intake",
  clarifying: "Clarifying",
  prd_generating: "Generating PRD",
  prd_ready: "PRD ready",
  tasks_ready: "Tasks ready",
  in_progress: "In progress",
  in_review: "AI review",
  approved: "Approved",
  shipped: "Shipped",
  blocked: "Blocked",
};

export const statusTone: Record<DemoFeature["status"], string> = {
  intake: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  clarifying: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  prd_generating: "border-purple-400/30 bg-purple-400/10 text-purple-100",
  prd_ready: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  tasks_ready: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  in_progress: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  in_review: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100",
  approved: "border-lime-400/30 bg-lime-400/10 text-lime-100",
  shipped: "border-green-400/30 bg-green-400/10 text-green-100",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-100",
};

export const reviewTone = {
  processing: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  passed: "border-green-400/30 bg-green-400/10 text-green-100",
  changes_requested: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-100",
};
