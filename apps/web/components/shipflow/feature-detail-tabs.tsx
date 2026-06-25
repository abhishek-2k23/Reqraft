"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RouterOutputs } from "@repo/trpc/client";
import {
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquareText,
  Rocket,
  SendHorizontal,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { statusLabel, statusTone } from "~/components/shipflow/status";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

type Feature = RouterOutputs["feature"]["getById"];
type Message = Feature["messages"][number];
type FeatureStatus = keyof typeof statusLabel;

const taskGroups = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "blocked", label: "Blocked" },
] as const;

const tabItems = [
  { value: "overview", label: "Overview" },
  { value: "clarify", label: "Clarify" },
  { value: "prd", label: "PRD" },
  { value: "tasks", label: "Tasks" },
  { value: "review-history", label: "Reviews" },
  { value: "release", label: "Release" },
];

function parseList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "Not set";
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No entries yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

export function FeatureDetailTabs({ feature }: { feature: Feature }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(feature.messages);
  const [message, setMessage] = useState("");
  const defaultTab = searchParams.get("tab") ?? "overview";
  const status = feature.status as FeatureStatus;

  const prd = feature.prd;
  const prdSections = useMemo(() => ({
    goals: parseList(prd?.goals),
    nonGoals: parseList(prd?.nonGoals),
    userStories: parseList(prd?.userStories),
    acceptanceCriteria: parseList(prd?.acceptanceCriteria),
    edgeCases: parseList(prd?.edgeCases),
    successMetrics: parseList(prd?.successMetrics),
  }), [prd]);

  const sendMessage = trpc.feature.sendClarificationMessage.useMutation({
    onSuccess: (result) => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          featureId: feature.id,
          role: "assistant",
          content: result.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const markPrdReady = trpc.feature.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Feature marked ready for PRD");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const approvePrd = trpc.prd.approve.useMutation({
    onSuccess: () => {
      toast.success("PRD approved and tasks unlocked");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTask = trpc.task.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
    onError: (error) => toast.error(error.message),
  });

  const approveRelease = trpc.approval.approve.useMutation({
    onSuccess: () => {
      toast.success("Release approved");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const shipFeature = trpc.approval.ship.useMutation({
    onSuccess: () => {
      toast.success("Feature shipped");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  function handleSendMessage() {
    const trimmed = message.trim();

    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        featureId: feature.id,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setMessage("");
    sendMessage.mutate({ featureId: feature.id, message: trimmed });
  }

  return (
    <Tabs defaultValue={defaultTab} className="gap-5">
      <TabsList className="h-auto flex-wrap justify-start rounded-lg border border-white/10 bg-white/[0.045] p-1">
        {tabItems.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", statusTone[status])}>
                {statusLabel[status]}
              </span>
              <span className="text-xs text-slate-500">Created {formatDate(feature.createdAt)}</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">{feature.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-slate-500">Priority</p>
                <p className="mt-1 text-sm font-medium capitalize text-white">{feature.priority}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-slate-500">Tasks</p>
                <p className="mt-1 text-sm font-medium text-white">{feature.tasks.length}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-slate-500">Pull requests</p>
                <p className="mt-1 text-sm font-medium text-white">{feature.pullRequests.length}</p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="clarify">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquareText className="size-4 text-cyan-200" />
            Clarification conversation
          </div>
          <div className="mt-5 max-h-[440px] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-500">No clarification messages yet. Ask the first question or add missing context.</p>
            ) : messages.map((item) => (
              <div key={item.id} className={cn("max-w-[88%] rounded-lg p-3 text-sm", item.role === "assistant" ? "bg-cyan-300 text-slate-950" : "ml-auto bg-white/10 text-slate-100")}>
                <p>{item.content}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add context or answer the AI clarification question..."
              className="min-h-24 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleSendMessage} disabled={!message.trim() || sendMessage.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                Send message
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={markPrdReady.isPending}
                onClick={() => markPrdReady.mutate({ featureId: feature.id, status: "prd_ready" })}
                className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              >
                Mark ready for PRD
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="prd">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          {!prd ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">No PRD has been generated yet.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Generated PRD</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{feature.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{prd.problem}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ListBlock title="Goals" items={prdSections.goals} />
                <ListBlock title="Non-goals" items={prdSections.nonGoals} />
                <ListBlock title="User stories" items={prdSections.userStories} />
                <ListBlock title="Acceptance criteria" items={prdSections.acceptanceCriteria} />
                <ListBlock title="Edge cases" items={prdSections.edgeCases} />
                <ListBlock title="Success metrics" items={prdSections.successMetrics} />
              </div>
              <div className="flex items-center gap-3">
                {prd.approvedAt ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    <CheckCircle2 className="size-3.5" />
                    Approved
                  </span>
                ) : (
                  <Button
                    type="button"
                    disabled={approvePrd.isPending}
                    onClick={() => approvePrd.mutate({ prdId: prd.id, featureId: feature.id })}
                    className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  >
                    {approvePrd.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Approve PRD
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="tasks">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {taskGroups.map((group) => {
            const tasks = feature.tasks.filter((task) => task.status === group.key);

            return (
              <div key={group.key} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                  <span className="text-xs text-slate-500">{tasks.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {tasks.length === 0 ? (
                    <p className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-slate-500">No tasks.</p>
                  ) : tasks.map((task) => (
                    <div key={task.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                      <p className="text-sm font-medium text-slate-100">{task.title}</p>
                      {task.description ? <p className="mt-2 text-xs leading-5 text-slate-400">{task.description}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {taskGroups.map((target) => (
                          <button
                            key={target.key}
                            type="button"
                            disabled={task.status === target.key || updateTask.isPending}
                            onClick={() => updateTask.mutate({ taskId: task.id, status: target.key })}
                            className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="review-history">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          {feature.reviewCycles.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No reviews yet. Link a PR to trigger AI review.</p>
          ) : (
            <div className="space-y-4">
              {feature.reviewCycles.map((cycle) => (
                <div key={cycle.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-200">Review #{cycle.cycleNumber}</span>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      cycle.overallVerdict === "approve" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                        cycle.overallVerdict === "request_changes" ? "border-red-500/30 bg-red-500/10 text-red-400" :
                          "border-white/10 bg-white/5 text-slate-400",
                    )}>
                      {cycle.overallVerdict ?? cycle.status}
                    </span>
                  </div>
                  {cycle.prdComplianceScore != null ? (
                    <p className="mt-3 text-xs text-slate-500">PRD score: <span className={cycle.prdComplianceScore >= 80 ? "text-emerald-400" : "text-amber-400"}>{cycle.prdComplianceScore}/100</span></p>
                  ) : null}
                  {cycle.summary ? <p className="mt-3 text-xs leading-5 text-slate-400">{cycle.summary}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="release">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          {feature.status === "shipped" ? (
            <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-8 text-center">
              <Rocket className="mx-auto size-10 text-emerald-300" />
              <h2 className="mt-4 text-xl font-bold text-white">Feature shipped</h2>
              <p className="mt-2 text-sm text-slate-400">This feature has been approved and shipped to production.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                {[
                  { label: "PRD approved", done: Boolean(prd?.approvedAt) },
                  { label: "Engineering tasks created", done: feature.tasks.length > 0 },
                  { label: "Pull request linked", done: feature.pullRequests.length > 0 },
                  { label: "AI review passed", done: feature.reviewCycles.some((cycle) => cycle.overallVerdict === "approve") },
                ].map((check) => (
                  <div key={check.label} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                    {check.done ? <CheckCircle2 className="size-4 shrink-0 text-emerald-400" /> : <Circle className="size-4 shrink-0 text-slate-600" />}
                    <span className={cn("text-sm", check.done ? "text-slate-200" : "text-slate-500")}>{check.label}</span>
                  </div>
                ))}
              </div>

              {feature.status === "in_review" || feature.status === "approved" ? (
                <div className="flex flex-wrap gap-3">
                  {feature.status !== "approved" ? (
                    <Button type="button" onClick={() => approveRelease.mutate({ featureId: feature.id })} disabled={approveRelease.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                      <ShieldCheck className="size-4" />
                      {approveRelease.isPending ? "Approving..." : "Approve release"}
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => shipFeature.mutate({ featureId: feature.id })} disabled={shipFeature.isPending} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                      <Rocket className="size-4" />
                      {shipFeature.isPending ? "Shipping..." : "Mark as shipped"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <TriangleAlert className="size-4 text-amber-400" />
                  <p className="text-xs text-amber-300">Feature must reach in-review state before release approval.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
