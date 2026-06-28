"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RouterOutputs } from "@repo/trpc/client";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Copy,
  FolderGit2,
  GripVertical,
  Loader2,
  MessageSquareText,
  Pencil,
  Rocket,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { statusLabel, statusTone } from "~/components/shipflow/status";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

type Feature = RouterOutputs["feature"]["getById"];
type RawPrd = NonNullable<Feature["prd"]>;
type ParsedPrd = Omit<
  RawPrd,
  | "goals"
  | "nonGoals"
  | "userStories"
  | "acceptanceCriteria"
  | "edgeCases"
  | "successMetrics"
  | "technicalRequirements"
  | "dependencies"
  | "risks"
> & {
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  acceptanceCriteria: string[];
  edgeCases: string[];
  successMetrics: string[];
  technicalRequirements: string[];
  dependencies: string[];
  risks: string[];
};
type Message = Feature["messages"][number];
type FeatureStatus = keyof typeof statusLabel;

const tabItems = [
  { value: "overview", label: "Overview" },
  { value: "clarify", label: "Clarify" },
  { value: "prd", label: "PRD" },
  { value: "tasks", label: "Tasks" },
  { value: "review-history", label: "Reviews" },
  { value: "release", label: "Release" },
];

const PROGRESS_MILESTONES = [
  { at: 0, pct: 3 },
  { at: 3000, pct: 20 },
  { at: 9000, pct: 45 },
  { at: 18000, pct: 68 },
  { at: 28000, pct: 85 },
  { at: 38000, pct: 95 },
];

const PRD_AI_STEPS = [
  { label: "Analyzing clarification conversation", threshold: 5 },
  { label: "Drafting goals and user stories", threshold: 30 },
  { label: "Writing acceptance criteria & edge cases", threshold: 60 },
  { label: "Finalizing PRD document", threshold: 80 },
];

function parseList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "Not set";
}

