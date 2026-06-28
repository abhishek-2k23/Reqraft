"use server";

import { headers } from "next/headers";
import { Octokit } from "octokit";

import { and, db, eq } from "@repo/database";
import { accountsTable, featureRequests, pullRequestsTable } from "@repo/database/schema";

import { auth } from "@/lib/auth";
import { getGithubApp } from "@/lib/github/app";
import { inngest } from "@/features/inngest/client";
import { runReviewForPullRequest, hasExistingReview } from "@/features/github/review";

export type GithubRepo = {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
};

export type RepoOverview = {
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  language: string | null;
  pushedAt: string | null;
  htmlUrl: string;
};

export type RepoCommit = {
  sha: string;
  message: string;
  authorName: string | null;
  authorLogin: string | null;
  authorAvatar: string | null;
  date: string | null;
  htmlUrl: string;
};

export type RepoContributor = {
  login: string;
  avatar: string | null;
  htmlUrl: string;
  contributions: number;
};

function splitFullName(fullName: string): [string, string] {
  const [owner = "", repo = ""] = fullName.split("/");
  return [owner, repo];
}

export type AppInstallation = {
  installationId: number;
  accountLogin: string | null;
  accountType: string | null;
  avatarUrl: string | null;
};

function mapInstallation(i: {
  id: number;
  account: { login?: string; type?: string; avatar_url?: string } | null;
}): AppInstallation {
  return {
    installationId: i.id,
    accountLogin: i.account?.login ?? null,
    accountType: i.account?.type ?? null,
    avatarUrl: i.account?.avatar_url ?? null,
  };
}

/**
 * Lists ONLY the GitHub App installations the currently signed-in user can access.
 *
 * This is scoped per-user — never list every installation of the app globally,
 * or a brand-new user would auto-detect and bind another tenant's installation
 * (cross-tenant data leak). We scope by:
 *   1. The user's GitHub OAuth token (`GET /user/installations`) when available, or
 *   2. Matching the global installation list against the user's GitHub account id.
 */
export async function listAppInstallations(): Promise<AppInstallation[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return [];

    // Look up the user's linked GitHub account (OAuth token + GitHub user id).
    const [ghAccount] = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.userId, session.user.id),
          eq(accountsTable.providerId, "github"),
        ),
      );

    // Preferred: list installations the *user* can access, via their OAuth token.
    if (ghAccount?.accessToken) {
      try {
        const userOctokit = new Octokit({ auth: ghAccount.accessToken });
        const { data } = await userOctokit.rest.apps.listInstallationsForAuthenticatedUser({
          per_page: 100,
        });
        return data.installations.map((i) =>
          mapInstallation(i as never),
        );
      } catch (err) {
        console.error("User-scoped installation lookup failed, falling back:", err);
      }
    }

    // Fallback: filter the global list down to the user's own GitHub account id.
    if (!ghAccount?.accountId) return [];
    const app = getGithubApp();
    const installations = await app.octokit.paginate(
      app.octokit.rest.apps.listInstallations,
      { per_page: 100 },
    );
    return installations
      .filter((i) => {
        const account = i.account as { id?: number } | null;
        return account?.id != null && String(account.id) === ghAccount.accountId;
      })
      .map((i) => mapInstallation(i as never));
  } catch (error) {
    console.error("Failed to list app installations:", error);
    return [];
  }
}

export async function listInstallationRepos(installationId: number): Promise<GithubRepo[]> {
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({ per_page: 100 });
    return data.repositories.map((r) => ({
      id: String(r.id),
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
      private: r.private,
      defaultBranch: r.default_branch,
    }));
  } catch {
    return [];
  }
}

export async function getRepoOverview(
  installationId: number,
  fullName: string,
): Promise<RepoOverview | null> {
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const [owner, repo] = splitFullName(fullName);
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return {
      fullName: data.full_name,
      description: data.description,
      private: data.private,
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      watchers: data.subscribers_count ?? data.watchers_count,
      language: data.language,
      pushedAt: data.pushed_at,
      htmlUrl: data.html_url,
    };
  } catch {
    return null;
  }
}

export async function listRepoCommits(
  installationId: number,
  fullName: string,
): Promise<RepoCommit[]> {
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const [owner, repo] = splitFullName(fullName);
    const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 20 });
    return data.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0] ?? c.commit.message,
      authorName: c.commit.author?.name ?? null,
      authorLogin: c.author?.login ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      date: c.commit.author?.date ?? null,
      htmlUrl: c.html_url,
    }));
  } catch {
    return [];
  }
}

export async function listRepoContributors(
  installationId: number,
  fullName: string,
): Promise<RepoContributor[]> {
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const [owner, repo] = splitFullName(fullName);
    const { data } = await octokit.rest.repos.listContributors({ owner, repo, per_page: 30 });
    return data
      .filter((c) => c.login)
      .map((c) => ({
        login: c.login as string,
        avatar: c.avatar_url ?? null,
        htmlUrl: c.html_url ?? `https://github.com/${c.login}`,
        contributions: c.contributions,
      }));
  } catch {
    return [];
  }
}

