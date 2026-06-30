"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  GitPullRequestArrow,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useActiveProject } from "~/components/shipflow/project-context";
import { FADE_UP, PageHeader, STAGGER } from "~/components/shipflow/ui-kit";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

import {
  generateImplementationAction,
  getRepoContextStatusAction,
  openDraftPrAction,
  refreshRepoContextAction,
} from "~/features/copilot/server/actions";
import type { CopilotPlan } from "~/features/copilot/server/agent";

type Mode = "build" | "fix" | "improve";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "build", label: "Build", hint: "Implement a new feature from a prompt or PRD" },
  { value: "fix", label: "Fix review", hint: "Fix the latest review's open findings" },
  { value: "improve", label: "Improve", hint: "Refactor / harden existing code" },
];

type ContextStatus =
  | { indexed: true; fileCount: number; stack: string; updatedAt: string }
  | { indexed: false }
  | null;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function CopilotPage() {
  const { activeProjectId, ready, isLoading } = useActiveProject();

  const { data: repos = [] } = trpc.github.repositories.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );

  const [repoId, setRepoId] = useState<string>("");
  const [featureId, setFeatureId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("build");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<ContextStatus>(null);
  const [plan, setPlan] = useState<CopilotPlan | null>(null);

  const [indexing, startIndexing] = useTransition();
  const [generating, startGenerating] = useTransition();
  const [openingPr, startOpeningPr] = useTransition();

  // Default to the first repo once they load.
  useEffect(() => {
    if (!repoId && repos.length > 0) setRepoId(repos[0]!.id);
  }, [repos, repoId]);

  // Load index status whenever the selected repo changes.
  useEffect(() => {
    if (!repoId) return;
    setStatus(null);
    getRepoContextStatusAction(repoId).then(setStatus);
  }, [repoId]);

  function indexRepo() {
    if (!repoId) return;
    startIndexing(async () => {
      const result = await refreshRepoContextAction(repoId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Indexed ${result.fileCount} files.`);
      setStatus(await getRepoContextStatusAction(repoId));
    });
  }

  function generate() {
    if (!repoId) {
      toast.error("Select a repository.");
      return;
    }
    setPlan(null);
    startGenerating(async () => {
      const result = await generateImplementationAction({
        repositoryId: repoId,
        prompt,
        mode,
        featureId: featureId || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPlan(result.plan);
    });
  }

  function openPr() {
    if (!plan || !repoId) return;
    startOpeningPr(async () => {
      const result = await openDraftPrAction({
        repositoryId: repoId,
        title: plan.title,
        body: `${plan.plan.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n${plan.notes}`,
        files: plan.files.map((f) => ({ path: f.path, content: f.content })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Opened draft PR #${result.prNumber}`);
      window.open(result.prUrl, "_blank");
    });
  }

  const indexed = status?.indexed === true;

  return (
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-6">
      <motion.div variants={FADE_UP}>
        <PageHeader
          title="Copilot"
          description="Describe a change and Reqraft drafts it against your connected repo — using full repo context and the linked PRD."
        />
      </motion.div>

      {repos.length === 0 ? (
        <motion.div variants={FADE_UP} className="border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a repository on the GitHub page first.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Controls */}
          <motion.div variants={FADE_UP} className="space-y-4 border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Repository
                </span>
                <select
                  value={repoId}
                  onChange={(e) => setRepoId(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                >
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Feature / PRD (optional)
                </span>
                <select
                  value={featureId}
                  onChange={(e) => setFeatureId(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                >
                  <option value="">None — freeform</option>
                  {features.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Index status */}
            <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {status === null ? (
                  "Checking index…"
                ) : indexed && status.indexed ? (
                  <>
                    Indexed · <span className="text-foreground">{status.fileCount} files</span> ·{" "}
                    {status.stack}
                  </>
                ) : (
                  "Not indexed yet — build context so Copilot understands this repo."
                )}
              </p>
              <button
                type="button"
                onClick={indexRepo}
                disabled={indexing}
                className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {indexing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                {indexed ? "Re-index" : "Index repo"}
              </button>
            </div>

            {/* Mode */}
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  title={m.hint}
                  className={cn(
                    "border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                    mode === m.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={
                mode === "fix"
                  ? "Optionally add guidance — Copilot will use the linked feature's open review findings."
                  : "e.g. Add a rate-limit guard to the PRD generation endpoint (5/min per org)."
              }
              className="w-full resize-y border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={generate}
                disabled={generating || !indexed}
                className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate
              </button>
            </div>
            {!indexed && status !== null ? (
              <p className="text-right text-[11px] text-amber-400">
                Index the repo to enable generation.
              </p>
            ) : null}
          </motion.div>

          {/* Result */}
          {plan ? (
            <motion.div variants={FADE_UP} className="space-y-5 border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">{plan.title}</h2>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {plan.files.length} file{plan.files.length === 1 ? "" : "s"} proposed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openPr}
                  disabled={openingPr || plan.files.length === 0}
                  className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 disabled:opacity-50"
                >
                  {openingPr ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <GitPullRequestArrow className="size-3.5" />
                  )}
                  Open draft PR
                </button>
              </div>

              {/* Plan steps */}
              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Plan
                </h3>
                <ol className="space-y-1.5">
                  {plan.plan.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <span className="font-mono text-xs text-primary">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              {/* Files */}
              <section className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Proposed changes
                </h3>
                {plan.files.map((file) => (
                  <div key={file.path} className="border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/50 px-3 py-2">
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "mr-2 font-mono text-[10px] uppercase tracking-wider",
                            file.action === "create" ? "text-success" : "text-amber-400",
                          )}
                        >
                          {file.action}
                        </span>
                        <span className="font-mono text-xs text-foreground">{file.path}</span>
                      </div>
                      <CopyButton text={file.content} />
                    </div>
                    {file.rationale ? (
                      <p className="px-3 pt-2 text-xs text-muted-foreground">{file.rationale}</p>
                    ) : null}
                    <pre className="max-h-80 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/90">
                      {file.content}
                    </pre>
                  </div>
                ))}
              </section>

              {plan.notes ? (
                <section className="border-l-2 border-amber-400/40 bg-amber-400/[0.05] px-3 py-2">
                  <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                    Notes
                  </h3>
                  <p className="whitespace-pre-line text-xs text-foreground/80">{plan.notes}</p>
                </section>
              ) : null}
            </motion.div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}