function ListBlock({
  title,
  items,
  icon,
  accent,
}: {
  title: string;
  items: string[];
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-white/[0.03] p-4", accent ?? "border-white/10")}>
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No entries.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-6 text-slate-300">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-600" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PrdGeneratingCard({
  progress,
  onCancel,
  cancelling,
}: {
  progress: number;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-purple-400/25 bg-gradient-to-br from-purple-950/50 via-slate-950/70 to-cyan-950/40 p-6 shadow-[0_0_40px_rgba(168,85,247,0.08)]">
      <div className="pointer-events-none absolute -left-20 -top-20 size-60 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 size-40 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="relative grid size-11 shrink-0 place-items-center rounded-full bg-purple-400/10 ring-1 ring-purple-400/20">
          <Sparkles className="size-5 text-purple-300" />
          <span className="absolute inset-0 animate-ping rounded-full bg-purple-400/10" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">AI is writing your PRD</p>
          <p className="text-xs text-slate-500">Usually takes 15–30 seconds</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
        >
          {cancelling ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
          {cancelling ? "Cancelling…" : "Cancel"}
        </button>
      </div>
      <div className="relative mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-[length:200%_100%] transition-all duration-1000 ease-out"
            style={{ width: `${progress}%`, animation: "shimmer 2s linear infinite" }}
          />
        </div>
        <style>{`@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
        <p className="mt-1.5 text-right font-mono text-[10px] text-slate-600">{progress}%</p>
      </div>
      <div className="mt-4 space-y-2.5">
        {PRD_AI_STEPS.map((step, i) => {
          const nextThreshold = PRD_AI_STEPS[i + 1]?.threshold ?? 101;
          const done = progress >= nextThreshold;
          const active = !done && progress >= step.threshold;
          return (
            <div key={step.label} className="flex items-center gap-2.5">
              {done ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
              ) : active ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-purple-300" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-white/10" />
              )}
              <span className={cn("text-xs transition-colors", done ? "text-slate-500" : active ? "text-slate-200" : "text-white/20")}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TasksGeneratingBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-4">
      <div className="relative grid size-8 shrink-0 place-items-center rounded-full bg-cyan-400/10">
        <Zap className="size-4 text-cyan-300" />
        <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/10" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Generating engineering tasks</p>
        <p className="text-xs text-slate-500">AI is breaking the PRD into developer-ready tasks — this takes about 30 seconds</p>
      </div>
      <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-cyan-400" />
    </div>
  );
}

function prdToastId(featureId: string) {
  return `prd-generating-${featureId}`;
}

// Inline editor for the PRD estimated effort (manual override, pre-approval only)
function EstimateEditor({
  value,
  onSave,
  pending,
}: {
  value: number | null;
  onSave: (hours: number | null) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(value?.toString() ?? ""); setEditing(true); }}
        className="group inline-flex items-center gap-1.5 rounded-md border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-xs font-medium text-sky-300 transition hover:border-sky-400/40"
      >
        {value ? `~${value}h` : "Add estimate"}
        <Pencil className="size-3 opacity-50 transition group-hover:opacity-100" />
      </button>
    );
  }

  function commit() {
    const trimmed = draft.trim();
    const parsed = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setEditing(false);
      return;
    }
    onSave(parsed);
    setEditing(false);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        autoFocus
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
      />
      <span className="text-xs text-slate-500">h</span>
      <button type="button" onClick={commit} disabled={pending} className="grid size-6 place-items-center rounded text-emerald-400 hover:bg-white/10">
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3.5" />}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="grid size-6 place-items-center rounded text-slate-500 hover:bg-white/10">
        <X className="size-3.5" />
      </button>
    </span>
  );
}

type Task = Feature["tasks"][number];
type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

const KANBAN_COLUMNS: { key: TaskStatus; label: string; tone: string }[] = [
  { key: "todo", label: "Todo", tone: "border-slate-500/30" },
  { key: "in_progress", label: "In progress", tone: "border-cyan-400/30" },
  { key: "done", label: "Done", tone: "border-emerald-400/30" },
  { key: "blocked", label: "Blocked", tone: "border-red-400/30" },
];

function buildColumns(tasks: Task[]): Record<TaskStatus, Task[]> {
  const cols: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [], blocked: [] };
  [...tasks]
    .sort((a, b) => a.order - b.order)
    .forEach((t) => {
      const status = (cols[t.status as TaskStatus] ? t.status : "todo") as TaskStatus;
      cols[status].push(t);
    });
  return cols;
}

function KanbanBoard({
  featureId,
  tasks: serverTasks,
  generating,
}: {
  featureId: string;
  tasks: Task[];
  generating: boolean;
}) {
  const utils = trpc.useUtils();
  const [columns, setColumns] = useState<Record<TaskStatus, Task[]>>(() => buildColumns(serverTasks));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ taskId: string; beforeId: string | null } | null>(null);
  const [blockReason, setBlockReason] = useState("");

  // Re-sync from the server whenever it sends fresh task data (generation, polling, etc.)
  const serverKey = serverTasks.map((t) => `${t.id}:${t.status}:${t.order}`).join("|");
  useEffect(() => {
    setColumns(buildColumns(serverTasks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const reorder = trpc.task.reorder.useMutation({
    onSuccess: () => utils.feature.getById.invalidate({ featureId }),
    onError: (error) => {
      toast.error(error.message);
      utils.feature.getById.invalidate({ featureId });
    },
  });

  function persist(next: Record<TaskStatus, Task[]>) {
    const items = KANBAN_COLUMNS.flatMap((col) =>
      next[col.key].map((t, index) => ({
        taskId: t.id,
        status: col.key,
        order: index,
        blockedReason: col.key === "blocked" ? t.blockedReason ?? null : null,
      })),
    );
    reorder.mutate({ items });
  }

  function commitMove(taskId: string, targetStatus: TaskStatus, beforeId: string | null, reason: string | null) {
    setColumns((prev) => {
      let moving: Task | undefined;
      const next: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [], blocked: [] };
      (Object.keys(prev) as TaskStatus[]).forEach((k) => {
        next[k] = prev[k].filter((t) => {
          if (t.id === taskId) { moving = t; return false; }
          return true;
        });
      });
      if (!moving) return prev;
      const updated: Task = {
        ...moving,
        status: targetStatus,
        blockedReason: targetStatus === "blocked" ? reason ?? moving.blockedReason ?? null : null,
      };
      const arr = [...next[targetStatus]];
      const insertAt = beforeId ? arr.findIndex((t) => t.id === beforeId) : arr.length;
      arr.splice(insertAt < 0 ? arr.length : insertAt, 0, updated);
      next[targetStatus] = arr;
      persist(next);
      return next;
    });
  }

  function handleDropOn(targetStatus: TaskStatus, beforeId: string | null) {
    const id = dragId;
    setDragId(null);
    setDragOverCol(null);
    if (!id) return;
    const current = (Object.keys(columns) as TaskStatus[]).find((k) => columns[k].some((t) => t.id === id));
    // No-op if dropping a task onto itself
    if (beforeId === id) return;
    if (targetStatus === "blocked" && current !== "blocked") {
      setPendingBlock({ taskId: id, beforeId });
      setBlockReason("");
      return;
    }
    commitMove(id, targetStatus, beforeId, null);
  }

  function confirmBlock() {
    if (!pendingBlock) return;
    commitMove(pendingBlock.taskId, "blocked", pendingBlock.beforeId, blockReason.trim() || "No reason provided");
    setPendingBlock(null);
    setBlockReason("");
    toast.info("Task marked as blocked");
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = columns[col.key];
          const isOver = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => { e.preventDefault(); handleDropOn(col.key, null); }}
              className={cn(
                "rounded-lg border bg-white/[0.03] p-4 transition-colors",
                col.tone,
                isOver && "border-cyan-300/60 bg-cyan-300/[0.06]",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  {col.key === "blocked" && <Ban className="size-3.5 text-red-400" />}
                  {col.label}
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">{colTasks.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {colTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-white/10 bg-black/20 p-3 text-center text-xs text-slate-600">
                    {generating ? "Generating…" : "Drop tasks here"}
                  </p>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                      onDrop={(e) => { e.stopPropagation(); e.preventDefault(); handleDropOn(col.key, task.id); }}
                      className={cn(
                        "group cursor-grab rounded-md border border-white/10 bg-black/30 p-3 transition active:cursor-grabbing",
                        dragId === task.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-600 transition group-hover:text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-100">{task.title}</p>
                          {task.description ? <p className="mt-1.5 text-xs leading-5 text-slate-400">{task.description}</p> : null}

                          {task.status === "blocked" && task.blockedReason ? (
                            <div className="mt-2 flex items-start gap-1.5 rounded border border-red-400/20 bg-red-400/5 px-2 py-1.5">
                              <Ban className="mt-0.5 size-3 shrink-0 text-red-400" />
                              <p className="text-[11px] leading-4 text-red-300">{task.blockedReason}</p>
                            </div>
                          ) : null}

                          {task.assigneeName ? (
                            <div className="mt-2 flex items-center gap-1.5">
                              {task.assigneeImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={task.assigneeImage} alt={task.assigneeName} className="size-4 rounded-full object-cover" />
                              ) : (
                                <div className="grid size-4 place-items-center rounded-full bg-cyan-300/20 text-[9px] font-bold text-cyan-300">
                                  {task.assigneeName[0]}
                                </div>
                              )}
                              <span className="text-[11px] text-slate-400">{task.assigneeName}</span>
                            </div>
                          ) : null}

                          {/* Quick-move buttons (accessible fallback for drag-and-drop) */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {KANBAN_COLUMNS.filter((t) => t.key !== task.status).map((target) => (
                              <button
                                key={target.key}
                                type="button"
                                disabled={reorder.isPending}
                                onClick={() => {
                                  if (target.key === "blocked") {
                                    setPendingBlock({ taskId: task.id, beforeId: null });
                                    setBlockReason("");
                                  } else {
                                    commitMove(task.id, target.key, null, null);
                                  }
                                }}
                                className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                              >
                                → {target.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Blocked reason dialog */}
      <AlertDialog open={pendingBlock !== null} onOpenChange={(open) => { if (!open) setPendingBlock(null); }}>
        <AlertDialogContent className="border-white/10 bg-[#0d1118]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Ban className="size-4 text-red-400" />
              Why is this task blocked?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Add a short reason so the team knows what needs to be resolved before work can continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            autoFocus
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="e.g. Waiting on design approval / blocked by API change in #1234"
            className="min-h-24 border-white/10 bg-white/5 text-sm text-slate-100 placeholder:text-slate-600"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 text-white hover:bg-red-400" onClick={confirmBlock}>
              Mark as blocked
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FeatureDetailTabs({ feature: initialFeature }: { feature: Feature }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const [messages, setMessages] = useState<Message[]>(initialFeature.messages);
  const [inputMessage, setInputMessage] = useState("");
  const [prdProgress, setPrdProgress] = useState(0);
  const [editPrompt, setEditPrompt] = useState("");
  const [shouldPoll, setShouldPoll] = useState(
    initialFeature.status === "prd_generating" ||
    (initialFeature.status === "in_progress" && initialFeature.tasks.length === 0) ||
    initialFeature.status === "in_review" ||
    initialFeature.reviewCycles.some((c) => c.status === "running"),
  );
  const [pollInterval, setPollInterval] = useState(3000);
  const wasGeneratingRef = useRef(false);

  // Exponential backoff: 3s → 4.5s → 6.75s → ... → 15s max, resets when polling stops
  useEffect(() => {
    if (!shouldPoll) { setPollInterval(3000); return; }
    const id = setInterval(() => {
      setPollInterval((prev) => Math.min(Math.round(prev * 1.5), 15000));
    }, 15000);
    return () => clearInterval(id);
  }, [shouldPoll]);

  const { data: feature } = trpc.feature.getById.useQuery(
    { featureId: initialFeature.id },
    {
      initialData: initialFeature,
      refetchInterval: shouldPoll ? pollInterval : false,
      refetchIntervalInBackground: false,
    },
  );

  const isGeneratingPrd = feature.status === "prd_generating";
  const isGeneratingTasks = feature.status === "in_progress" && feature.tasks.length === 0;
  const status = feature.status as FeatureStatus;
  const rawPrd = feature.prd;

  // Parse all PRD fields including the new ones
  const prd = useMemo<ParsedPrd | null>(() => {
    if (!rawPrd) return null;
    return {
      ...rawPrd,
      goals: parseList(rawPrd.goals),
      nonGoals: parseList(rawPrd.nonGoals),
      userStories: parseList(rawPrd.userStories),
      acceptanceCriteria: parseList(rawPrd.acceptanceCriteria),
      edgeCases: parseList(rawPrd.edgeCases),
      successMetrics: parseList(rawPrd.successMetrics),
      technicalRequirements: parseList(rawPrd.technicalRequirements),
      dependencies: parseList(rawPrd.dependencies),
      risks: parseList(rawPrd.risks),
    };
  }, [rawPrd]);

  // Sync polling state with live feature data
  const hasRunningReview = feature.reviewCycles.some((c) => c.status === "running");
  useEffect(() => {
    setShouldPoll(
      feature.status === "prd_generating" ||
      (feature.status === "in_progress" && feature.tasks.length === 0) ||
      feature.status === "in_review" ||
      hasRunningReview,
    );
  }, [feature.status, feature.tasks.length, hasRunningReview]);

  // Progress animation — picks up from elapsed time on re-mount
  useEffect(() => {
    if (!isGeneratingPrd) {
      setPrdProgress(0);
      return;
    }
    const elapsed = Date.now() - new Date(feature.updatedAt).getTime();
    const passed = PROGRESS_MILESTONES.filter((m) => m.at <= elapsed);
    const startPct = passed.at(-1)?.pct ?? PROGRESS_MILESTONES[0]!.pct;
    setPrdProgress(startPct);
    const remaining = PROGRESS_MILESTONES.filter((m) => m.at > elapsed);
    const timers = remaining.map(({ at, pct }) => setTimeout(() => setPrdProgress(pct), at - elapsed));
    return () => timers.forEach(clearTimeout);
  }, [isGeneratingPrd, feature.updatedAt]);

  // Stable toast via ID — no duplication on navigation
  useEffect(() => {
    const toastId = prdToastId(feature.id);
    if (isGeneratingPrd) {
      wasGeneratingRef.current = true;
      toast.custom(
        (tid) => (
          <div className="flex items-center gap-3 rounded-xl border border-purple-400/20 bg-[#0d1118] px-4 py-3 shadow-2xl ring-1 ring-white/5">
            <div className="relative grid size-7 shrink-0 place-items-center rounded-full bg-purple-400/10">
              <Sparkles className="size-3.5 text-purple-300" />
              <span className="absolute inset-0 animate-ping rounded-full bg-purple-400/10" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white">Generating PRD</p>
              <p className="text-[10px] text-slate-500">AI is writing your product requirements</p>
            </div>
            <button type="button" onClick={() => toast.dismiss(tid)} className="grid size-6 place-items-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white">
              <X className="size-3.5" />
            </button>
          </div>
        ),
        { id: toastId, duration: Infinity, position: "bottom-right" },
      );
    } else {
      toast.dismiss(toastId);
      if (wasGeneratingRef.current && prd) {
        toast.success("PRD is ready — review it in the PRD tab", { position: "bottom-right" });
      }
      wasGeneratingRef.current = false;
    }
  }, [isGeneratingPrd, feature.id, prd]);

  const utils = trpc.useUtils();
  const refreshFeature = () => utils.feature.getById.invalidate({ featureId: feature.id });

  const sendMessage = trpc.feature.sendClarificationMessage.useMutation({
    onSuccess: (result) => {
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, featureId: feature.id, role: "assistant", content: result.reply, createdAt: new Date().toISOString() },
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const triggerPrd = trpc.feature.triggerPrdGeneration.useMutation({
    onSuccess: refreshFeature,
    onError: (error) => toast.error(error.message),
  });

  const cancelPrd = trpc.feature.cancelPrdGeneration.useMutation({
    onSuccess: () => { toast.info("PRD generation cancelled"); refreshFeature(); },
    onError: (error) => toast.error(error.message),
  });

  const editPrd = trpc.prd.editWithAI.useMutation({
    onSuccess: () => {
      toast.success("PRD updated");
      setEditPrompt("");
      refreshFeature();
    },
    onError: (error) => toast.error(error.message),
  });

  const setDeadline = trpc.prd.setDeadline.useMutation({
    onSuccess: () => { toast.success("Deadline updated"); refreshFeature(); },
    onError: (error) => toast.error(error.message),
  });

  const updateEstimate = trpc.prd.updateEstimate.useMutation({
    onSuccess: () => { toast.success("Estimate updated"); refreshFeature(); },
    onError: (error) => toast.error(error.message),
  });

  const approvePrd = trpc.prd.approve.useMutation({
    onSuccess: () => {
      toast.success("PRD approved — generating engineering tasks…");
      setShouldPoll(true);
      refreshFeature();
    },
    onError: (error) => toast.error(error.message),
  });

  const orgMembers = trpc.member.list.useQuery();

  const SPECIALTY_SLOTS = [
    { key: "frontend",  label: "Frontend Developer",  taskTypes: ["frontend"] },
    { key: "backend",   label: "Backend Developer",   taskTypes: ["backend", "database"] },
    { key: "devops",    label: "DevOps Engineer",     taskTypes: ["infra"] },
    { key: "ai",        label: "AI Developer",        taskTypes: ["ai"] },
  ] as const;

  // specialty → first matching member
  const memberBySpecialty = Object.fromEntries(
    SPECIALTY_SLOTS.map((s) => [
      s.key,
      orgMembers.data?.find((m) => m.specialty === s.key || (s.key === "backend" && m.specialty === "fullstack")),
    ]),
  );

  const missingSpecialties = SPECIALTY_SLOTS.filter((s) => !memberBySpecialty[s.key]);

  // specialtyKey → userId chosen for missing slots
  const [specialtyOverrides, setSpecialtyOverrides] = useState<Record<string, string>>({});

  const approveRelease = trpc.approval.approve.useMutation({
    onSuccess: () => { toast.success("Release approved"); router.refresh(); },
    onError: (error) => toast.error(error.message),
  });

  const shipFeature = trpc.approval.ship.useMutation({
    onSuccess: () => { toast.success("Feature shipped"); router.refresh(); },
    onError: (error) => toast.error(error.message),
  });

  function handleSendMessage() {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, featureId: feature.id, role: "user", content: trimmed, createdAt: new Date().toISOString() },
    ]);
    setInputMessage("");
    sendMessage.mutate({ featureId: feature.id, message: trimmed });
  }

  return (
    <Tabs defaultValue={defaultTab} className="gap-5">
      <TabsList className="h-auto flex-wrap justify-start rounded-lg border border-white/10 bg-white/[0.045] p-1">
        {tabItems.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">
            {value === "prd" && isGeneratingPrd ? (
              <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />{label}</span>
            ) : value === "tasks" && isGeneratingTasks ? (
              <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />{label}</span>
            ) : label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ── Overview ─────────────────────────────────────── */}
      <TabsContent value="overview">
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
      </TabsContent>

      {/* ── Clarify ──────────────────────────────────────── */}
      <TabsContent value="clarify">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquareText className="size-4 text-cyan-200" />
            Clarification conversation
          </div>
          <div className="mt-5 max-h-[440px] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-500">No messages yet.</p>
            ) : messages.map((item) => (
              <div key={item.id} className={cn("max-w-[88%] rounded-lg p-3 text-sm", item.role === "assistant" ? "bg-cyan-300 text-slate-950" : "ml-auto bg-white/10 text-slate-100")}>
                {item.content}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <Textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Add context or answer the AI's question…" className="min-h-24 border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600" />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleSendMessage} disabled={!inputMessage.trim() || sendMessage.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                Send
              </Button>
              <Button type="button" variant="outline" disabled={triggerPrd.isPending || isGeneratingPrd} onClick={() => triggerPrd.mutate({ featureId: feature.id })} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 disabled:opacity-50">
                {isGeneratingPrd ? <><Loader2 className="size-4 animate-spin" />Generating PRD…</> : "Generate PRD now"}
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ── PRD ──────────────────────────────────────────── */}
      <TabsContent value="prd">
        <div className="space-y-4">
          {isGeneratingPrd ? (
            <PrdGeneratingCard
              progress={prdProgress}
              onCancel={() => cancelPrd.mutate({ featureId: feature.id })}
              cancelling={cancelPrd.isPending}
            />
          ) : !prd ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-10 text-center">
              <p className="text-sm text-slate-500">No PRD generated yet.</p>
              <Button type="button" variant="outline" disabled={triggerPrd.isPending} onClick={() => triggerPrd.mutate({ featureId: feature.id })} className="mt-4 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
                {triggerPrd.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Generate PRD
              </Button>
            </div>
          ) : (
            <>
              {/* PRD Header */}
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-cyan-300">Product Requirements Document</p>
                    <h2 className="mt-1 text-xl font-bold text-white">{feature.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{prd.problem}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                      v{prd.version}
                    </span>
                    {prd.approvedAt ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        Approved
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Meta row: estimate + deadline */}
                <div className="mt-4 grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
                  {/* Estimated effort */}
                  <div className="flex items-center gap-3">
                    <Clock className="size-4 shrink-0 text-sky-400" />
                    <span className="text-xs text-slate-500">Estimated effort:</span>
                    {prd.approvedAt ? (
                      <span className="text-xs font-medium text-sky-300">
                        {prd.estimatedTotalHours ? `~${prd.estimatedTotalHours}h` : "Not estimated"}
                      </span>
                    ) : (
                      <EstimateEditor
                        key={prd.estimatedTotalHours ?? "none"}
                        value={prd.estimatedTotalHours}
                        pending={updateEstimate.isPending}
                        onSave={(hours) => updateEstimate.mutate({ prdId: prd.id, estimatedTotalHours: hours })}
                      />
                    )}
                  </div>

                  {/* Target deadline */}
                  <div className="flex items-center gap-3">
                    <CalendarClock className="size-4 shrink-0 text-purple-300" />
                    <span className="text-xs text-slate-500">Target deadline:</span>
                    {prd.approvedAt ? (
                      <span className="text-xs font-medium text-slate-300">
                        {prd.targetDeadline ? formatDate(prd.targetDeadline) : "Not set"}
                      </span>
                    ) : (
                      <input
                        type="date"
                        defaultValue={
                          prd.targetDeadline
                            ? new Date(prd.targetDeadline).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setDeadline.mutate({ prdId: prd.id, targetDeadline: e.target.value || null })
                        }
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 [color-scheme:dark]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Manager view */}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <Users className="size-3.5" /> For Managers
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ListBlock title="Goals" items={prd.goals} accent="border-emerald-400/15" icon={<span className="size-2 rounded-full bg-emerald-400" />} />
                  <ListBlock title="Non-goals" items={prd.nonGoals} accent="border-red-400/15" icon={<span className="size-2 rounded-full bg-red-400" />} />
                  <ListBlock title="User stories" items={prd.userStories} />
                  <ListBlock title="Success metrics" items={prd.successMetrics} accent="border-sky-400/15" icon={<Zap className="size-3.5 text-sky-400" />} />
                </div>
              </div>

              {/* Developer view */}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <Code2 className="size-3.5" /> For Developers
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ListBlock title="Technical requirements" items={prd.technicalRequirements} accent="border-purple-400/15" icon={<Code2 className="size-3.5 text-purple-400" />} />
                  <ListBlock title="Acceptance criteria" items={prd.acceptanceCriteria} accent="border-cyan-400/15" icon={<CheckCircle2 className="size-3.5 text-cyan-400" />} />
                  <ListBlock title="Dependencies" items={prd.dependencies} accent="border-amber-400/15" icon={<FolderGit2 className="size-3.5 text-amber-400" />} />
                  <ListBlock title="Edge cases" items={prd.edgeCases} />
                </div>
                {prd.risks.length > 0 && (
                  <div className="mt-4">
                    <ListBlock title="Risks & mitigations" items={prd.risks} accent="border-orange-400/15" icon={<AlertTriangle className="size-3.5 text-orange-400" />} />
                  </div>
                )}
              </div>

              {/* AI Edit panel — only before approval */}
              {!prd.approvedAt && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Wand2 className="size-4 text-purple-300" />
                    Edit with AI
                  </p>
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder='Describe what to change — e.g. "Add a section about offline support" or "Make the acceptance criteria more specific"'
                    className="min-h-20 border-white/10 bg-white/5 text-sm text-slate-100 placeholder:text-slate-600"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      AI will apply your changes and bump the version. Content before approval is never locked.
                    </p>
                    <Button
                      type="button"
                      disabled={!editPrompt.trim() || editPrd.isPending}
                      onClick={() => editPrd.mutate({ prdId: prd.id, featureId: feature.id, prompt: editPrompt })}
                      className="shrink-0 bg-purple-500 text-white hover:bg-purple-400"
                    >
                      {editPrd.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                      {editPrd.isPending ? "Editing…" : "Apply changes"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Approve / locked */}
              <div className="flex items-center gap-3">
                {prd.approvedAt ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
                    <ShieldCheck className="size-4" />
                    PRD approved on {formatDate(prd.approvedAt)} — editing is locked
                  </div>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" disabled={approvePrd.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                        {approvePrd.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Approve PRD
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-white/10 bg-[#0d1118] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Team coverage before task generation</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          AI will assign tasks based on each developer's specialty. Fill in missing slots or add team members.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <div className="my-1 grid gap-2">
                        {SPECIALTY_SLOTS.map((slot) => {
                          const covered = memberBySpecialty[slot.key];
                          return (
                            <div key={slot.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                              <span className={cn("size-2 shrink-0 rounded-full", covered ? "bg-emerald-400" : "bg-amber-400")} />
                              <span className="w-40 shrink-0 text-sm text-slate-300">{slot.label}</span>
                              {covered ? (
                                <span className="text-sm text-slate-400">{covered.name}</span>
                              ) : (
                                <Select
                                  value={specialtyOverrides[slot.key] ?? ""}
                                  onValueChange={(v) => setSpecialtyOverrides((prev) => ({ ...prev, [slot.key]: v }))}
                                >
                                  <SelectTrigger className="h-7 border-white/10 bg-white/5 text-xs text-slate-300">
                                    <SelectValue placeholder="Assign to…" />
                                  </SelectTrigger>
                                  <SelectContent className="border-white/10 bg-[#0d1118]">
                                    {orgMembers.data?.map((m) => (
                                      <SelectItem key={m.userId} value={m.userId} className="text-slate-300 focus:bg-white/10 focus:text-white text-xs">
                                        {m.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {missingSpecialties.length > 0 && (
                        <p className="text-xs text-slate-500">
                          Missing specialties without an assignment will be left unassigned.{" "}
                          <button
                            type="button"
                            className="text-cyan-400 underline-offset-2 hover:underline"
                            onClick={() => router.push("/settings/team")}
                          >
                            Add team members →
                          </button>
                        </p>
                      )}

                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                          onClick={() => approvePrd.mutate({
                            prdId: prd.id,
                            featureId: feature.id,
                            specialtyOverrides: Object.keys(specialtyOverrides).length ? specialtyOverrides : undefined,
                          })}
                        >
                          Approve & generate tasks
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </div>
      </TabsContent>

      {/* ── Tasks ────────────────────────────────────────── */}
      <TabsContent value="tasks">
        <div className="space-y-4">
          {isGeneratingTasks && <TasksGeneratingBanner />}
          {feature.tasks.length === 0 && !isGeneratingTasks ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-10 text-center">
              <p className="text-sm text-slate-500">No tasks yet. Approve the PRD to generate engineering tasks.</p>
            </div>
          ) : (
            <>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <GripVertical className="size-3.5" />
                Drag tasks between columns or use the quick-move buttons. Moving a task to <span className="font-medium text-red-300">Blocked</span> asks for a reason.
              </p>
              <KanbanBoard featureId={feature.id} tasks={feature.tasks} generating={isGeneratingTasks} />
            </>
          )}
        </div>
      </TabsContent>

      {/* ── Reviews ──────────────────────────────────────── */}
      <TabsContent value="review-history">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          {hasRunningReview && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
              <Loader2 className="size-4 animate-spin text-cyan-400" />
              <p className="text-sm text-cyan-200">AI is reviewing the latest pull request against the PRD…</p>
            </div>
          )}
          {feature.reviewCycles.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">No reviews yet. Open a pull request from a branch named:</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="font-mono text-xs text-slate-300">feature/{feature.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(`feature/${feature.id}`);
                    toast.success("Branch name copied");
                  }}
                  className="text-slate-500 transition hover:text-cyan-300"
                  title="Copy branch name"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-600">The full feature ID is required — the branch name must match exactly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feature.reviewCycles.map((cycle) => (
                <div key={cycle.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-200">Review #{cycle.cycleNumber}</span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      cycle.overallVerdict === "approve" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : cycle.overallVerdict === "request_changes" ? "border-red-500/30 bg-red-500/10 text-red-400"
                          : "border-white/10 bg-white/5 text-slate-400",
                    )}>
                      {cycle.status === "running" && <Loader2 className="size-3 animate-spin" />}
                      {cycle.overallVerdict === "approve" ? "Approved" : cycle.overallVerdict === "request_changes" ? "Changes requested" : cycle.status}
                    </span>
                  </div>
                  {cycle.prdComplianceScore != null && (
                    <p className="mt-3 text-xs text-slate-500">
                      PRD compliance: <span className={cycle.prdComplianceScore >= 80 ? "text-emerald-400" : "text-amber-400"}>{cycle.prdComplianceScore}/100</span>
                    </p>
                  )}
                  {cycle.summary && <p className="mt-3 text-xs leading-5 text-slate-400">{cycle.summary}</p>}

                  {cycle.issues.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Findings ({cycle.issues.length})
                      </p>
                      {cycle.issues.map((issue) => (
                        <div key={issue.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-slate-200">{issue.title}</p>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              issue.severity === "blocking" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300",
                            )}>
                              {issue.severity === "blocking" ? "Blocking" : "Non-blocking"}
                            </span>
                          </div>
                          {issue.filePath && <p className="mt-1 font-mono text-[11px] text-slate-500">{issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ""}</p>}
                          {issue.suggestion && <p className="mt-2 text-xs leading-5 text-slate-400">{issue.suggestion}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Release ──────────────────────────────────────── */}
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
                  { label: "AI review passed", done: feature.reviewCycles.some((c) => c.overallVerdict === "approve") },
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
                      {approveRelease.isPending ? "Approving…" : "Approve release"}
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => shipFeature.mutate({ featureId: feature.id })} disabled={shipFeature.isPending} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                      <Rocket className="size-4" />
                      {shipFeature.isPending ? "Shipping…" : "Mark as shipped"}
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
