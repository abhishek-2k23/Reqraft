import Link from "next/link";
import { Bot, CircleDot, GitPullRequestArrow, Star, TriangleAlert } from "lucide-react";

import type {
  DemoFeature,
  DemoRepository,
  DemoReview,
  DemoTask,
} from "@repo/services/shipflow/demo";
import { cn } from "~/lib/utils";
import { reviewTone, statusLabel, statusTone } from "./status";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

export function FeatureCard({ feature }: { feature: DemoFeature }) {
  return (
    <Link
      href={`/features/${feature.id}`}
      className="block rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{feature.title}</p>
          <p className="mt-1 text-xs text-slate-400">Owner: {feature.owner}</p>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", statusTone[feature.status])}>
          {statusLabel[feature.status]}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${feature.progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{feature.progress}% complete</span>
        <span>{feature.linkedPr ?? "No PR"}</span>
      </div>
    </Link>
  );
}

export function RepositoryRow({ repo }: { repo: DemoRepository }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4">
      <div>
        <p className="font-medium text-white">{repo.fullName}</p>
        <p className="text-xs text-slate-400">Default branch: {repo.defaultBranch}</p>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-1 text-xs",
          repo.reviewHealth === "passing" && "bg-emerald-400/10 text-emerald-100",
          repo.reviewHealth === "attention" && "bg-amber-400/10 text-amber-100",
          repo.reviewHealth === "blocked" && "bg-rose-400/10 text-rose-100",
        )}
      >
        {repo.connected ? repo.reviewHealth : "not connected"}
      </span>
    </div>
  );
}

export function TaskBoard({ tasks }: { tasks: DemoTask[] }) {
  const columns: Array<{ key: DemoTask["status"]; title: string }> = [
    { key: "todo", title: "Todo" },
    { key: "in_progress", title: "In progress" },
    { key: "blocked", title: "Blocked" },
    { key: "done", title: "Done" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {columns.map((column) => (
        <div key={column.key} className="rounded-lg border border-white/10 bg-white/[0.035]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-medium text-white">{column.title}</p>
          </div>
          <div className="space-y-3 p-3">
            {tasks
              .filter((task) => task.status === column.key)
              .map((task) => (
                <div key={task.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-2 text-xs text-cyan-100">
                    <CircleDot className="size-3" />
                    {task.type} · {task.priority}
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-400">Assigned to {task.assignee}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewCard({ review }: { review: DemoReview }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitPullRequestArrow className="size-4 text-cyan-200" />
          <p className="font-medium text-white">{review.pullRequest}</p>
        </div>
        <span className={cn("rounded-full border px-2 py-1 text-xs", reviewTone[review.status])}>
          {review.status.replace("_", " ")}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{review.summary}</p>
      <div className="mt-4 space-y-2">
        {review.findings.map((finding) => (
          <div key={`${finding.file}-${finding.message}`} className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs">
              {finding.severity === "blocking" ? (
                <TriangleAlert className="size-3 text-rose-300" />
              ) : finding.severity === "positive" ? (
                <Star className="size-3 text-emerald-300" />
              ) : (
                <Bot className="size-3 text-amber-300" />
              )}
              <span className="text-slate-400">{finding.file}</span>
            </div>
            <p className="mt-1 text-sm text-slate-200">{finding.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
