import "server-only";

import { and, db, desc, eq } from "@repo/database";
import { pullRequests } from "@repo/database/schema";

export type LinkedOpenPr = {
  number: number;
  url: string;
  title: string;
  body: string | null;
  headBranch: string;
  baseBranch: string;
};

/**
 * The feature's linked OPEN pull request in the given repo, if any. This is the
 * source of truth for "where agent work on this feature lives": a PR gets
 * linked by the webhook's branch auto-linker OR manually via
 * linkPullRequestToFeature — the manual path does no branch rename, so the
 * linked PR's head branch may differ from the feature's canonical
 * feature/<slug> branch. Agent runs must read from and commit to THIS branch,
 * not the canonical one, or follow-up work opens a second PR.
 */
export async function getLinkedOpenPr(
  featureId: string,
  repoFullName: string,
): Promise<LinkedOpenPr | null> {
  const [pr] = await db
    .select({
      number: pullRequests.number,
      url: pullRequests.githubPrUrl,
      title: pullRequests.title,
      body: pullRequests.body,
      headBranch: pullRequests.headBranch,
      baseBranch: pullRequests.baseBranch,
    })
    .from(pullRequests)
    .where(
      and(
        eq(pullRequests.featureId, featureId),
        eq(pullRequests.repoFullName, repoFullName),
        eq(pullRequests.state, "open"),
      ),
    )
    .orderBy(desc(pullRequests.number))
    .limit(1);
  return pr ?? null;
}
