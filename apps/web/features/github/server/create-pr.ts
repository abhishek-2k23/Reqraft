import "server-only";

import { getGithubApp } from "@/lib/github/app";

export type PrFile = { path: string; content: string };

/**
 * Commit a set of generated files as one commit on a fresh branch (blob →
 * tree → commit → ref via the git data API) and open a pull request against
 * the repo's default branch. Shared by Copilot's draft PRs and the Agent's
 * "Raise PR" flow.
 */
export async function commitFilesAndOpenPr(input: {
  installationId: number;
  fullName: string;
  defaultBranch: string;
  /** Branch namespace, e.g. "reqraft" → reqraft/<slug>-<sha>. */
  branchPrefix: string;
  title: string;
  body: string;
  commitMessage: string;
  files: PrFile[];
  draft: boolean;
}): Promise<{ prUrl: string; prNumber: number; branchName: string }> {
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
  const branchName = `${input.branchPrefix}/${slug}-${baseSha.slice(0, 6)}`;

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
}
