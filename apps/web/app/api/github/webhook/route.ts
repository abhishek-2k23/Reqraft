import { getGithubApp } from "@/lib/github/app";
import { db } from "@repo/database";
import { pullRequestsTable } from "@repo/database/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/features/inngest/client";

const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"];

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventName = request.headers.get("x-github-event");
  console.log("DB URL IN NEXTJS:", process.env.DATABASE_URL);

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    const app = getGithubApp();
    const isValid = await app.webhooks.verify(payload, signature);

    if (!isValid) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return Response.json({ error: "Verification failed" }, { status: 401 });
  }

  if (eventName !== "pull_request") {
    return Response.json({ received: true });
  }

  const event = JSON.parse(payload);

  if (!REVIEWABLE_ACTIONS.includes(event.action)) {
    return Response.json({ received: true });
  }

  // Extract feature ID from branch name (e.g. feature/cm52abcd123)
  const branchName = event.pull_request.head.ref;
  const match = branchName.match(/^feature\/(.+)$/);
  const featureId = match ? match[1] : null;

  if (!featureId) {
    console.log("No feature ID found in branch name, skipping.");
    return Response.json({ received: true });
  }

  // Upsert Pull Request Record
  let pr;
  try {
    const [insertedPr] = await db.insert(pullRequestsTable).values({
      id: `pr_${event.pull_request.id}`,
      featureId: featureId,
      installationId: event.installation?.id || 0,
      githubPrId: event.pull_request.id,
      githubPrUrl: event.pull_request.html_url,
      number: event.pull_request.number,
      title: event.pull_request.title,
      body: event.pull_request.body,
      authorLogin: event.pull_request.user?.login,
      headBranch: branchName,
      baseBranch: event.pull_request.base.ref,
      headSha: event.pull_request.head.sha,
      repoFullName: event.repository.full_name,
      state: event.pull_request.state || "open",
    }).onConflictDoUpdate({
      target: pullRequestsTable.id,
      set: {
        headSha: event.pull_request.head.sha,
        state: event.pull_request.state || "open",
        title: event.pull_request.title,
        body: event.pull_request.body,
      }
    }).returning();
    pr = insertedPr;
  } catch (error: any) {
    console.error("DB INSERT ERROR:", error);
    return Response.json({ 
      error: "DB INSERT ERROR", 
      msg: String(error),
      code: error?.code,
      detail: error?.detail,
      pgMessage: error?.message,
      cause: error?.cause ? String(error.cause) : undefined,
      dbUrl: process.env.DATABASE_URL
    }, { status: 500 });
  }

  try {
    await inngest.send({
      name: "github/pull_request.review_requested",
      data: { pullRequestId: pr.id, repoFullName: event.repository.full_name },
    });
  } catch (error: any) {
    console.error("INNGEST SEND ERROR:", error);
    // Even if Inngest fails, we successfully saved the PR, so return 200 to GitHub
  }

  return Response.json({ received: true });
}
