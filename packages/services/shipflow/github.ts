export type GitHubPullRequestWebhookPayload = {
  repository: {
    full_name: string;
  };
  pull_request: {
    number: number;
    title: string;
    head: {
      sha: string;
    };
    base: {
      ref: string;
    };
    user: {
      login: string;
    } | null;
  };
};

export type PullRequestReviewRequestedEvent = {
  repoFullName: string;
  pullRequestNumber: number;
  pullRequestTitle: string;
  authorLogin: string;
  headSha: string;
  baseBranch: string;
};

const reviewableActions = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

export function shouldReviewPullRequestAction(action: string) {
  return reviewableActions.has(action);
}

export function toReviewRequestedEvent(
  payload: GitHubPullRequestWebhookPayload,
): PullRequestReviewRequestedEvent {
  return {
    repoFullName: payload.repository.full_name,
    pullRequestNumber: payload.pull_request.number,
    pullRequestTitle: payload.pull_request.title,
    authorLogin: payload.pull_request.user?.login ?? "unknown",
    headSha: payload.pull_request.head.sha,
    baseBranch: payload.pull_request.base.ref,
  };
}
