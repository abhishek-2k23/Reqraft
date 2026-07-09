import "server-only";

import { getGithubApp } from "@/lib/github/app";

export type PrFile = { path: string; content: string };

/**
 * Translate opaque GitHub App failures into something the user can act on.
 * "Resource not accessible by integration" is GitHub's way of saying the App
 * (or this installation) lacks the permission for the endpoint — for the git
 * data + pulls APIs used here that means Contents / Pull requests write.
 */
function friendlyGithubError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/resource not accessible by integration/i.test(message)) {
    return new Error(
      "GitHub blocked the write (“Resource not accessible by integration”). " +
        "The GitHub App needs “Contents: Read and write” and “Pull requests: Read and write” permissions. " +
        "Update them under the App’s settings → Permissions & events, then approve the pending permission " +
        "request on the org’s installation (Settings → GitHub Apps → Configure) and retry.",
    );
  }
  return error instanceof Error ? error : new Error(message);
}

/**
 * Commit a set of generated files as one commit on a branch (blob → tree →
 * commit → ref via the git data API) and open a pull request against the
 * repo's default branch. Shared by Copilot's draft PRs and the Agent's
 * "Raise PR" flow.
 *
 * When `branchName` is given (e.g. a feature's canonical `feature/<slug>`
 * branch), it is used verbatim and the flow is idempotent: an existing branch
 * is reset onto the current default-branch head with the regenerated files,
 * and if an open PR from that branch already exists it is returned instead of
 * failing with "a pull request already exists".
 */
export async function commitFilesAndOpenPr(input: {
  installationId: number;
  fullName: string;
  defaultBranch: string;
  /** Branch namespace, e.g. "reqraft" → reqraft/<slug>-<sha>. */
  branchPrefix: string;
  /** Explicit head branch — overrides the generated prefix/slug name. */
  branchName?: string;
  title: string;
  body: string;
  commitMessage: string;
  files: PrFile[];
  draft: boolean;
}): Promise<{ prUrl: string; prNumber: number; branchName: string }> {
  try {
    return await commitAndOpen(input);
  } catch (error) {
    throw friendlyGithubError(error);
  }
}

async function commitAndOpen(
  input: Parameters<typeof commitFilesAndOpenPr>[0],
): Promise<{ prUrl: string; prNumber: number; branchName: string }> {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(input.installationId);
  const [owner, name] = input.fullName.split("/") as [string, string];

  // Base the branch on the current default-branch head.
  const { data: branch } = await octokit.rest.repos.getBranch({
    owner,
    repo: name,
    branch: input.defaultBranch,
  });
  const baseSha = branch.commit.sha;
  const baseTreeSha = branch.commit.commit.tree.sha;

  const slug =
    input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "change";
  const branchName = input.branchName ?? `${input.branchPrefix}/${slug}-${baseSha.slice(0, 6)}`;

  try {
    await octokit.rest.git.createRef({
      owner,
      repo: name,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
  } catch (error) {
    // Explicit branches (feature/<slug>) are agent-managed: a regeneration
    // resets the branch onto the current base head. Generated names include a
    // sha suffix and shouldn't collide — rethrow anything else.
    const message = error instanceof Error ? error.message : String(error);
    if (!input.branchName || !/already exists/i.test(message)) throw error;
    await octokit.rest.git.updateRef({
      owner,
      repo: name,
      ref: `heads/${branchName}`,
      sha: baseSha,
      force: true,
    });
  }

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
    message: input.commitMessage,
    tree: newTree.sha,
    parents: [baseSha],
  });

  await octokit.rest.git.updateRef({
    owner,
    repo: name,
    ref: `heads/${branchName}`,
    sha: commit.sha,
  });

  try {
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo: name,
      title: input.title,
      head: branchName,
      base: input.defaultBranch,
      body: input.body,
      draft: input.draft,
    });
    return { prUrl: pr.html_url, prNumber: pr.number, branchName };
  } catch (error) {
    // Re-raising onto an existing feature branch: the open PR already tracks
    // it — the branch was just updated with the new commit, so return that PR.
    const message = error instanceof Error ? error.message : String(error);
    if (!input.branchName || !/pull request already exists/i.test(message)) throw error;
    const { data: existing } = await octokit.rest.pulls.list({
      owner,
      repo: name,
      head: `${owner}:${branchName}`,
      base: input.defaultBranch,
      state: "open",
      per_page: 1,
    });
    const pr = existing[0];
    if (!pr) throw error;
    return { prUrl: pr.html_url, prNumber: pr.number, branchName };
  }
}
