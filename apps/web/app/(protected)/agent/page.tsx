"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Check,
  ChevronDown,
  ExternalLink,
  FileCode2,
  FilePlus2,
  GitPullRequest,
  KeyRound,
  Loader2,
  Lock,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
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
import { AGENT_PROVIDER_INFO, type ProviderInfo } from "@/features/agent/providers";
import {
  deleteAgentKeyAction,
  listAgentKeysAction,
  raiseAgentPrAction,
  runAgentAction,
  saveAgentKeyAction,
} from "@/features/agent/server/actions";
import type { AgentPlan } from "@/features/agent/server/engine";
import type { AgentProvider } from "@repo/database/schema";

type SavedKey = {
  provider: string;
  keyHint: string | null;
  defaultModel: string | null;
  updatedAt: string;
};

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; plan: AgentPlan; prUrl?: string; prNumber?: number };

const uid = () => Math.random().toString(36).slice(2);

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

function FileCard({ file }: { file: AgentPlan["files"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-foreground/[0.03]"
      >
        {file.action === "create" ? (
          <FilePlus2 className="size-4 shrink-0 text-success" />
        ) : (
          <FileCode2 className="size-4 shrink-0 text-primary" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs font-medium text-foreground">{file.path}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{file.rationale}</span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            file.action === "create" ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
          )}
        >
          {file.action}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <pre className="max-h-80 overflow-auto border-t border-foreground/10 bg-foreground/[0.03] p-3.5 text-[11px] leading-5 text-foreground/85" data-lenis-prevent>
          <code>{file.content}</code>
        </pre>
      )}
    </div>
  );
}

