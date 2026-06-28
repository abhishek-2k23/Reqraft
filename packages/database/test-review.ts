import { db, eq } from "./index";
import { prds, pullRequests } from "./schema";
import { reviewPullRequestAgainstPrd } from "../../apps/web/features/ai/qa-reviewer";
import { getGithubApp } from "../../apps/web/lib/github/app";

async function run() {
  const pullRequestId = "pr_3926469669";
  
  console.log("Fetching PR...");
  const [pullRequest] = await db.select().from(pullRequests).where(eq(pullRequests.id, pullRequestId));
  if (!pullRequest) throw new Error("PR not found");
  
  console.log("Fetching Context...");
  const [prd] = await db.select().from(prds).where(eq(prds.featureId, pullRequest.featureId));
  if (!prd) throw new Error("PRD not found");

  console.log("Fetching Diff...");
  const app = getGithubApp();
  const [owner, repo] = pullRequest.repoFullName.split("/");
  const { data: installation } = await app.octokit.rest.apps.getRepoInstallation({ owner, repo });
  const octokit = await app.getInstallationOctokit(installation.id);
  
  const { data: diffData } = await octokit.rest.pulls.get({
    owner, repo, pull_number: pullRequest.number, mediaType: { format: "diff" },
  });

  const files = [{ filePath: "diff", patch: String(diffData) }];

  console.log("AI Review...");
  const review = await reviewPullRequestAgainstPrd({
    repoFullName: pullRequest.repoFullName,
    pullRequestTitle: pullRequest.title,
    prdTitle: prd.problem,
    acceptanceCriteria: JSON.parse(prd.acceptanceCriteria),
    files,
  });

  console.log("Review Status:", review.status);
  
  let markdownBody = `### Reqraft Review 🚢\n\n`;
  markdownBody += `**Verdict:** ${review.status === "passed" ? "✅ Approved" : "❌ Changes Requested"}\n\n`;
  markdownBody += `${review.summary}\n\n`;
  if (review.findings.length > 0) {
    markdownBody += `#### Findings\n`;
    review.findings.forEach(f => {
      markdownBody += `- **${f.severity.toUpperCase()}**: ${f.message}\n`;
    });
  }

  await octokit.rest.issues.createComment({
    owner, repo, issue_number: pullRequest.number, body: markdownBody,
  });
  console.log("Done!");
}

run().catch(console.error);
