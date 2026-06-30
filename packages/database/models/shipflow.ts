import { randomUUID } from "node:crypto";

import {
  boolean,
  integer,
  bigint,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { usersTable } from "./user";

// Roles ordered from most to least privileged.
// "developer" is the default for new members invited without an explicit role.
export const MEMBER_ROLES = ["owner", "admin", "manager", "developer", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MEMBER_SPECIALTIES = ["frontend", "backend", "devops", "ai", "fullstack", "testing"] as const;
export type MemberSpecialty = (typeof MEMBER_SPECIALTIES)[number];

// Which task types each specialty covers when assigning generated tasks
export const SPECIALTY_TASK_TYPES: Record<MemberSpecialty, string[]> = {
  frontend:  ["frontend"],
  backend:   ["backend", "database"],
  devops:    ["infra"],
  ai:        ["ai"],
  fullstack: ["frontend", "backend", "database"],
  testing:   ["testing"],
};

// Minimum role required for a given action — usage: hasRole(memberRole, "manager")
export function hasRole(memberRole: MemberRole, minimum: MemberRole): boolean {
  return MEMBER_ROLES.indexOf(memberRole) <= MEMBER_ROLES.indexOf(minimum);
}

export const organizations = pgTable("organization", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const members = pgTable(
  "member",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    specialty: text("specialty"), // MemberSpecialty | null
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    memberUnique: uniqueIndex("member_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
  }),
);

export const invitations = pgTable("invitation", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const projects = pgTable("project", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  createdBy: text("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const repositories = pgTable("repository", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  githubRepoId: text("github_repo_id").notNull(),
  fullName: text("full_name").notNull(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  webhookId: text("webhook_id"),
  installationId: bigint("installation_id", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const githubInstallations = pgTable("github_installation", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  installationId: bigint("installation_id", { mode: "number" }).notNull(),
  accountLogin: text("account_login"),
  accountType: text("account_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const featureRequests = pgTable(
  "feature_request",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    source: text("source").notNull().default("manual"),
    status: text("status").notNull().default("intake"),
    priority: text("priority").notNull().default("medium"),
    // Readable, org-unique branch slug used to auto-link a PR to this feature
    // (e.g. "add-dark-mode" → branch "feature/add-dark-mode"). Nullable until
    // generated; older branches still link via the raw feature id.
    branchName: text("branch_name"),
    createdBy: text("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    assignedTo: text("assigned_to").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Branch slug must be unique within an org so a PR branch maps to exactly
    // one feature. NULLs are distinct in Postgres, so ungenerated rows are fine.
    branchNameUnique: uniqueIndex("feature_request_org_branch_unique").on(
      table.organizationId,
      table.branchName,
    ),
  }),
);

export const clarificationMessages = pgTable("clarification_message", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  featureId: text("feature_id")
    .notNull()
    .references(() => featureRequests.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const prds = pgTable("prd", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  featureId: text("feature_id")
    .notNull()
    .unique()
    .references(() => featureRequests.id, { onDelete: "cascade" }),
  problem: text("problem").notNull(),
  goals: text("goals").notNull(),
  nonGoals: text("non_goals").notNull(),
  userStories: text("user_stories").notNull(),
  acceptanceCriteria: text("acceptance_criteria").notNull(),
  edgeCases: text("edge_cases").notNull(),
  successMetrics: text("success_metrics").notNull(),
  technicalRequirements: text("technical_requirements").notNull().default("[]"),
  dependencies: text("dependencies").notNull().default("[]"),
  risks: text("risks").notNull().default("[]"),
  estimatedTotalHours: integer("estimated_total_hours"),
  targetDeadline: timestamp("target_deadline"),
  // Engineering disciplines this feature actually needs (subset of
  // frontend/backend/devops/ai) so task assignment only asks for relevant roles.
  requiredDisciplines: text("required_disciplines").notNull().default("[]"),
  rawMarkdown: text("raw_markdown").notNull(),
  version: integer("version").notNull().default(1),
  approvedBy: text("approved_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tasks = pgTable("task", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  prdId: text("prd_id")
    .notNull()
    .references(() => prds.id, { onDelete: "cascade" }),
  featureId: text("feature_id")
    .notNull()
    .references(() => featureRequests.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  priority: text("priority").notNull().default("p1"),
  status: text("status").notNull().default("todo"),
  // AI-estimated effort for this task (hours), including any complexity buffer.
  estimatedHours: integer("estimated_hours"),
  blockedReason: text("blocked_reason"),
  assignedTo: text("assigned_to").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pullRequests = pgTable("pull_request", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  // Nullable: we cache every PR for connected repos, even ones not tied to a feature branch
  featureId: text("feature_id").references(() => featureRequests.id, {
    onDelete: "cascade",
  }),
  repositoryId: text("repository_id").references(() => repositories.id, {
    onDelete: "set null",
  }),
  installationId: bigint("installation_id", { mode: "number" }).notNull(),
  githubPrId: bigint("github_pr_id", { mode: "number" }).notNull(),
  githubPrUrl: text("github_pr_url").notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  authorLogin: text("author_login"),
  headBranch: text("head_branch").notNull(),
  baseBranch: text("base_branch").notNull(),
  headSha: text("head_sha").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  state: text("state").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reviewCycles = pgTable("review_cycle", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  pullRequestId: text("pull_request_id")
    .notNull()
    .references(() => pullRequests.id, { onDelete: "cascade" }),
  // Nullable: we store a cycle for every reviewed PR, even ones whose branch
  // didn't match a feature. Such reviews can be linked to a feature later.
  featureId: text("feature_id").references(() => featureRequests.id, {
    onDelete: "cascade",
  }),
  // Head commit SHA this cycle reviewed — lets us skip re-reviewing a SHA that
  // was already reviewed (webhook re-deliveries, no-op pushes).
  headSha: text("head_sha"),
  cycleNumber: integer("cycle_number").notNull().default(1),
  status: text("status").notNull().default("running"),
  overallVerdict: text("overall_verdict"),
  summary: text("summary"),
  prdComplianceScore: integer("prd_compliance_score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewIssues = pgTable("review_issue", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  reviewCycleId: text("review_cycle_id")
    .notNull()
    .references(() => reviewCycles.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  suggestion: text("suggestion").notNull(),
  filePath: text("file_path"),
  lineNumber: integer("line_number"),
  assignedTo: text("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscription", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  razorpaySubscriptionId: text("razorpay_subscription_id").unique(),
  razorpayCustomerId: text("razorpay_customer_id"),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  // Included AI-review credits for the current plan (the monthly allowance).
  aiReviewCredits: integer("ai_review_credits").notNull().default(100),
  // Credits consumed in the current period; resets to 0 each billing cycle.
  aiReviewCreditsUsed: integer("ai_review_credits_used").notNull().default(0),
  // When the credit window resets (billing cycle end, or +30d for free).
  creditsResetAt: timestamp("credits_reset_at"),
  repositoryLimit: integer("repository_limit").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Idempotency ledger for inbound provider webhooks (Razorpay etc.) — keyed by
// the provider's event id so retried/duplicate deliveries are applied once.
export const processedWebhookEvents = pgTable("processed_webhook_event", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cached, AI-summarized snapshot of a connected repo so the Copilot agent has
// repo-wide context without re-reading GitHub on every request. Refreshed on
// connect and after each PR. JSON fields stored as text (like prd.* JSON cols).
export const repoContexts = pgTable("repo_context", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  repositoryId: text("repository_id")
    .notNull()
    .unique()
    .references(() => repositories.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  // Plain-English overview of what the repo is and how it's organized.
  overview: text("overview").notNull().default(""),
  // Detected tech stack (e.g. "Next.js 15 + tRPC + Drizzle").
  stack: text("stack").notNull().default(""),
  // JSON string[] of source file paths in the repo tree.
  tree: text("tree").notNull().default("[]"),
  // JSON Record<path, one-line summary> for the key files we summarized.
  summaries: text("summaries").notNull().default("{}"),
  fileCount: integer("file_count").notNull().default(0),
  // Commit sha the snapshot was built from, so we can skip redundant rebuilds.
  lastSha: text("last_sha"),
  status: text("status").notNull().default("ready"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organizationsTable = organizations;
export const organizationMembersTable = members;
export const invitationsTable = invitations;
export const projectsTable = projects;
export const repositoriesTable = repositories;
export const featureRequestsTable = featureRequests;
export const prdsTable = prds;
export const tasksTable = tasks;
export const pullRequestsTable = pullRequests;

export type SelectOrganization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type SelectProject = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type SelectFeatureRequest = typeof featureRequests.$inferSelect;
export type InsertFeatureRequest = typeof featureRequests.$inferInsert;
