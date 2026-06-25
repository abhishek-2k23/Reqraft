"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, GitPullRequestArrow, MessageSquareText, Rocket } from "lucide-react";

const actions = [
  {
    id: "clarify",
    label: "Ask clarification",
    icon: MessageSquareText,
    result: "AI asked 3 missing-context questions before generating the PRD.",
  },
  {
    id: "prd",
    label: "Generate PRD",
    icon: Bot,
    result: "PRD generated with goals, non-goals, user stories, edge cases, and success metrics.",
  },
  {
    id: "review",
    label: "Run AI review",
    icon: GitPullRequestArrow,
    result: "AI reviewed acme/web#148 and found 1 blocking issue plus 2 suggestions.",
  },
  {
    id: "approve",
    label: "Approve release",
    icon: CheckCircle2,
    result: "Human approval is waiting until the blocking issue is fixed.",
  },
  {
    id: "ship",
    label: "Ship feature",
    icon: Rocket,
    result: "Release is locked until AI review passes and human approval is recorded.",
  },
];

export function ActionBoard() {
  const [selectedAction, setSelectedAction] = useState(actions[0]!);
  const [runs, setRuns] = useState(1);

  const history = useMemo(
    () => actions.slice(0, Math.min(runs, actions.length)),
    [runs],
  );

  return (
    <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">Interactive workflow demo</p>
          <p className="text-sm text-cyan-50/75">Click actions to see how ShipFlow gates release quality.</p>
        </div>
        <button
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
          onClick={() => setRuns((value) => (value >= actions.length ? 1 : value + 1))}
        >
          Run next step
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          const active = selectedAction.id === action.id;

          return (
            <button
              key={action.id}
              className={`rounded-md border px-3 py-3 text-left text-sm transition ${
                active
                  ? "border-cyan-200 bg-cyan-200 text-slate-950"
                  : "border-white/10 bg-black/20 text-slate-200 hover:bg-white/10"
              }`}
              onClick={() => setSelectedAction(action)}
            >
              <Icon className="mb-2 size-4" />
              {action.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-md border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Current result</p>
        <p className="mt-2 text-sm leading-6 text-slate-100">{selectedAction.result}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {history.map((item) => (
          <span key={item.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
