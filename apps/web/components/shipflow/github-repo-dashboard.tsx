"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Star,
  GitFork,
  CircleDot,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";
import {
  getRepoOverview,
  listRepoCommits,
  listRepoContributors,
  syncRepoPullRequests,
  triggerPrReview,
  renamePrBranch,
  type RepoCommit,
  type RepoContributor,
  type RepoOverview,
} from "@/features/github/actions";

export type ConnectedRepo = {
  fullName: string;
  name: string;
  installationId: number | null;
  defaultBranch: string | null;
  projectId?: string | null;
};

function timeAgo(value: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN");
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-zinc-400">{icon}</div>
      <div>
        <p className="text-lg font-semibold text-white">{value}</p>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function ReviewBadge({ review }: { review: { status: string; overallVerdict: string | null; prdComplianceScore: number | null } | null }) {
  if (!review) {
    return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-500">No review</span>;
  }
  if (review.status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
        <Loader2 className="size-3 animate-spin" /> Reviewing
      </span>
    );
  }
  if (review.overallVerdict === "approve") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
        <CheckCircle2 className="size-3" /> Approved{review.prdComplianceScore != null ? ` · ${review.prdComplianceScore}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[11px] font-medium text-red-300">
      <XCircle className="size-3" /> Changes{review.prdComplianceScore != null ? ` · ${review.prdComplianceScore}` : ""}
    </span>
  );
}

function PrStateBadge({ state }: { state: string }) {
  if (state === "merged") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-300"><GitMerge className="size-3" />Merged</span>;
  }
  if (state === "closed") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300"><GitPullRequestClosed className="size-3" />Closed</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"><GitPullRequest className="size-3" />Open</span>;
}

function Shimmer() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
      ))}
    </div>
  );
}

type Pr = {
  id: string;
  number: number;
  title: string;
  url: string;
  authorLogin: string | null;
  headBranch: string;
  baseBranch: string;
  state: string;
  featureId: string | null;
  updatedAt: string | Date | null;
  review: { status: string; overallVerdict: string | null; prdComplianceScore: number | null } | null;
};

function PrRow({
  pr,
  features,
  onChanged,
}: {
  pr: Pr;
  features: Array<{ id: string; title: string }>;
  onChanged: () => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renamePending, setRenamePending] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>(features[0]?.id ?? "");

  // Features load asynchronously — default the picker once they arrive.
  useEffect(() => {
    if (!selectedFeatureId && features.length > 0) {
      setSelectedFeatureId(features[0]!.id);
    }
  }, [features, selectedFeatureId]);

  const isOpen = pr.state === "open";

  async function handleRunReview() {
    setReviewing(true);
    const res = await triggerPrReview(pr.id);
    setReviewing(false);
    if (res.ok) {
      toast.success(res.status === "passed" ? "Review complete — approved" : "Review complete — changes requested");
      onChanged();
    } else {
      toast.error(res.error ?? "Review failed");
    }
  }

  async function handleRename() {
    if (!selectedFeatureId) {
      toast.error("Pick a feature first");
      return;
    }
    const newBranch = `feature/${selectedFeatureId}`;
    setRenamePending(true);
    const res = await renamePrBranch(pr.id, newBranch);
    setRenamePending(false);
    if (res.ok) {
      toast.success(res.featureId ? "Branch renamed — review started" : "Branch renamed");
      setRenaming(false);
      onChanged();
    } else {
      toast.error(res.error ?? "Rename failed");
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a href={pr.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-white hover:text-cyan-300">
              #{pr.number} {pr.title}
            </a>
            <PrStateBadge state={pr.state} />
            {!pr.featureId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                Not linked
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {pr.authorLogin && <span>@{pr.authorLogin}</span>}
            <span className="inline-flex items-center gap-1 font-mono">
              <GitBranch className="size-3" />
              {pr.headBranch} → {pr.baseBranch}
            </span>
            <span>· {timeAgo(pr.updatedAt)}</span>
          </p>
        </div>
        <ReviewBadge review={pr.review} />
        {pr.featureId && (
          <Link
            href={`/features/${pr.featureId}?tab=review-history`}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 transition hover:bg-cyan-300/20"
          >
            View review
          </Link>
        )}
      </div>

      {/* Actions */}
      {isOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunReview}
            disabled={reviewing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-300/20 disabled:opacity-50"
          >
            {reviewing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {pr.review ? "Re-run review" : "Run review"}
          </button>
          <button
            type="button"
            onClick={() => setRenaming((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
          >
            <Pencil className="size-3.5" />
            Rename branch
          </button>
        </div>
      )}

      {renaming && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs text-slate-400">
            Rename the branch to match a feature. This renames the branch on GitHub, retargets this PR, and starts an AI review.
          </p>
          {features.length === 0 ? (
            <p className="text-xs text-amber-300">No features available in this organization yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedFeatureId}
                onChange={(e) => setSelectedFeatureId(e.target.value)}
                className="max-w-[260px] flex-1 cursor-pointer rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-300/40"
              >
                {features.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
              <span className="break-all font-mono text-[11px] text-slate-500">→ feature/{selectedFeatureId}</span>
              <button
                type="button"
                onClick={handleRename}
                disabled={renamePending}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-cyan-300 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
              >
                {renamePending && <Loader2 className="size-3.5 animate-spin" />}
                Rename & review
              </button>
              <button
                type="button"
                onClick={() => setRenaming(false)}
                className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GithubRepoDashboard({ repo, onBack }: { repo: ConnectedRepo; onBack: () => void }) {
  const utils = trpc.useUtils();
  const [overview, setOverview] = useState<RepoOverview | null>(null);
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [contributors, setContributors] = useState<RepoContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const prsQuery = trpc.github.pullRequestsByRepo.useQuery({ repoFullName: repo.fullName });
  const prs = prsQuery.data ?? [];

  // Features for the branch-rename picker (scoped to the repo's project when known).
  const featuresQuery = trpc.feature.list.useQuery(
    repo.projectId ? { projectId: repo.projectId } : {},
  );
  const features = (featuresQuery.data ?? []).map((f) => ({ id: f.id, title: f.title }));

  const refreshPrs = () => utils.github.pullRequestsByRepo.invalidate({ repoFullName: repo.fullName });

  async function load(showToast = false) {
    if (!repo.installationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [ov, co, cn] = await Promise.all([
      getRepoOverview(repo.installationId, repo.fullName),
      listRepoCommits(repo.installationId, repo.fullName),
      listRepoContributors(repo.installationId, repo.fullName),
      syncRepoPullRequests(repo.installationId, repo.fullName),
    ]);
    setOverview(ov);
    setCommits(co);
    setContributors(cn);
    await utils.github.pullRequestsByRepo.invalidate({ repoFullName: repo.fullName });
    setLoading(false);
    if (showToast) toast.success("Repository synced");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.fullName, repo.installationId]);

  async function handleSync() {
    setSyncing(true);
    await load(true);
    setSyncing(false);
  }

  return (
    <div className="mt-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">{repo.fullName}</h2>
            <p className="text-xs text-slate-500">
              {overview?.private ? "Private" : "Public"} · default {overview?.defaultBranch ?? repo.defaultBranch ?? "main"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            Sync
          </button>
          {overview && (
            <a
              href={overview.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
            >
              <ExternalLink className="size-3.5" />
              Open on GitHub
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="gap-5">
        <TabsList className="h-auto flex-wrap justify-start rounded-lg border border-white/10 bg-white/[0.045] p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">Overview</TabsTrigger>
          <TabsTrigger value="prs" className="data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">Pull Requests ({prs.length})</TabsTrigger>
          <TabsTrigger value="commits" className="data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">Commits</TabsTrigger>
          <TabsTrigger value="contributors" className="data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">Contributors</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          {loading ? (
            <Shimmer />
          ) : !overview ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
              Couldn&apos;t load repository details. Try syncing.
            </p>
          ) : (
            <div className="space-y-5">
              {overview.description && <p className="text-sm leading-6 text-slate-300">{overview.description}</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatPill icon={<Star className="size-5" />} label="Stars" value={overview.stars} />
                <StatPill icon={<GitFork className="size-5" />} label="Forks" value={overview.forks} />
                <StatPill icon={<CircleDot className="size-5" />} label="Open issues" value={overview.openIssues} />
                <StatPill icon={<Eye className="size-5" />} label="Watchers" value={overview.watchers} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-slate-500">Language</p>
                  <p className="mt-1 text-sm font-medium text-white">{overview.language ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-slate-500">Default branch</p>
                  <p className="mt-1 font-mono text-sm font-medium text-white">{overview.defaultBranch}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-slate-500">Last push</p>
                  <p className="mt-1 text-sm font-medium text-white">{timeAgo(overview.pushedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Pull Requests */}
        <TabsContent value="prs">
          {prsQuery.isLoading || loading ? (
            <Shimmer />
          ) : prs.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
              No pull requests yet. Open a PR (use a <span className="font-mono text-slate-400">feature/&#123;id&#125;</span> branch to trigger AI review).
            </p>
          ) : (
            <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
              {prs.map((pr) => (
                <PrRow key={pr.id} pr={pr} features={features} onChanged={refreshPrs} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Commits */}
        <TabsContent value="commits">
          {loading ? (
            <Shimmer />
          ) : commits.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">No commits found.</p>
          ) : (
            <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
              {commits.map((c) => (
                <div key={c.sha} className="flex items-center gap-3 px-5 py-3.5">
                  <GitCommitHorizontal className="size-4 shrink-0 text-slate-500" />
                  {c.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.authorAvatar} alt={c.authorLogin ?? ""} className="size-6 shrink-0 rounded-full" />
                  ) : (
                    <div className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] text-slate-300">
                      {(c.authorName ?? "?")[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <a href={c.htmlUrl} target="_blank" rel="noreferrer" className="block truncate text-sm text-slate-200 hover:text-cyan-300">
                      {c.message}
                    </a>
                    <p className="text-xs text-slate-500">
                      {c.authorLogin ?? c.authorName ?? "unknown"} · {timeAgo(c.date)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-slate-600">{c.sha.slice(0, 7)}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contributors */}
        <TabsContent value="contributors">
          {loading ? (
            <Shimmer />
          ) : contributors.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
              <Users className="mx-auto mb-2 size-5 text-slate-600" />
              No contributors found.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contributors.map((c) => (
                <a
                  key={c.login}
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                >
                  {c.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar} alt={c.login} className="size-9 rounded-full" />
                  ) : (
                    <div className="grid size-9 place-items-center rounded-full bg-white/10 text-sm text-slate-300">{c.login[0]}</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{c.login}</p>
                    <p className="text-xs text-slate-500">{c.contributions} commits</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
