import assert from "node:assert/strict";
import test from "node:test";

import {
  createFeatureRequest,
  getNextFeatureStatus,
  summarizeFeatureProgress,
  type FeatureStatus,
} from "./workflow";

test("createFeatureRequest trims input and starts in intake", () => {
  const feature = createFeatureRequest({
    title: "  AI QA gate  ",
    description: " Review every PR against the approved PRD. ",
    createdById: "user_1",
    organizationId: "org_1",
    projectId: "project_1",
  });

  assert.equal(feature.title, "AI QA gate");
  assert.equal(feature.description, "Review every PR against the approved PRD.");
  assert.equal(feature.status, "intake");
  assert.equal(feature.priority, "medium");
});

test("createFeatureRequest rejects empty titles", () => {
  assert.throws(
    () =>
      createFeatureRequest({
        title: "   ",
        description: "Useful idea",
        createdById: "user_1",
        organizationId: "org_1",
        projectId: "project_1",
      }),
    /title/i,
  );
});

test("getNextFeatureStatus follows the ShipFlow lifecycle", () => {
  const path: FeatureStatus[] = [
    "intake",
    "clarifying",
    "prd_ready",
    "tasks_ready",
    "in_progress",
    "in_review",
    "approved",
    "shipped",
  ];

  const visited: FeatureStatus[] = ["intake"];
  let current: FeatureStatus = "intake";

  while (current !== "shipped") {
    current = getNextFeatureStatus(current);
    visited.push(current);
  }

  assert.deepEqual(visited, path);
});

test("summarizeFeatureProgress returns a user-facing dashboard summary", () => {
  const summary = summarizeFeatureProgress({
    total: 8,
    shipped: 2,
    inReview: 1,
    blocked: 1,
  });

  assert.equal(summary.shippedPercent, 25);
  assert.equal(summary.activeCount, 5);
  assert.equal(summary.health, "attention");
});
