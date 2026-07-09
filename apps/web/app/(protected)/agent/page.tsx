"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileDiff,
  GitBranch,
  GitPullRequest,
  History,
  KeyRound,
  Loader2,
  Lock,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  SquarePen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { agentChatStore, useAgentChat } from "@/features/agent/client/chat-store";
import { BranchChip, GithubPrView } from "@/features/agent/components/github-pr-view";
import type { AgentPlan, PartialAgentPlan } from "@/features/agent/plan-schema";
import { AGENT_PROVIDER_INFO, type ProviderInfo } from "@/features/agent/providers";
import {
  deleteAgentKeyAction,
  listAgentKeysAction,
  raiseAgentPrAction,
  saveAgentKeyAction,
} from "@/features/agent/server/actions";
import type { AgentProvider } from "@repo/database/schema";

type SavedKey = {
  provider: string;
  keyHint: string | null;
  defaultModel: string | null;
  updatedAt: string;
};

// Mirrors the server's branch naming (create-pr.ts) so the preview header can
// show the branch the PR will actually be opened on.
function previewBranch(title: string | undefined) {
  const slug =
    (title ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "change";
  return `reqraft-agent/${slug}`;
}

/* ------------------------------------------------------------------ */
/* API key management                                                   */
/* ------------------------------------------------------------------ */

function ProviderKeyRow({
  info,
  saved,
  onChanged,
}: {
  info: ProviderInfo;
  saved: SavedKey | undefined;
  onChanged: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setBusy(true);
    const res = await saveAgentKeyAction({ provider: info.id, apiKey: value });
    setBusy(false);
    if (res.ok) {
      toast.success(`${info.shortLabel} key saved & encrypted`);
      setValue("");
      setEditing(false);
      onChanged();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete() {
    setBusy(true);
    const res = await deleteAgentKeyAction({ provider: info.id });
    setBusy(false);
    if (res.ok) {
      toast.success(`${info.shortLabel} key removed`);
      onChanged();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{info.label}</p>
          {saved?.keyHint ? (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-success">
              <Check className="size-3.5" /> Key saved
              <span className="font-mono text-muted-foreground">••••{saved.keyHint}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">No key added yet</p>
          )}
        </div>
        {saved && !editing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-foreground/10 px-2.5 py-1.5 text-xs text-foreground/80 transition hover:bg-foreground/5"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
            >
              <Trash2 className="size-3" /> Remove
            </button>
          </div>
        )}
      </div>

      {(!saved || editing) && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={info.keyPlaceholder}
            className="flex-1"
          />
          <Button size="sm" disabled={busy || !value.trim()} onClick={handleSave}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
            Save
          </Button>
        </div>
      )}
      <a
        href={info.keysUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground/80 hover:underline"
      >
        Get an API key <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

function KeysDialog({
  open,
  onOpenChange,
  keys,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  keys: SavedKey[];
  onChanged: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <KeyRound className="size-4 text-primary" /> Model API keys
          </DialogTitle>
          <DialogDescription>
            Bring your own key from OpenAI, Anthropic, or Google — the agent runs on your model, so
            it never consumes Reqraft AI credits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/10 px-3.5 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <p className="text-xs leading-5 text-success">
            Keys are encrypted with AES-256-GCM before they&apos;re stored. Nobody can read them —
            not other members of your org, and not even Reqraft developers. They&apos;re decrypted
            in memory only for the moment your agent runs.
          </p>
        </div>

        <div className="space-y-3" data-lenis-prevent>
          {AGENT_PROVIDER_INFO.map((info) => (
            <ProviderKeyRow
              key={info.id}
              info={info}
              saved={keys.find((k) => k.provider === info.id)}
              onChanged={onChanged}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Plan rendering                                                       */
/* ------------------------------------------------------------------ */

// Tolerates a still-streaming PartialAgentPlan: every section renders as soon
// as its data starts arriving, so the user watches the plan/files being written.
function PlanMessage({
  plan,
  streaming,
  cancelled,
  prUrl,
  prNumber,
  prBranch,
  prDraft,
  repoFullName,
  baseBranch,
  featureBranch,
  authorName,
  onRaisePr,
}: {
  plan: PartialAgentPlan;
  streaming?: boolean;
  cancelled?: boolean;
  prUrl?: string;
  prNumber?: number;
  prBranch?: string;
  prDraft?: boolean;
  repoFullName?: string;
  baseBranch: string;
  /** The feature's canonical feature/<slug> branch — the PR's real head. */
  featureBranch?: string;
  authorName?: string;
  onRaisePr?: () => void;
}) {
  const steps = (plan.plan ?? []).filter((s): s is string => Boolean(s));
  const files = (plan.files ?? []).filter(Boolean);
  const questions = (plan.questions ?? []).filter((q): q is string => Boolean(q));
  const headBranch = prBranch ?? featureBranch ?? previewBranch(plan.title);
  const canRaise = !streaming && !prUrl && files.length > 0 && Boolean(onRaisePr);

  return (
    <div className="space-y-4">
      {cancelled && (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-700 dark:text-amber-300">
          <Square className="size-3" /> Generation stopped — partial result
        </p>
      )}

      {plan.summary && <p className="text-sm leading-6 text-foreground/90">{plan.summary}</p>}

      {/* Decisions the agent needs before it can implement safely. */}
      {questions.length > 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <CircleHelp className="size-3.5" />
            Needs your decision{questions.length === 1 ? "" : "s"}
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px]">
              {questions.length}
            </span>
          </p>
          <ol className="mt-3 space-y-3">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-6 text-foreground/90">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 whitespace-pre-wrap">{q}</span>
              </li>
            ))}
          </ol>
          {!streaming && (
            <p className="mt-3 border-t border-primary/10 pt-2.5 text-xs text-muted-foreground">
              Reply below with your choices — e.g.{" "}
              <span className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-[10px]">
                1: keep names · 2: localStorage · 3: in-browser tests
              </span>{" "}
              — and I&apos;ll implement accordingly.
            </p>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</p>
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Question/off-topic replies come back with no files and no PR body —
          then the summary alone is the whole answer, so skip the PR card. */}
      {(files.length > 0 || Boolean(plan.prDescription?.trim())) && (
        <GithubPrView
          title={plan.title}
          body={plan.prDescription}
          files={files}
          repoFullName={repoFullName}
          baseBranch={baseBranch}
          headBranch={headBranch}
          authorName={authorName}
          prNumber={prNumber}
          prUrl={prUrl}
          draft={prDraft}
          streaming={streaming}
          actions={
            canRaise ? (
              <button
                type="button"
                onClick={onRaisePr}
                className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
              >
                <GitPullRequest className="size-3.5" />
                Raise pull request
              </button>
            ) : null
          }
        />
      )}

      {plan.notes && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">
          {plan.notes}
        </p>
      )}

      {/* Prominent CTA below the change set — the header action is easy to
          miss once the diff gets long. */}
      {canRaise && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRaisePr}
            className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
          >
            <GitPullRequest className="size-4" />
            Generate pull request
          </button>
          <span className="text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"} →{" "}
            <span className="font-mono">{headBranch}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// What the agent is doing right now, derived from how much of the structured
// plan has streamed in so far.
function streamingStatus(plan: PartialAgentPlan | null, model: string): string {
  if (!plan || Object.keys(plan).length === 0) return `Sending to ${model}… (repo context, PRD and tasks are preloaded)`;
  const files = (plan.files ?? []).filter(Boolean);
  if (plan.notes) return "Wrapping up…";
  if (plan.prDescription) return "Writing the PR description…";
  if (files.length > 0) {
    const current = files[files.length - 1];
    return current?.path ? `Writing ${current.path}…` : "Writing files…";
  }
  if ((plan.plan ?? []).length > 0) return "Planning the implementation…";
  if ((plan.questions ?? []).length > 0) return "Writing questions for you…";
  return "Thinking through the change…";
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function AgentPage() {
  const { data: session } = authClient.useSession();
  const firstName = session?.user?.name?.split(" ")[0];

  // Provider + model selection (Gemini-style picker, top-left).
  const [provider, setProvider] = useState<AgentProvider>("openai");
  const [model, setModel] = useState<string>(AGENT_PROVIDER_INFO[0]!.models[0]!);

  // Saved (encrypted) keys — hints only.
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [keysOpen, setKeysOpen] = useState(false);
  const loadKeys = async () => setKeys(await listAgentKeysAction());
  useEffect(() => {
    void loadKeys();
  }, []);
  const hasKey = keys.some((k) => k.provider === provider);

  // Default to the last-used model of the first provider that has a key.
  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current || keys.length === 0) return;
    defaultedRef.current = true;
    const withKey = AGENT_PROVIDER_INFO.find((p) => keys.some((k) => k.provider === p.id));
    if (!withKey) return;
    const saved = keys.find((k) => k.provider === withKey.id);
    setProvider(withKey.id);
    setModel(saved?.defaultModel && withKey.models.includes(saved.defaultModel) ? saved.defaultModel : withKey.models[0]!);
  }, [keys]);

  // Context: repo (required), feature + tasks (optional, drive the PRD grounding).
  const { data: repos = [] } = trpc.github.repositories.useQuery();
  const [repoId, setRepoId] = useState<string>("");
  const selectedRepo = repos.find((r) => r.id === repoId);
  useEffect(() => {
    if (!repoId && repos.length > 0) setRepoId(repos[0]!.id);
  }, [repos, repoId]);

  const { data: features = [] } = trpc.feature.list.useQuery(
    selectedRepo?.projectId ? { projectId: selectedRepo.projectId } : {},
  );
  const [featureId, setFeatureId] = useState<string>("");
  const tasksQuery = trpc.task.byFeature.useQuery(
    { featureId },
    { enabled: Boolean(featureId) },
  );
  const featureTasks = useMemo(() => {
    const g = tasksQuery.data;
    return g ? [...g.todo, ...g.in_progress, ...g.blocked, ...g.done] : [];
  }, [tasksQuery.data]);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  useEffect(() => setTaskIds([]), [featureId]);

  // The canonical branch shown on the feature's preview tab — the PR is opened
  // on exactly this branch (the server resolves/persists the slug on raise).
  const featureBranchOf = (fid?: string | null) => {
    const f = features.find((x) => x.id === fid);
    return f ? `feature/${f.branchName ?? f.id}` : undefined;
  };

  // Conversation — lives in the module-level store so it survives navigation
  // and the run keeps streaming while the user is on other pages.
  const { sessions, activeId, run } = useAgentChat();
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];
  const activeRunning = run !== null && run.sessionId === activeId;
  const runningElsewhere = run !== null && run.sessionId !== activeId;
  const livePlan = activeRunning ? run.livePlan : null;
  const liveFileCount = livePlan?.files?.length ?? 0;

  const [prompt, setPrompt] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeRunning, liveFileCount]);

  // Raise-PR dialog state.
  const [prFor, setPrFor] = useState<{
    sessionId: string;
    messageId: string;
    plan: AgentPlan;
    featureId?: string | null;
  } | null>(null);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prDraft, setPrDraft] = useState(false);
  const [raising, setRaising] = useState(false);

  function openPrDialog(
    sessionId: string,
    messageId: string,
    plan: AgentPlan,
    msgFeatureId?: string | null,
  ) {
    setPrFor({ sessionId, messageId, plan, featureId: msgFeatureId });
    setPrTitle(plan.title);
    setPrBody(plan.prDescription);
    setPrDraft(false);
  }

  const prFileStats = useMemo(() => {
    const files = prFor?.plan.files ?? [];
    return {
      count: files.length,
      added: files.reduce((n, f) => n + (f.content ? f.content.split("\n").length : 0), 0),
    };
  }, [prFor]);

  async function handleRaisePr() {
    if (!prFor || !repoId) return;
    setRaising(true);
    const res = await raiseAgentPrAction({
      repositoryId: repoId,
      title: prTitle,
      body: prBody,
      files: prFor.plan.files.map((f) => ({ path: f.path, content: f.content })),
      draft: prDraft,
      featureId: prFor.featureId ?? null,
    });
    setRaising(false);
    if (res.ok) {
      toast.success(`Pull request #${res.prNumber} opened`);
      agentChatStore.markMessagePr(prFor.sessionId, prFor.messageId, {
        prUrl: res.prUrl,
        prNumber: res.prNumber,
        prBranch: res.branch,
        prDraft,
      });
      setPrFor(null);
    } else {
      toast.error(res.error);
    }
  }

  function handleSend() {
    const text = prompt.trim();
    if (!text) return;
    if (!repoId) {
      toast.error("Connect and select a repository first.");
      return;
    }
    if (!hasKey) {
      setKeysOpen(true);
      toast.info("Add your API key for this provider first — it's stored fully encrypted.");
      return;
    }
    if (!featureId) {
      toast.info(
        "The agent codes from an approved PRD — pick a feature first. No PRD yet? Open the feature and let the AI write one from its Clarify tab.",
      );
      return;
    }

    // Compact history so multi-turn refinement works without resending files.
    // Answer/question-only turns (no change set) send their text + questions,
    // so the model can match the user's numbered choices to what it asked.
    const history = messages.map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: m.content }
        : {
            role: "assistant" as const,
            content:
              m.plan.files.length === 0
                ? [m.plan.summary, ...(m.plan.questions ?? []).map((q, i) => `${i + 1}. ${q}`)]
                    .filter(Boolean)
                    .join("\n")
                : `Proposed: ${m.plan.title}\n${m.plan.summary}\nSteps:\n${m.plan.plan
                    .map((s, i) => `${i + 1}. ${s}`)
                    .join("\n")}\nFiles: ${m.plan.files.map((f) => f.path).join(", ")}`,
          },
    );

    const started = agentChatStore.startRun(activeId, {
      repositoryId: repoId,
      provider,
      model,
      prompt: text,
      featureId: featureId || null,
      taskIds: taskIds.length > 0 ? taskIds : null,
      history,
    });
    if (started) setPrompt("");
  }

  const currentProviderInfo = AGENT_PROVIDER_INFO.find((p) => p.id === provider)!;
  const empty = messages.length === 0;

  // The page fills <main> exactly: 100dvh minus the h-14 top nav and main's py-6.
  return (
    <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-3xl flex-col">
      {/* Top bar: model picker (left) + chats & key settings (right) */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-foreground/5"
            >
              <Bot className="size-4 text-primary" />
              <span>{currentProviderInfo.shortLabel}</span>
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{model}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {AGENT_PROVIDER_INFO.map((p, idx) => {
              const saved = keys.find((k) => k.provider === p.id);
              return (
                <div key={p.id}>
                  {idx > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="flex items-center justify-between text-xs">
                    {p.label}
                    {saved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-normal text-success">
                        <ShieldCheck className="size-3" /> key saved
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setKeysOpen(true)}
                        className="text-[10px] font-normal text-primary hover:underline"
                      >
                        add key
                      </button>
                    )}
                  </DropdownMenuLabel>
                  {p.models.map((m) => (
                    <DropdownMenuItem
                      key={m}
                      onClick={() => {
                        setProvider(p.id);
                        setModel(m);
                      }}
                      className="flex items-center justify-between font-mono text-xs"
                    >
                      {m}
                      {provider === p.id && model === m && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1.5">
          {runningElsewhere && (
            <button
              type="button"
              onClick={() => agentChatStore.selectChat(run.sessionId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs text-primary transition hover:bg-primary/15"
            >
              <Loader2 className="size-3 animate-spin" />
              Generating in another chat
            </button>
          )}

          <button
            type="button"
            onClick={() => agentChatStore.newChat()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-foreground/10"
          >
            <SquarePen className="size-3.5" />
            New chat
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-foreground/10"
              >
                <History className="size-3.5" />
                History
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="no-scrollbar max-h-96 w-80 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Chat history</DropdownMenuLabel>
              {sessions.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No chats yet — start one below.
                </p>
              ) : (
                sessions.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => agentChatStore.selectChat(s.id)}
                    className={cn("group flex items-center gap-2", s.id === activeId && "bg-foreground/5")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {s.title || "Untitled chat"}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {new Date(s.updatedAt).toLocaleString()} · {s.messages.length} message
                        {s.messages.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    {run?.sessionId === s.id && <Loader2 className="size-3 shrink-0 animate-spin text-primary" />}
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        agentChatStore.deleteChat(s.id);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setKeysOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-foreground/10"
          >
            <Settings2 className="size-3.5" />
            API keys
          </button>
        </div>
      </div>

      {/* Conversation / greeting */}
      <div className="no-scrollbar flex-1 overflow-y-auto pb-4" data-lenis-prevent>
        {empty && !activeRunning ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-primary via-purple-500 to-rose-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl"
            >
              Hello{firstName ? `, ${firstName}` : ""}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-3 max-w-md text-sm leading-6 text-muted-foreground"
            >
              Pick a repository and a feature, and I&apos;ll write the code from its PRD — task by
              task — with your own {currentProviderInfo.shortLabel} model. When it&apos;s ready,
              raise the PR in one click.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              <Lock className="size-3" />
              Your API key stays AES-256 encrypted — invisible even to Reqraft developers.
            </motion.p>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <PlanMessage
                      plan={m.plan}
                      cancelled={m.cancelled}
                      prUrl={m.prUrl}
                      prNumber={m.prNumber}
                      prBranch={m.prBranch}
                      prDraft={m.prDraft}
                      repoFullName={selectedRepo?.fullName}
                      baseBranch={selectedRepo?.defaultBranch ?? "main"}
                      featureBranch={featureBranchOf(m.featureId)}
                      authorName={firstName}
                      onRaisePr={
                        activeId
                          ? () => openPrDialog(activeId, m.id, m.plan, m.featureId)
                          : undefined
                      }
                    />
                  </div>
                </div>
              ),
            )}
            {activeRunning && (
              <div className="flex gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
                  <Sparkles className="size-4 animate-pulse text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {streamingStatus(livePlan, model)}
                  </p>
                  {livePlan && Object.keys(livePlan).length > 0 && (
                    <PlanMessage
                      plan={livePlan}
                      streaming
                      repoFullName={selectedRepo?.fullName}
                      baseBranch={selectedRepo?.defaultBranch ?? "main"}
                      featureBranch={featureBranchOf(featureId)}
                      authorName={firstName}
                    />
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pb-2">
        {/* Context selectors */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <select
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            className="max-w-[220px] cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/40"
            aria-label="Repository"
          >
            {repos.length === 0 && <option value="">No repositories connected</option>}
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>

          <select
            value={featureId}
            onChange={(e) => setFeatureId(e.target.value)}
            className="max-w-[220px] cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/40"
            aria-label="Feature (PRD)"
          >
            <option value="">Select a feature (approved PRD required)</option>
            {features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>

          {featureId && featureTasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {featureTasks.map((t) => {
                const active = taskIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setTaskIds((prev) =>
                        active ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                      )
                    }
                    title={t.title}
                    className={cn(
                      "max-w-[180px] truncate rounded-full border px-2.5 py-1 text-[11px] transition",
                      active
                        ? "border-primary/40 bg-primary/15 font-medium text-primary"
                        : "border-foreground/10 bg-foreground/[0.03] text-muted-foreground hover:border-primary/25",
                    )}
                  >
                    {t.title}
                  </button>
                );
              })}
              <span className="text-[10px] text-muted-foreground">
                {taskIds.length === 0 ? "all tasks" : `${taskIds.length} selected`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 rounded-3xl border border-foreground/15 bg-card p-2.5 shadow-sm transition focus-within:border-primary/40">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={Math.min(5, Math.max(1, prompt.split("\n").length))}
            placeholder={
              featureId
                ? "Describe what to implement — the PRD and selected tasks are included automatically…"
                : "Ask the agent to build something in this repo…"
            }
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {activeRunning ? (
            <button
              type="button"
              onClick={() => agentChatStore.cancelRun()}
              aria-label="Stop generating"
              title="Stop generating — keeps what's written so far"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive text-white transition hover:opacity-90 active:scale-95"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={run !== null || !prompt.trim()}
              aria-label="Send"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-95 active:scale-95 disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Runs on your own {currentProviderInfo.shortLabel} API key · code is generated from the
          repo&apos;s AI context + the feature&apos;s approved PRD + tasks · keeps running if you
          switch tabs
        </p>
      </div>

      <KeysDialog open={keysOpen} onOpenChange={setKeysOpen} keys={keys} onChanged={loadKeys} />

      {/* Open-a-pull-request dialog — GitHub's compare page, in our theme */}
      <Dialog open={Boolean(prFor)} onOpenChange={(v) => !v && setPrFor(null)}>
        <DialogContent className="border-border bg-popover sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <GitPullRequest className="size-4 text-success" /> Open a pull request
            </DialogTitle>
            <DialogDescription>
              The change set will be committed to a new branch on{" "}
              <span className="font-mono text-xs">{selectedRepo?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Compare bar — base ← compare */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-xs text-muted-foreground">
              <GitBranch className="size-3.5 shrink-0" />
              <span>base:</span>
              <BranchChip name={selectedRepo?.defaultBranch ?? "main"} />
              <ArrowLeft className="size-3.5 shrink-0" />
              <span>compare:</span>
              <BranchChip name={featureBranchOf(prFor?.featureId) ?? previewBranch(prTitle)} />
              <span className="ml-auto inline-flex items-center gap-1 text-success">
                <Check className="size-3.5" /> Able to merge
              </span>
            </div>

            <Input
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder="Title"
              aria-label="Pull request title"
              className="font-medium"
            />

            {/* Description — GitHub's comment box, Write tab */}
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-1 border-b border-border bg-foreground/[0.03] px-2 pt-1.5">
                <span className="rounded-t-md border border-b-0 border-border bg-popover px-3 py-1.5 text-xs font-medium text-foreground">
                  Write
                </span>
                <span className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  Markdown is supported
                </span>
              </div>
              <textarea
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                rows={9}
                data-lenis-prevent
                aria-label="Pull request description"
                placeholder="Leave a comment"
                className="no-scrollbar w-full resize-y bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileDiff className="size-3.5" />
                {prFileStats.count} file{prFileStats.count === 1 ? "" : "s"} changed
                <span className="font-mono font-semibold text-success">+{prFileStats.added}</span>
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-foreground/80">
                <input
                  type="checkbox"
                  checked={prDraft}
                  onChange={(e) => setPrDraft(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Create as draft
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setPrFor(null)}
                className="rounded-lg border border-foreground/10 px-3 py-2 text-sm text-muted-foreground transition hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRaisePr}
                disabled={raising || !prTitle.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
              >
                {raising ? <Loader2 className="size-4 animate-spin" /> : <GitPullRequest className="size-4" />}
                {raising ? "Creating…" : prDraft ? "Create draft pull request" : "Create pull request"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
