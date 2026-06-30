import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldReviewPullRequestAction,
  toReviewRequestedEvent,
} from "./github";

test("shouldReviewPullRequestAction accepts only review-worthy PR actions", () => {
  assert.equal(shouldReviewPullRequestAction("opened"), true);
  assert.equal(shouldReviewPullRequestAction("synchronize"), true);
  assert.equal(shouldReviewPullRequestAction("closed"), false);
});

test("toReviewRequestedEvent normalizes a GitHub pull request webhook", () => {
  assert.deepEqual(
    toReviewRequestedEvent({
      repository: { full_name: "kaiser/shipflow" },
      pull_request: {
        number: 42,
        title: "Add PRD approval gate",
        head: { sha: "abc123" },
        base: { ref: "main" },
        user: { login: "kaiser" },
      },
    }),
    {
      repoFullName: "kaiser/shipflow",
      pullRequestNumber: 42,
      pullRequestTitle: "Add PRD approval gate",
      authorLogin: "kaiser",
      headSha: "abc123",
      baseBranch: "main",
    },
  );
});

test("shouldReviewPullRequestAction covers reopened and ready_for_review, rejects noise", () => {
  assert.equal(shouldReviewPullRequestAction("reopened"), true);
  assert.equal(shouldReviewPullRequestAction("ready_for_review"), true);
  assert.equal(shouldReviewPullRequestAction("labeled"), false);
  assert.equal(shouldReviewPullRequestAction("assigned"), false);
  assert.equal(shouldReviewPullRequestAction(""), false);
});

test("toReviewRequestedEvent falls back to 'unknown' when the PR has no author", () => {
  const event = toReviewRequestedEvent({
    repository: { full_name: "kaiser/shipflow" },
    pull_request: {
      number: 7,
      title: "Bot PR",
      head: { sha: "deadbeef" },
      base: { ref: "develop" },
      user: null,
    },
  });
  assert.equal(event.authorLogin, "unknown");
  assert.equal(event.baseBranch, "develop");
});
