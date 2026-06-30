import { and, db, desc, eq } from "@repo/database";
import {
  featureRequests,
  githubInstallations,
  prds,
  pullRequests,
  reviewCycles,
  reviewIssues,
} from "@repo/database/schema";

import { reviewPullRequestAgainstPrd } from "@/features/ai/qa-reviewer";
import { consumeReviewCredit, resolveOrgIdForPullRequest, ReviewCreditError } from "@/features/billing/server/credits";
import { getGithubApp } from "@/lib/github/app";
import { publishOrgEvent } from "@/lib/realtime/server";

export { ReviewCreditError };

/**
 * Runs the full AI review for a cached pull request and posts the result back
 * to GitHub. This is the single source of truth for review execution — it is
 * called both by the Inngest webhook function and directly (inline) from server
 * actions, so reviews work even when Inngest isn't reachable.
 */
export async function runReviewForPullRequest(pullRequestId: string) {
  const [pullRequest] = await db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.id, pullRequestId));

  if (!pullRequest) {
    throw new Error(`Pull request ${pullRequestId} not found`);
  }

  const featureId = pullRequest.featureId; // null for PRs not on a feature branch

  // Billing gate: each review cycle (initial + re-runs) spends one AI-review
  // credit. Block before any AI work when the org's monthly budget is spent.
  const organizationId = await resolveOrgIdForPullRequest({
    featureId,
    repositoryId: pullRequest.repositoryId,
  });
  if (organizationId) {
    const allowed = await consumeReviewCredit(organizationId);
    if (!allowed) throw new ReviewCreditError();
  }

  // PRD context — only present when the PR is linked to a feature.
  const [prd] = featureId
    ? await db.select().from(prds).where(eq(prds.featureId, featureId))
    : [null];

  // --- Resolve an installation token and fetch the unified diff ---
  const app = getGithubApp();
  const [owner, repo] = pullRequest.repoFullName.split("/") as [string, string];

  let installationId = pullRequest.installationId;
  if (!installationId) {
    const { data: inst } = await app.octokit.rest.apps.getRepoInstallation({ owner, repo });
    installationId = inst.id;
  }

  const octokit = await app.getInstallationOctokit(installationId);

  // Per-file patches so the reviewer can attribute findings to real files.
  const { data: prFiles } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullRequest.number,
    per_page: 100,
  });
  let files = prFiles
    .filter((f) => f.patch)
    .map((f) => ({ filePath: f.filename, patch: f.patch as string }));

  // Fall back to the unified diff if GitHub returned no per-file patches.
  if (files.length === 0) {
    const { data: diffData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullRequest.number,
      mediaType: { format: "diff" },
    });
    files = [{ filePath: "diff", patch: String(diffData) }];
  }

  // Commit messages give the reviewer extra intent signal.
  const { data: prCommits } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullRequest.number,
    per_page: 100,
  });
  const commits = prCommits.map((c) => ({ sha: c.sha, message: c.commit.message }));

  // --- Open a DB review cycle for every reviewed PR (linked or not) ---
  const [reviewCycle] = await db
    .insert(reviewCycles)
    .values({
      id: crypto.randomUUID(),
      pullRequestId: pullRequest.id,
      featureId,
      headSha: pullRequest.headSha,
      status: "running",
    })
    .returning();

  // Feature-linked: move the feature into review and announce it live.
  if (featureId) {
    const [feat] = await db
      .update(featureRequests)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(eq(featureRequests.id, featureId))
      .returning({ organizationId: featureRequests.organizationId });

    if (feat) {
      await publishOrgEvent(feat.organizationId, {
        type: "review.started",
        featureId,
        prNumber: pullRequest.number,
      });
    }
  }

  // --- Run the AI review (with or without PRD context) ---
  const review = await reviewPullRequestAgainstPrd({
    repoFullName: pullRequest.repoFullName,
    pullRequestTitle: pullRequest.title,
    prdTitle: prd?.problem ?? null,
    acceptanceCriteria: prd ? (JSON.parse(prd.acceptanceCriteria) as string[]) : null,
    files,
    commits,
  });

  // --- Persist results for every cycle; feature status only when linked ---
  if (reviewCycle) {
    let prAuthorUserId: string | null = null;
    if (pullRequest.authorLogin) {
      const [installation] = await db
        .select({ userId: githubInstallations.userId })
        .from(githubInstallations)
        .where(eq(githubInstallations.accountLogin, pullRequest.authorLogin));
      prAuthorUserId = installation?.userId ?? null;
    }

    await db
      .update(reviewCycles)
      .set({
        status: review.status === "passed" ? "passed" : "failed",
        overallVerdict: review.status === "passed" ? "approve" : "request_changes",
        summary: review.summary,
        prdComplianceScore: review.complianceScore,
        completedAt: new Date(),
      })
      .where(eq(reviewCycles.id, reviewCycle.id));

    if (review.findings.length > 0) {
      await db.insert(reviewIssues).values(
        review.findings.map((finding) => ({
          id: crypto.randomUUID(),
          reviewCycleId: reviewCycle.id,
          category: "prd_compliance",
          severity: finding.severity === "blocking" ? "blocking" : "non_blocking",
          title: finding.message,
          description: finding.message,
          suggestion:
            finding.suggestion?.trim() ||
            "Update the pull request to satisfy the linked PRD.",
          filePath: finding.file,
          assignedTo: finding.severity === "blocking" ? prAuthorUserId : null,
        })),
      );
    }

    // Feature-linked: roll the verdict up to the feature + broadcast live.
    if (featureId) {
      await db
        .update(featureRequests)
        .set({
          status: review.status === "passed" ? "approved" : "blocked",
          updatedAt: new Date(),
        })
        .where(eq(featureRequests.id, featureId));

      const [feat] = await db
        .select({ organizationId: featureRequests.organizationId })
        .from(featureRequests)
        .where(eq(featureRequests.id, featureId));

      if (feat) {
        await publishOrgEvent(feat.organizationId, {
          type: "review.completed",
          featureId,
          verdict: review.status === "passed" ? "approved" : "changes requested",
          complianceScore: review.complianceScore,
        });
      }
    }
  }

  // --- Always post a summary comment on the GitHub PR ---
  let markdownBody = `### Reqraft Review 🚢\n\n`;
  markdownBody += `**Verdict:** ${review.status === "passed" ? "✅ Approved" : "❌ Changes Requested"} · **PRD compliance: ${review.complianceScore}/100**\n\n`;
  markdownBody += `${review.summary}\n\n`;
  if (review.findings.length > 0) {
    markdownBody += `#### Findings\n`;
    review.findings.forEach((f) => {
      markdownBody += `- **${f.severity.toUpperCase()}**: ${f.message}\n`;
      if (f.suggestion?.trim()) {
        markdownBody += `  - 💡 ${f.suggestion.trim()}\n`;
      }
    });
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullRequest.number,
    body: markdownBody,
  });

  return review;
}

