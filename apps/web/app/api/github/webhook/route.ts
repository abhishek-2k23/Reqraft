import { getGithubApp } from "@/lib/github/app";
import { db, eq } from "@repo/database";
import { featureRequests, pullRequestsTable } from "@repo/database/schema";
import { inngest } from "@/features/inngest/client";
import { runReviewForPullRequest } from "@/features/github/review";

const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"];

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventName = request.headers.get("x-github-event");

  console.log(`[github-webhook] received event="${eventName}" hasSignature=${Boolean(signature)}`);

  if (!signature) {
    console.warn("[github-webhook] rejected: missing x-hub-signature-256 header");
    return Response.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    const app = getGithubApp();
    const isValid = await app.webhooks.verify(payload, signature);
    if (!isValid) {
      console.warn(
        "[github-webhook] rejected: invalid signature — GITHUB_WEBHOOK_SECRET does not match the secret set on the GitHub App",
      );
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (error) {
    console.error("[github-webhook] verification failed:", error);
    return Response.json({ error: "Verification failed" }, { status: 401 });
  }

  if (eventName !== "pull_request") {
    console.log(`[github-webhook] ignoring non-pull_request event="${eventName}"`);
    return Response.json({ received: true });
  }

  const event = JSON.parse(payload);
  const pr = event.pull_request;
  if (!pr) {
    return Response.json({ received: true });
  }

  console.log(
    `[github-webhook] pull_request action="${event.action}" repo="${event.repository?.full_name}" #${pr.number} branch="${pr.head?.ref}"`,
  );

  // Resolve a feature branch (feature/{featureId}) to a real feature, if any.
  const branchName: string = pr.head.ref;
  const match = branchName.match(/^feature\/(.+)$/);
  const branchFeatureId = match?.[1];
  let featureId: string | null = null;
  if (branchFeatureId) {
    const [feature] = await db
      .select({ id: featureRequests.id })
      .from(featureRequests)
      .where(eq(featureRequests.id, branchFeatureId));
    featureId = feature?.id ?? null;
  }

  // Cache every PR for connected repos — even ones not tied to a feature.
  let saved;
  try {
    const [record] = await db
      .insert(pullRequestsTable)
      .values({
        id: `pr_${pr.id}`,
        featureId,
        installationId: event.installation?.id || 0,
        githubPrId: pr.id,
        githubPrUrl: pr.html_url,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        authorLogin: pr.user?.login,
        headBranch: branchName,
        baseBranch: pr.base.ref,
        headSha: pr.head.sha,
        repoFullName: event.repository.full_name,
        state: pr.merged_at ? "merged" : pr.state || "open",
      })
      .onConflictDoUpdate({
        target: pullRequestsTable.id,
        set: {
          featureId,
          headSha: pr.head.sha,
          state: pr.merged_at ? "merged" : pr.state || "open",
          title: pr.title,
          body: pr.body,
          updatedAt: new Date(),
        },
      })
      .returning();
    saved = record;
  } catch (error) {
    console.error("Failed to persist pull request:", error);
    return Response.json({ error: "Failed to persist pull request" }, { status: 500 });
  }

  // Trigger AI review for every PR in a repo where the app is installed.
  if (saved && REVIEWABLE_ACTIONS.includes(event.action)) {
    const savedId = saved.id;
    try {
      await inngest.send({
        name: "github/pull_request.review_requested",
        data: { pullRequestId: savedId, repoFullName: event.repository.full_name },
      });
      console.log(`[github-webhook] enqueued review for ${savedId}`);
    } catch (error) {
      // Inngest unreachable (e.g. dev server offline). Fall back to running the
      // review inline, fire-and-forget, so it still happens. We don't await it —
      // GitHub expects a fast webhook response.
      console.error("[github-webhook] inngest enqueue failed, running review inline:", error);
      void runReviewForPullRequest(savedId).catch((err) =>
        console.error("[github-webhook] inline review failed:", err),
      );
    }
  }

  return Response.json({ received: true });
}
