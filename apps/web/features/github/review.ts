import { db, eq } from "@repo/database";
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
  const { data: diffData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequest.number,
    mediaType: { format: "diff" },
  });
  const files = [{ filePath: "diff", patch: String(diffData) }];

  // --- Open a DB review cycle (feature-linked PRs only) ---
  let reviewCycle: { id: string } | null = null;
  if (featureId) {
    const [cycle] = await db
      .insert(reviewCycles)
      .values({
        id: crypto.randomUUID(),
        pullRequestId: pullRequest.id,
        featureId,
        status: "running",
      })
      .returning();
    reviewCycle = cycle ?? null;

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
  });

  // --- Persist results + update feature status (feature-linked only) ---
  if (featureId && reviewCycle) {
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
        prdComplianceScore: review.status === "passed" ? 100 : 60,
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
          suggestion: "Update the pull request to satisfy the linked PRD.",
          filePath: finding.file,
          assignedTo: finding.severity === "blocking" ? prAuthorUserId : null,
        })),
      );
    }

    await db
      .update(featureRequests)
      .set({
        status: review.status === "passed" ? "approved" : "blocked",
        updatedAt: new Date(),
      })
      .where(eq(featureRequests.id, featureId));

    // Broadcast the result to the org so everyone sees the verdict live
    const [feat] = await db
      .select({ organizationId: featureRequests.organizationId })
      .from(featureRequests)
      .where(eq(featureRequests.id, featureId));

    if (feat) {
      await publishOrgEvent(feat.organizationId, {
        type: "review.completed",
        featureId,
        verdict: review.status === "passed" ? "approved" : "changes requested",
        complianceScore: review.status === "passed" ? 100 : 60,
      });
    }
  }

  // --- Always post a summary comment on the GitHub PR ---
  let markdownBody = `### Reqraft Review 🚢\n\n`;
  markdownBody += `**Verdict:** ${review.status === "passed" ? "✅ Approved" : "❌ Changes Requested"}\n\n`;
  markdownBody += `${review.summary}\n\n`;
  if (review.findings.length > 0) {
    markdownBody += `#### Findings\n`;
    review.findings.forEach((f) => {
      markdownBody += `- **${f.severity.toUpperCase()}**: ${f.message}\n`;
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