/** Whether a review cycle already exists for a PR (used to avoid duplicate auto-reviews). */
export async function hasExistingReview(pullRequestId: string): Promise<boolean> {
  const [cycle] = await db
    .select({ id: reviewCycles.id })
    .from(reviewCycles)
    .where(eq(reviewCycles.pullRequestId, pullRequestId))
    .limit(1);
  return Boolean(cycle);
}

/**
 * A completed review cycle covering the PR's current head commit, if one exists.
 * Lets a manual "re-run" reuse the existing review instead of spending a fresh
 * AI call when nothing has changed since the last review.
 */
export async function reviewForCurrentCommit(
  pullRequestId: string,
): Promise<{ id: string; status: string } | null> {
  const [pr] = await db
    .select({ headSha: pullRequests.headSha })
    .from(pullRequests)
    .where(eq(pullRequests.id, pullRequestId));
  if (!pr) return null;

  const [cycle] = await db
    .select({ id: reviewCycles.id, status: reviewCycles.status })
    .from(reviewCycles)
    .where(
      and(
        eq(reviewCycles.pullRequestId, pullRequestId),
        eq(reviewCycles.headSha, pr.headSha),
      ),
    )
    .orderBy(desc(reviewCycles.createdAt))
    .limit(1);

  if (!cycle || (cycle.status !== "passed" && cycle.status !== "failed")) {
    return null;
  }
  return cycle;
}

/**
 * Whether an *auto-triggered* review should be skipped for a PR: a review is
 * already running, or this exact head SHA was already reviewed (webhook
 * re-deliveries, no-op pushes). Manual re-runs bypass this by calling
 * `runReviewForPullRequest` directly.
 */
export async function shouldSkipAutoReview(
  pullRequestId: string,
  headSha: string,
): Promise<boolean> {
  const cycles = await db
    .select({
      status: reviewCycles.status,
      headSha: reviewCycles.headSha,
      createdAt: reviewCycles.createdAt,
    })
    .from(reviewCycles)
    .where(eq(reviewCycles.pullRequestId, pullRequestId));

  // A "running" cycle older than this is presumed crashed and won't block.
  const STUCK_AFTER_MS = 15 * 60 * 1000;
  const now = Date.now();

  return cycles.some((c) => {
    if (c.headSha != null && c.headSha === headSha) return true;
    if (c.status === "running") {
      const age = now - new Date(c.createdAt).getTime();
      return age < STUCK_AFTER_MS;
    }
    return false;
  });
}
