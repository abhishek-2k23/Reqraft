import { db, eq } from "@repo/database";
import {
  featureRequests,
  prds,
  pullRequests,
  reviewCycles,
  reviewIssues,
  tasks,
} from "@repo/database/schema";

import { reviewPullRequestAgainstPrd } from "@/features/ai/qa-reviewer";
import { getGithubApp } from "@/lib/github/app";

import { inngest } from "../client";

export const reviewPullRequestFunction = inngest.createFunction(
  { id: "review-pull-request", triggers: [{ event: "github/pull_request.review_requested" }] },
  async ({ event, step }) => {
    const { pullRequestId } = event.data as {
      pullRequestId?: string;
      repoFullName?: string;
      pullRequestTitle?: string;
      prdTitle?: string;
      acceptanceCriteria?: string[];
      files?: Array<{ filePath: string; patch: string }>;
    };

    if (!pullRequestId) {
      const review = await step.run("review-webhook-payload", async () =>
        reviewPullRequestAgainstPrd({
          repoFullName: event.data.repoFullName,
          pullRequestTitle: event.data.pullRequestTitle,
          prdTitle: event.data.prdTitle,
          acceptanceCriteria: event.data.acceptanceCriteria,
          files: event.data.files,
        }),
      );

      return review;
    }

    const pullRequest = await step.run("fetch-pr", async () => {
      const [record] = await db
        .select()
        .from(pullRequests)
        .where(eq(pullRequests.id, pullRequestId));

      if (!record) {
        throw new Error(`Pull request ${pullRequestId} not found`);
      }

      return record;
    });

    const context = await step.run("fetch-prd-context", async () => {
      const [prd] = await db
        .select()
        .from(prds)
        .where(eq(prds.featureId, pullRequest.featureId));
      const featureTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.featureId, pullRequest.featureId));

      if (!prd) {
        throw new Error(`PRD not found for feature ${pullRequest.featureId}`);
      }

      return { prd, tasks: featureTasks };
    });

    const files = await step.run("fetch-github-diff", async () => {
      const app = getGithubApp();
      // Assume the PR record or webhook provided installation info, but if not we can use app.eachInstallation() or just octokit as app if single tenant.
      // For now, let's just get an authenticated octokit for the repo.
      // In a real app we'd save installation ID to DB. Let's assume we can fetch via repo owner.
      const [owner, repo] = pullRequest.repoFullName.split("/");
      const { data: installation } = await app.octokit.rest.apps.getRepoInstallation({ owner, repo });
      const octokit = await app.getInstallationOctokit(installation.id);
      
      const { data: diffData } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullRequest.number,
        mediaType: { format: "diff" },
      });
      
      return [
        {
          filePath: "diff",
          patch: String(diffData),
        },
      ];
    });

    const reviewCycle = await step.run("create-review-cycle", async () => {
      const [cycle] = await db
        .insert(reviewCycles)
        .values({
          id: crypto.randomUUID(),
          pullRequestId: pullRequest.id,
          featureId: pullRequest.featureId,
          status: "running",
        })
        .returning();

      if (!cycle) {
        throw new Error("Failed to create review cycle");
      }

      return cycle;
    });

    await step.run("set-in-review", async () => {
      await db
        .update(featureRequests)
        .set({ status: "in_review", updatedAt: new Date() })
        .where(eq(featureRequests.id, pullRequest.featureId));
    });

    const review = await step.run("ai-review", async () =>
      reviewPullRequestAgainstPrd({
        repoFullName: pullRequest.repoFullName,
        pullRequestTitle: pullRequest.title,
        prdTitle: context.prd.problem,
        acceptanceCriteria: JSON.parse(context.prd.acceptanceCriteria) as string[],
        files,
      }),
    );

    await step.run("save-results", async () => {
      await db
        .update(reviewCycles)
        .set({
          status: review.status === "passed" ? "passed" : "failed",
          overallVerdict:
            review.status === "passed" ? "approve" : "request_changes",
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
            severity:
              finding.severity === "blocking" ? "blocking" : "non_blocking",
            title: finding.message,
            description: finding.message,
            suggestion: "Update the pull request to satisfy the linked PRD.",
            filePath: finding.file,
          })),
        );
      }

      await db
        .update(featureRequests)
        .set({
          status: review.status === "passed" ? "approved" : "blocked",
          updatedAt: new Date(),
        })
        .where(eq(featureRequests.id, pullRequest.featureId));
    });

    await step.run("post-comment", async () => {
      const app = getGithubApp();
      const [owner, repo] = pullRequest.repoFullName.split("/");
      const { data: installation } = await app.octokit.rest.apps.getRepoInstallation({ owner, repo });
      const octokit = await app.getInstallationOctokit(installation.id);
      
      let markdownBody = `### ShipFlow AI Review 🚢\n\n`;
      markdownBody += `**Verdict:** ${review.status === "passed" ? "✅ Approved" : "❌ Changes Requested"}\n\n`;
      markdownBody += `${review.summary}\n\n`;
      if (review.findings.length > 0) {
        markdownBody += `#### Findings\n`;
        review.findings.forEach(f => {
          markdownBody += `- **${f.severity.toUpperCase()}**: ${f.message}\n`;
        });
      }
      
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullRequest.number,
        body: markdownBody,
      });

      return { posted: true };
    });

    return review;
  },
);