/**
 * Pull the latest PRs from GitHub and upsert them into our DB so the dashboard
 * renders instantly and review status can be joined in. Feature-branch PRs are
 * linked to their feature when it exists.
 */
export async function syncRepoPullRequests(
  installationId: number,
  fullName: string,
): Promise<{ synced: number }> {
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const [owner, repo] = splitFullName(fullName);
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
      per_page: 50,
      sort: "updated",
      direction: "desc",
    });

    for (const pr of data) {
      const branch = pr.head.ref;
      const branchFeatureId = branch.match(/^feature\/(.+)$/)?.[1];
      let featureId: string | null = null;
      if (branchFeatureId) {
        const [feature] = await db
          .select({ id: featureRequests.id })
          .from(featureRequests)
          .where(eq(featureRequests.id, branchFeatureId));
        featureId = feature?.id ?? null;
      }

      const prId = `pr_${pr.id}`;
      await db
        .insert(pullRequestsTable)
        .values({
          id: prId,
          featureId,
          installationId,
          githubPrId: pr.id,
          githubPrUrl: pr.html_url,
          number: pr.number,
          title: pr.title,
          body: pr.body ?? null,
          authorLogin: pr.user?.login ?? null,
          headBranch: branch,
          baseBranch: pr.base.ref,
          headSha: pr.head.sha,
          repoFullName: fullName,
          state: pr.merged_at ? "merged" : pr.state,
        })
        .onConflictDoUpdate({
          target: pullRequestsTable.id,
          set: {
            featureId,
            headSha: pr.head.sha,
            state: pr.merged_at ? "merged" : pr.state,
            title: pr.title,
            body: pr.body ?? null,
            updatedAt: new Date(),
          },
        });

      // Auto-trigger a review for open, feature-linked PRs that haven't been
      // reviewed yet. This makes reviews appear even when the GitHub webhook
      // never arrives (misconfigured URL, Inngest dev server offline, etc.).
      const isOpen = !pr.merged_at && pr.state === "open";
      if (featureId && isOpen && !(await hasExistingReview(prId))) {
        await inngest
          .send({
            name: "github/pull_request.review_requested",
            data: { pullRequestId: prId, repoFullName: fullName },
          })
          .catch((err) => console.error("Failed to enqueue review during sync:", err));
      }
    }

    return { synced: data.length };
  } catch (error) {
    console.error("Failed to sync pull requests:", error);
    return { synced: 0 };
  }
}

/**
 * Runs the AI review for a single PR immediately (inline), independent of the
 * GitHub webhook or Inngest. Used by the "Run review" button so a review is
 * guaranteed to run on demand.
 */
export async function triggerPrReview(
  pullRequestId: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  try {
    const review = await runReviewForPullRequest(pullRequestId);
    return { ok: true, status: review.status };
  } catch (error) {
    console.error("Failed to run PR review:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Review failed" };
  }
}

/**
 * Renames a PR's head branch on GitHub (which retargets the open PR), re-links
 * the cached PR to a feature when the new name matches `feature/{featureId}`,
 * and runs the review inline. Lets users fix a mismatched branch from the UI.
 */
export async function renamePrBranch(
  pullRequestId: string,
  newBranch: string,
): Promise<{ ok: boolean; featureId?: string | null; error?: string }> {
  try {
    const [pr] = await db
      .select()
      .from(pullRequestsTable)
      .where(eq(pullRequestsTable.id, pullRequestId));
    if (!pr) return { ok: false, error: "Pull request not found" };

    if (pr.headBranch === newBranch) {
      return { ok: false, error: "Branch already has that name" };
    }

    const app = getGithubApp();
    const [owner, repo] = splitFullName(pr.repoFullName);

    let installationId = pr.installationId;
    if (!installationId) {
      const { data: inst } = await app.octokit.rest.apps.getRepoInstallation({ owner, repo });
      installationId = inst.id;
    }
    const octokit = await app.getInstallationOctokit(installationId);

    await octokit.rest.repos.renameBranch({
      owner,
      repo,
      branch: pr.headBranch,
      new_name: newBranch,
    });

    // Re-derive the linked feature from the new branch name.
    const branchFeatureId = newBranch.match(/^feature\/(.+)$/)?.[1];
    let linkedFeatureId: string | null = null;
    if (branchFeatureId) {
      const [feature] = await db
        .select({ id: featureRequests.id })
        .from(featureRequests)
        .where(eq(featureRequests.id, branchFeatureId));
      linkedFeatureId = feature?.id ?? null;
    }

    await db
      .update(pullRequestsTable)
      .set({ headBranch: newBranch, featureId: linkedFeatureId, updatedAt: new Date() })
      .where(eq(pullRequestsTable.id, pullRequestId));

    // If the new name links to a real feature, run the review right away.
    if (linkedFeatureId) {
      await runReviewForPullRequest(pullRequestId).catch((err) =>
        console.error("Failed to run review after rename:", err),
      );
    }

    return { ok: true, featureId: linkedFeatureId };
  } catch (error) {
    console.error("Failed to rename PR branch:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to rename branch on GitHub",
    };
  }
}
