"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  CheckCircle2, ChevronRight, ExternalLink, GitBranch, Github,
  Loader2, Lock, Globe, ShieldCheck, Link2, Settings, Unlink2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "~/components/shipflow/ui-kit";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useActiveProject } from "~/components/shipflow/project-context";
import { GithubRepoDashboard, type ConnectedRepo } from "~/components/shipflow/github-repo-dashboard";
import { trpc } from "~/trpc/client";
import {
  listAppInstallations,
  listInstallationRepos,
  type AppInstallation,
  type GithubRepo,
} from "@/features/github/actions";

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function getInstallUrl() {
  const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
  return appName
    ? `https://github.com/apps/${appName}/installations/new`
    : "https://github.com/settings/apps/new";
}

function RepoRow({
  repo,
  projectId,
  installationId,
  onConnected,
}: {
  repo: GithubRepo;
  projectId: string | null;
  installationId: number;
  onConnected: (repo: ConnectedRepo) => void;
}) {
  const connectRepo = trpc.github.connectRepo.useMutation({
    onSuccess: () => {
      toast.success(`${repo.name} connected`);
      onConnected({
        fullName: repo.fullName,
        name: repo.name,
        installationId,
        defaultBranch: repo.defaultBranch,
        projectId,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="text-slate-400">
        {repo.private ? <Lock className="size-4" /> : <Globe className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">{repo.fullName}</p>
        <p className="text-xs text-slate-500">default: {repo.defaultBranch}</p>
      </div>
      <Button
        size="sm"
        disabled={!projectId || connectRepo.isPending}
        onClick={() =>
          connectRepo.mutate({
            projectId: projectId as string,
            fullName: repo.fullName,
            githubRepoId: repo.id,
            installationId,
          })
        }
        className="shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-40"
      >
        {connectRepo.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
        Connect
      </Button>
    </div>
  );
}

function ConnectedRepoRow({
  repo,
  isDeletedOnGithub,
  onSelect,
}: {
  repo: { id: string; fullName: string; name: string; defaultBranch: string | null; installationId: number | null };
  isDeletedOnGithub: boolean;
  onSelect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const utils = trpc.useUtils();

  const disconnect = trpc.github.disconnectRepo.useMutation({
    onSuccess: () => {
      toast.success(`${repo.name} disconnected`);
      void utils.github.repositories.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className={cn("flex w-full items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.03]", !isDeletedOnGithub && "cursor-pointer")}>
      <CheckCircle2 className={cn("size-4 shrink-0", isDeletedOnGithub ? "text-red-400/60" : "text-emerald-400")} />

      {isDeletedOnGithub ? (
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-medium text-white/40 line-through decoration-white">
            {repo.fullName}
          </p>
          <p className="text-xs text-red-400/70">Deleted from GitHub account</p>
        </div>
      ) : (
        <button type="button" onClick={onSelect} className="flex-1 min-w-0 cursor-pointer text-left">
          <p className="truncate text-sm font-medium text-white">{repo.fullName}</p>
          <p className="text-xs text-slate-500">branch: {repo.defaultBranch ?? "main"}</p>
        </button>
      )}

      {!isDeletedOnGithub && !confirming && (
        <span className="pointer-events-none inline-flex shrink-0 items-center gap-1 text-xs text-cyan-300">
          View dashboard <ChevronRight className="size-3.5" />
        </span>
      )}

      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-400">Disconnect?</span>
          <button
            type="button"
            onClick={() => disconnect.mutate({ repoId: repo.id })}
            disabled={disconnect.isPending}
            className="inline-flex items-center gap-1 rounded border border-red-400/20 bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 transition hover:bg-red-400/20 disabled:opacity-50"
          >
            {disconnect.isPending && <Loader2 className="size-3 animate-spin" />}
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded border border-white/10 px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/5 hover:text-red-400"
        >
          <Unlink2 className="size-3.5" />
          {isDeletedOnGithub ? "Remove" : "Disconnect"}
        </button>
      )}
    </div>
  );
}

export default function GithubPage() {
  const searchParams = useSearchParams();
  const urlInstallationId = searchParams.get("installationId");

  const { activeProjectId, activeProject } = useActiveProject();
  const utils = trpc.useUtils();
  const { data: installStatus = { installed: false, installation: null }, refetch } =
    trpc.github.getInstallationStatus.useQuery();
  const { data: connectedRepos = [] } = trpc.github.repositories.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: Boolean(activeProjectId) },
  );

  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposLoaded, setReposLoaded] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<ConnectedRepo | null>(null);
  const [detectedInstalls, setDetectedInstalls] = useState<AppInstallation[]>([]);
  const [detecting, setDetecting] = useState(false);

  const saveInstallation = trpc.github.saveInstallation.useMutation({
    onSuccess: () => {
      toast.success("GitHub installation connected");
      refetch();
      utils.github.repositories.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // When GitHub redirects back with ?installationId=..., save it immediately
  useEffect(() => {
    if (urlInstallationId && !installStatus.installed) {
      saveInstallation.mutate({ installationId: Number(urlInstallationId) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInstallationId]);

  // Fallback: if GitHub didn't redirect back, auto-detect an existing installation.
  async function detectInstallations(auto = false) {
    setDetecting(true);
    const installs = await listAppInstallations();
    setDetectedInstalls(installs);
    setDetecting(false);
    // If exactly one installation exists, connect it automatically.
    if (auto && installs.length === 1) {
      const only = installs[0]!;
      saveInstallation.mutate({
        installationId: only.installationId,
        accountLogin: only.accountLogin ?? undefined,
        accountType: only.accountType ?? undefined,
      });
    }
  }

  useEffect(() => {
    if (!installStatus.installed && !urlInstallationId && detectedInstalls.length === 0) {
      void detectInstallations(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installStatus.installed, urlInstallationId]);

  // Load the installation's accessible repos from the GitHub API
  async function loadGithubRepos(id: number) {
    setLoadingRepos(true);
    const repos = await listInstallationRepos(id);
    setGithubRepos(repos);
    setLoadingRepos(false);
    setReposLoaded(true);
  }

  // Once installed, fetch repos from GitHub API
  useEffect(() => {
    const id = installStatus.installation?.installationId;
    if (!id) return;
    void loadGithubRepos(id);
  }, [installStatus.installation?.installationId]);

  // Listen for the popup's "installed" message (BroadcastChannel + postMessage),
  // verify origin + CSRF state, then save the installation in this first-party
  // window (where the session cookie lives).
  useEffect(() => {
    function handlePayload(data: { installationId?: string | null; state?: string | null }) {
      if (!data?.installationId) return;
      const expected = sessionStorage.getItem("gh_oauth_state");
      // If a state was round-tripped, it must match; missing state is tolerated.
      if (data.state && expected && data.state !== expected) return;
      sessionStorage.removeItem("gh_oauth_state");
      saveInstallation.mutate({ installationId: Number(data.installationId) });
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "shipflow:github-installed") handlePayload(event.data);
    }

    window.addEventListener("message", onMessage);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("shipflow-github");
      bc.onmessage = (event) => {
        if (event.data?.type === "shipflow:github-installed") handlePayload(event.data);
      };
    } catch {
      /* BroadcastChannel unsupported — postMessage still covers it */
    }

    return () => {
      window.removeEventListener("message", onMessage);
      bc?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open GitHub's install/configure screen in a centered popup. On close we
  // refresh installation + repo state so the UI reflects any changes.
  function openGithubPopup(baseUrl: string) {
    const state = crypto.randomUUID();
    sessionStorage.setItem("gh_oauth_state", state);
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}state=${state}`;

    const w = 1020;
    const h = 820;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(
      url,
      "shipflow-github",
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    );

    if (!popup) {
      toast.error("Popup blocked — allow popups for this site and try again.");
      return;
    }
    popup.focus();

    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        refetch();
        utils.github.repositories.invalidate();
        const id = installStatus.installation?.installationId;
        if (id) void loadGithubRepos(id);
      }
    }, 700);
  }

  const connectedFullNames = new Set(connectedRepos.map((r) => r.fullName));
  const unconnectedRepos = githubRepos.filter((r) => !connectedFullNames.has(r.fullName));
  const githubFullNames = new Set(githubRepos.map((r) => r.fullName));

  // If a repo is selected, show its detailed dashboard.
  if (selectedRepo) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={selectedRepo.name}
          description={activeProject ? `Repository in ${activeProject.name}.` : "Connected repository."}
        />
        <GithubRepoDashboard repo={selectedRepo} onBack={() => setSelectedRepo(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub Integration"
        description="Connect repositories to enable AI code review and track PRs, commits, and contributors."
      />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        {/* Connection status card */}
        <motion.div variants={FADE_UP} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl group-hover:bg-orange-500/20 transition-all" />

          <div className="mb-8 flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-white/5 text-zinc-400 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
              <Github className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">GitHub App</h2>
              <p className="text-sm text-zinc-500">Repository access</p>
            </div>
          </div>

          {saveInstallation.isPending ? (
            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <Loader2 className="size-5 animate-spin text-cyan-400" />
              <p className="text-sm font-medium text-cyan-400">Saving installation…</p>
            </div>
          ) : installStatus.installed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <ShieldCheck className="size-5 text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-400">Connected</p>
                  {installStatus.installation?.accountLogin && (
                    <p className="text-xs text-emerald-300/70">@{installStatus.installation.accountLogin}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openGithubPopup(getInstallUrl())}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
              >
                <Settings className="size-3.5" />
                Manage repositories
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-zinc-400">
                Install the Reqraft GitHub App to automatically sync pull requests, trigger AI code reviews, and post status checks directly to your repositories.
              </p>
              <button
                type="button"
                onClick={() => openGithubPopup(getInstallUrl())}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all hover:scale-[1.02] hover:bg-orange-400 active:scale-[0.98]"
              >
                Install / Connect GitHub App
                <ExternalLink className="size-4" />
              </button>
              <a
                href={getInstallUrl()}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
              >
                Popup blocked? Open in a new tab instead
              </a>

              {/* Fallback: already installed but GitHub didn't redirect back */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-medium text-slate-300">Already installed the app?</p>
                <p className="mt-1 text-xs text-slate-500">
                  If GitHub didn&apos;t bring you back automatically, detect your existing installation here.
                </p>

                {detecting ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="size-3.5 animate-spin" /> Looking for installations…
                  </div>
                ) : detectedInstalls.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {detectedInstalls.map((inst) => (
                      <div key={inst.installationId} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        {inst.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={inst.avatarUrl} alt={inst.accountLogin ?? ""} className="size-6 rounded-full" />
                        ) : (
                          <Github className="size-5 text-slate-400" />
                        )}
                        <span className="flex-1 truncate text-sm text-white">
                          {inst.accountLogin ?? `Installation ${inst.installationId}`}
                        </span>
                        <Button
                          size="sm"
                          disabled={saveInstallation.isPending}
                          onClick={() =>
                            saveInstallation.mutate({
                              installationId: inst.installationId,
                              accountLogin: inst.accountLogin ?? undefined,
                              accountType: inst.accountType ?? undefined,
                            })
                          }
                          className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                        >
                          {saveInstallation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => detectInstallations(false)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    <Github className="size-3.5" />
                    Detect installation
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div variants={FADE_UP} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <GitBranch className="size-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-white">How it works</h2>
          </div>
          <div className="relative border-l border-white/10 pl-6 space-y-8">
            {[
              { title: "Install the GitHub App", desc: "Grant access to your selected repositories." },
              { title: "Connect a repo to this project", desc: `Repos connect to ${activeProject?.name ?? "the active project"}.` },
              { title: "Create a feature branch", desc: "Use the format feature/{featureId} for automatic tracking." },
              { title: "Open a pull request", desc: "Reqraft detects the new PR and caches it here." },
              { title: "Automated AI Review", desc: "Code is reviewed against the PRD and shown in the Review tab." },
            ].map((step, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-[37px] grid size-7 place-items-center rounded-full border border-orange-500/30 bg-zinc-950 font-mono text-[11px] font-bold text-orange-400">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-zinc-200">{step.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Repo connection section — only shown when GitHub is connected */}
      {installStatus.installed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 max-w-5xl space-y-6"
        >
          {!activeProjectId && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Select or create a project (top bar) to connect repositories.
            </p>
          )}

          {/* Connected repos — clickable into the dashboard */}
          {connectedRepos.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Connected repositories ({connectedRepos.length})
              </h2>
              <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
                {connectedRepos.map((r) => (
                  <ConnectedRepoRow
                    key={r.id}
                    repo={r}
                    isDeletedOnGithub={reposLoaded && !githubFullNames.has(r.fullName)}
                    onSelect={() =>
                      setSelectedRepo({
                        fullName: r.fullName,
                        name: r.name,
                        installationId: r.installationId,
                        defaultBranch: r.defaultBranch,
                        projectId: r.projectId,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available repos to connect */}
          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-white">
                {loadingRepos ? "Loading repositories…" : `Available repositories (${unconnectedRepos.length})`}
              </h2>
              {activeProject && (
                <span className="text-xs text-slate-400">
                  Connecting to <span className="font-medium text-cyan-300">{activeProject.name}</span>
                </span>
              )}
            </div>

            {loadingRepos ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
                ))}
              </div>
            ) : unconnectedRepos.length === 0 ? (
              <div className="rounded-xl border border-white/10 py-12 text-center text-sm text-slate-500">
                All accessible repositories are already connected.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10 divide-y divide-white/5">
                {unconnectedRepos.map((repo) => (
                  <RepoRow
                    key={repo.id}
                    repo={repo}
                    projectId={activeProjectId}
                    installationId={installStatus.installation!.installationId}
                    onConnected={(connected) => {
                      utils.github.repositories.invalidate();
                      setSelectedRepo(connected);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
