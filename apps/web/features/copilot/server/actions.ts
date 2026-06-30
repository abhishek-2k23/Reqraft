"use server";

import { and, db, desc, eq } from "@repo/database";
import {
  featureRequests,
  prds,
  repositories,
  reviewCycles,
  reviewIssues,
} from "@repo/database/schema";

import { requireAuth } from "@/features/auth/session";
import { getGithubApp } from "@/lib/github/app";

import { generateImplementation, type CopilotMode, type CopilotPlan } from "./agent";
import { buildRepoContext, getRepoContext } from "./repo-context";

type ActionError = { ok: false; error: string };

// Resolve the active org and confirm the repo belongs to it. Every Copilot
// action goes through this so one org can't touch another's repo.
async function authorizeRepo(repositoryId: string) {
  const session = await requireAuth();
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return { error: "Select an organization first." as const };
  }

  const [repo] = await db
    .select()
    .from(repositories)
    .where(
      and(eq(repositories.id, repositoryId), eq(repositories.organizationId, organizationId)),
    );
  if (!repo) return { error: "Repository not found in this organization." as const };

  return { session, organizationId, repo };
}

export async function refreshRepoContextAction(repositoryId: string) {
  const auth = await authorizeRepo(repositoryId);
  if ("error" in auth) return { ok: false as const, error: auth.error };

  try {
    const context = await buildRepoContext(repositoryId);
    return {
      ok: true as const,
      fileCount: context.fileCount,
      updatedAt: context.updatedAt.toISOString(),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to index repository.",
    };
  }
}

export async function generateImplementationAction(input: {
  repositoryId: string;
  prompt: string;
  mode: CopilotMode;
  featureId?: string | null;
}): Promise<({ ok: true; plan: CopilotPlan }) | ActionError> {
  const auth = await authorizeRepo(input.repositoryId);
  if ("error" in auth) return { ok: false, error: auth.error };

  if (!input.prompt.trim()) {
    return { ok: false, error: "Describe what you want to build or fix." };
  }

  // Pull PRD + outstanding review findings when the request is tied to a feature
  // — this is what lets it "build from the PRD" or "fix the review issues".
  let prd: { problem: string; acceptanceCriteria: string[] } | null = null;
  let reviewFindings: string[] | null = null;

  if (input.featureId) {
    const [feature] = await db
      .select({ id: featureRequests.id })
      .from(featureRequests)
      .where(
        and(
          eq(featureRequests.id, input.featureId),
          eq(featureRequests.organizationId, auth.organizationId),
        ),
      );
    if (feature) {
      const [prdRow] = await db
        .select()
        .from(prds)
        .where(eq(prds.featureId, input.featureId));
      if (prdRow) {
        prd = {
          problem: prdRow.problem,
          acceptanceCriteria: JSON.parse(prdRow.acceptanceCriteria) as string[],
        };
      }

      if (input.mode === "fix") {
        const [latestCycle] = await db
          .select({ id: reviewCycles.id })
          .from(reviewCycles)
          .where(eq(reviewCycles.featureId, input.featureId))
          .orderBy(desc(reviewCycles.createdAt))
          .limit(1);
        if (latestCycle) {
          const issues = await db
            .select({ title: reviewIssues.title, suggestion: reviewIssues.suggestion })
            .from(reviewIssues)
            .where(
              and(
                eq(reviewIssues.reviewCycleId, latestCycle.id),
                eq(reviewIssues.resolved, false),
              ),
            );
          reviewFindings = issues.map((i) =>
            i.suggestion ? `${i.title} — ${i.suggestion}` : i.title,
          );
        }
      }
    }
  }

  try {
    const plan = await generateImplementation({
      repositoryId: input.repositoryId,
      prompt: input.prompt,
      mode: input.mode,
      prd,
      reviewFindings,
    });
    return { ok: true, plan };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Generation failed.",
    };
  }
}

export async function openDraftPrAction(input: {
  repositoryId: string;
  title: string;
  body: string;
  files: Array<{ path: string; content: string }>;
}) {
  const auth = await authorizeRepo(input.repositoryId);
  if ("error" in auth) return { ok: false as const, error: auth.error };

  const { repo } = auth;
  if (!repo.installationId) {
    return { ok: false as const, error: "Repository has no GitHub installation." };
  }
  if (input.files.length === 0) {
    return { ok: false as const, error: "No files to commit." };
  }

  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(repo.installationId);
    const [owner, name] = repo.fullName.split("/") as [string, string];

    // Base the branch on the current default-branch head.
    const { data: branch } = await octokit.rest.repos.getBranch({
      owner,
      repo: name,
      branch: repo.defaultBranch,
    });
    const baseSha = branch.commit.sha;
    const baseTreeSha = branch.commit.commit.tree.sha;

    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "change";
    const branchName = `reqraft/${slug}-${baseSha.slice(0, 6)}`;

    await octokit.rest.git.createRef({
      owner,
      repo: name,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // One commit containing all generated files (blob -> tree -> commit -> ref).
    const tree = await Promise.all(
      input.files.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo: name,
          content: Buffer.from(file.content, "utf8").toString("base64"),
          encoding: "base64",
        });
        return {
          path: file.path.replace(/^\/+/, ""),
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      }),
    );

    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo: name,
      base_tree: baseTreeSha,
      tree,
    });

    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo: name,
      message: `${input.title}\n\nGenerated by Reqraft Copilot.`,
      tree: newTree.sha,
      parents: [baseSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo: name,
      ref: `heads/${branchName}`,
      sha: commit.sha,
    });

    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo: name,
      title: input.title,
      head: branchName,
      base: repo.defaultBranch,
      body: `${input.body}\n\n— Drafted by Reqraft Copilot 🚢`,
      draft: true,
    });

    return { ok: true as const, prUrl: pr.html_url, prNumber: pr.number };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to open draft PR.",
    };
  }
}

export async function getRepoContextStatusAction(repositoryId: string) {
  const auth = await authorizeRepo(repositoryId);
  if ("error" in auth) return null;
  const context = await getRepoContext(repositoryId);
  if (!context) return { indexed: false as const };
  return {
    indexed: true as const,
    fileCount: context.fileCount,
    stack: context.stack,
    updatedAt: context.updatedAt.toISOString(),
  };
}