function PlanMessage({
  plan,
  prUrl,
  prNumber,
  onRaisePr,
}: {
  plan: AgentPlan;
  prUrl?: string;
  prNumber?: number;
  onRaisePr: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-foreground/90">{plan.summary}</p>

      {plan.plan.length > 0 && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</p>
          <ol className="space-y-1.5">
            {plan.plan.map((step, i) => (
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

      {plan.files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Files ({plan.files.length})
          </p>
          {plan.files.map((f) => (
            <FileCard key={f.path} file={f} />
          ))}
        </div>
      )}

      {plan.notes && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">
          {plan.notes}
        </p>
      )}

      {prUrl ? (
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-4 py-2.5 text-sm font-medium text-success transition hover:bg-success/20"
        >
          <GitPullRequest className="size-4" />
          Pull request #{prNumber} opened
          <ExternalLink className="size-3.5" />
        </a>
      ) : plan.files.length > 0 ? (
        <button
          type="button"
          onClick={onRaisePr}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 active:scale-[0.98]"
        >
          <GitPullRequest className="size-4" />
          Raise pull request
        </button>
      ) : null}
    </div>
  );
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

  // Conversation.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, running]);

  // Raise-PR dialog state.
  const [prFor, setPrFor] = useState<{ messageId: string; plan: AgentPlan } | null>(null);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prDraft, setPrDraft] = useState(false);
  const [raising, setRaising] = useState(false);

  function openPrDialog(messageId: string, plan: AgentPlan) {
    setPrFor({ messageId, plan });
    setPrTitle(plan.title);
    setPrBody(plan.prDescription);
    setPrDraft(false);
  }

  async function handleRaisePr() {
    if (!prFor || !repoId) return;
    setRaising(true);
    const res = await raiseAgentPrAction({
      repositoryId: repoId,
      title: prTitle,
      body: prBody,
      files: prFor.plan.files.map((f) => ({ path: f.path, content: f.content })),
      draft: prDraft,
    });
    setRaising(false);
    if (res.ok) {
      toast.success(`Pull request #${res.prNumber} opened`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === prFor.messageId && m.role === "assistant"
            ? { ...m, prUrl: res.prUrl, prNumber: res.prNumber }
            : m,
        ),
      );
      setPrFor(null);
    } else {
      toast.error(res.error);
    }
  }

  async function handleSend() {
    const text = prompt.trim();
    if (!text || running) return;
    if (!repoId) {
      toast.error("Connect and select a repository first.");
      return;
    }
    if (!hasKey) {
      setKeysOpen(true);
      toast.info("Add your API key for this provider first — it's stored fully encrypted.");
      return;
    }

    // Compact history so multi-turn refinement works without resending files.
    const history = messages.map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: m.content }
        : {
            role: "assistant" as const,
            content: `Proposed: ${m.plan.title}\n${m.plan.summary}\nSteps:\n${m.plan.plan
              .map((s, i) => `${i + 1}. ${s}`)
              .join("\n")}\nFiles: ${m.plan.files.map((f) => f.path).join(", ")}`,
          },
    );

    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    setPrompt("");
    setRunning(true);
    const res = await runAgentAction({
      repositoryId: repoId,
      provider,
      model,
      prompt: text,
      featureId: featureId || null,
      taskIds: taskIds.length > 0 ? taskIds : null,
      history,
    });
    setRunning(false);
    if (res.ok) {
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", plan: res.plan }]);
    } else {
      toast.error(res.error);
    }
  }

  const currentProviderInfo = AGENT_PROVIDER_INFO.find((p) => p.id === provider)!;
  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-3xl flex-col">
      {/* Top bar: model picker (left) + key settings (right) — Gemini-style */}
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

        <button
          type="button"
          onClick={() => setKeysOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-foreground/10"
        >
          <Settings2 className="size-3.5" />
          API keys
        </button>
      </div>

      {/* Conversation / greeting */}
      <div className="flex-1 overflow-y-auto pb-4" data-lenis-prevent>
        {empty ? (
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
                      prUrl={m.prUrl}
                      prNumber={m.prNumber}
                      onRaisePr={() => openPrDialog(m.id, m.plan)}
                    />
                  </div>
                </div>
              ),
            )}
            {running && (
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
                  <Sparkles className="size-4 animate-pulse text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Coding with <span className="font-mono text-xs">{model}</span> — reading the repo
                  context, PRD and tasks…
                </p>
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
            <option value="">No feature — freeform</option>
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
                void handleSend();
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
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={running || !prompt.trim()}
            aria-label="Send"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-95 active:scale-95 disabled:opacity-40"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Runs on your own {currentProviderInfo.shortLabel} API key · code is generated from the
          repo&apos;s AI context{featureId ? " + PRD + tasks" : ""}
        </p>
      </div>

      <KeysDialog open={keysOpen} onOpenChange={setKeysOpen} keys={keys} onChanged={loadKeys} />

      {/* Raise PR dialog */}
      <Dialog open={Boolean(prFor)} onOpenChange={(v) => !v && setPrFor(null)}>
        <DialogContent className="border-border bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <GitPullRequest className="size-4 text-primary" /> Raise pull request
            </DialogTitle>
            <DialogDescription>
              Review the AI-suggested title and description, then open the PR on{" "}
              <span className="font-mono text-xs">{selectedRepo?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-foreground/80">Title</label>
              <Input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-foreground/80">Description</label>
              <textarea
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                rows={8}
                data-lenis-prevent
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none focus:border-primary/40"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-foreground/80">
              <input
                type="checkbox"
                checked={prDraft}
                onChange={(e) => setPrDraft(e.target.checked)}
                className="size-3.5 accent-[var(--primary)]"
              />
              Open as draft
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrFor(null)}
                className="rounded-lg border border-foreground/10 px-3 py-2 text-sm text-muted-foreground transition hover:bg-foreground/5"
              >
                Cancel
              </button>
              <Button onClick={handleRaisePr} disabled={raising || !prTitle.trim()}>
                {raising ? <Loader2 className="size-4 animate-spin" /> : <GitPullRequest className="size-4" />}
                {raising ? "Opening PR…" : `Open PR (${prFor?.plan.files.length ?? 0} files)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
