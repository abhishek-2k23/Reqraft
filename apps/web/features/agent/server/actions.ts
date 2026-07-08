"use server";

import { and, db, eq } from "@repo/database";
import {
  AGENT_PROVIDERS,
  agentProviderKeys,
  featureRequests,
  prds,
  repositories,
  tasks,
  type AgentProvider,
} from "@repo/database/schema";

import { requireAuth } from "@/features/auth/session";
import { buildRepoContext, getRepoContext } from "@/features/copilot/server/repo-context";
import { commitFilesAndOpenPr } from "@/features/github/server/create-pr";

import { decryptSecret, encryptSecret } from "./crypto";
import { generateAgentPlan, type AgentPlan, type AgentTaskContext } from "./engine";

type ActionError = { ok: false; error: string };

// Resolve the caller's active org. Every Agent action is org-scoped.
async function requireOrg(): Promise<{ ok: true; organizationId: string; userId: string } | ActionError> {
  const session = await requireAuth();
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) return { ok: false, error: "Select an organization first." };
  return { ok: true, organizationId, userId: session.user.id };
}

function isProvider(value: string): value is AgentProvider {
  return (AGENT_PROVIDERS as readonly string[]).includes(value);
}

/**
 * The org's saved provider keys — hint only. The plaintext key is never
 * returned by any action; it exists in memory only for the duration of a run.
 */
export async function listAgentKeysAction() {
  const auth = await requireOrg();
  if (!auth.ok) return [];
  const rows = await db
    .select({
      provider: agentProviderKeys.provider,
      keyHint: agentProviderKeys.keyHint,
      defaultModel: agentProviderKeys.defaultModel,
      updatedAt: agentProviderKeys.updatedAt,
    })
    .from(agentProviderKeys)
    .where(eq(agentProviderKeys.organizationId, auth.organizationId));
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

export async function saveAgentKeyAction(input: {
  provider: string;
  apiKey: string;
  defaultModel?: string | null;
}) {
  const auth = await requireOrg();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  if (!isProvider(input.provider)) return { ok: false as const, error: "Unknown provider." };

  const apiKey = input.apiKey.trim();
  if (apiKey.length < 8) return { ok: false as const, error: "That doesn't look like a valid API key." };

  const now = new Date();
  const values = {
    encryptedKey: encryptSecret(apiKey),
    keyHint: apiKey.slice(-4),
    defaultModel: input.defaultModel ?? null,
    createdBy: auth.userId,
    updatedAt: now,
  };

  await db
    .insert(agentProviderKeys)
    .values({
      id: crypto.randomUUID(),
      organizationId: auth.organizationId,
      provider: input.provider,
      ...values,
    })
    .onConflictDoUpdate({
      target: [agentProviderKeys.organizationId, agentProviderKeys.provider],
      set: values,
    });

  return { ok: true as const, keyHint: values.keyHint };
}

export async function deleteAgentKeyAction(input: { provider: string }) {
  const auth = await requireOrg();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  await db
    .delete(agentProviderKeys)
    .where(
      and(
        eq(agentProviderKeys.organizationId, auth.organizationId),
        eq(agentProviderKeys.provider, input.provider),
      ),
    );
  return { ok: true as const };
}

/**
 * Run the BYOK coding agent: load the encrypted key, decrypt it for this one
 * request, gather repo context + PRD + selected tasks, and generate an
 * implementation plan (with full file contents and a PR title/description).
 */
export async function runAgentAction(input: {
  repositoryId: string;
  provider: string;
  model: string;
  prompt: string;
  featureId?: string | null;
  taskIds?: string[] | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ ok: true; plan: AgentPlan } | ActionError> {
  const auth = await requireOrg();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!isProvider(input.provider)) return { ok: false, error: "Unknown provider." };
  if (!input.prompt.trim()) return { ok: false, error: "Describe what you want the agent to build." };

  // The repo must belong to the caller's org.
  const [repo] = await db
    .select()
    .from(repositories)
    .where(
      and(
        eq(repositories.id, input.repositoryId),
        eq(repositories.organizationId, auth.organizationId),
      ),
    );
  if (!repo) return { ok: false, error: "Repository not found in this organization." };

  const [keyRow] = await db
    .select()
    .from(agentProviderKeys)
    .where(
      and(
        eq(agentProviderKeys.organizationId, auth.organizationId),
        eq(agentProviderKeys.provider, input.provider),
      ),
    );
  if (!keyRow) {
    return { ok: false, error: "No API key saved for this provider yet. Add one in Agent settings." };
  }

  // Ensure the repo context exists — build it on first use so the agent always
  // has the codebase map to reason over.
  if (!(await getRepoContext(input.repositoryId))) {
    try {
      await buildRepoContext(input.repositoryId);
    } catch {
      return {
        ok: false,
        error: "Couldn't analyze the repository. Open its GitHub dashboard and generate the AI summary, then retry.",
      };
    }
  }

  // PRD + tasks give the agent the "code from the PRD, task-wise" grounding.
  let prd: { problem: string; acceptanceCriteria: string[] } | null = null;
  let taskContext: AgentTaskContext[] | null = null;

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
      const [prdRow] = await db.select().from(prds).where(eq(prds.featureId, input.featureId));
      if (prdRow) {
        try {
          prd = {
            problem: prdRow.problem,
            acceptanceCriteria: JSON.parse(prdRow.acceptanceCriteria) as string[],
          };
        } catch {
          prd = { problem: prdRow.problem, acceptanceCriteria: [] };
        }
      }

      const allTasks = await db.select().from(tasks).where(eq(tasks.featureId, input.featureId));
      const selected = input.taskIds?.length
        ? allTasks.filter((t) => input.taskIds!.includes(t.id))
        : allTasks;
      taskContext = selected.map((t) => ({
        title: t.title,
        description: t.description,
        type: t.type,
        status: t.status,
      }));
    }
  }

  try {
    const plan = await generateAgentPlan({
      repositoryId: input.repositoryId,
      provider: input.provider,
      modelId: input.model,
      apiKey: decryptSecret(keyRow.encryptedKey),
      prompt: input.prompt,
      prd,
      tasks: taskContext,
      history: input.history,
    });

    // Remember the last-used model so the picker defaults to it next time.
    void db
      .update(agentProviderKeys)
      .set({ defaultModel: input.model, updatedAt: new Date() })
      .where(eq(agentProviderKeys.id, keyRow.id))
      .catch(() => {});

    return { ok: true, plan };
  } catch (error) {
    // Provider errors (bad key, model access, quota) surface as-is so the user
    // can fix their key/model — the message never includes the key itself.
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The agent run failed.",
    };
  }
}

/** Open the PR for an agent-generated change set. */
export async function raiseAgentPrAction(input: {
  repositoryId: string;
  title: string;
  body: string;
  files: Array<{ path: string; content: string }>;
  draft?: boolean;
}) {
  const auth = await requireOrg();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const [repo] = await db
    .select()
    .from(repositories)
    .where(
      and(
        eq(repositories.id, input.repositoryId),
        eq(repositories.organizationId, auth.organizationId),
      ),
    );
  if (!repo) return { ok: false as const, error: "Repository not found in this organization." };
  if (!repo.installationId) {
    return { ok: false as const, error: "Repository has no GitHub installation." };
  }
  if (!input.title.trim()) return { ok: false as const, error: "Give the PR a title." };
  if (input.files.length === 0) return { ok: false as const, error: "No files to commit." };

  try {
    const pr = await commitFilesAndOpenPr({
      installationId: repo.installationId,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      branchPrefix: "reqraft-agent",
      title: input.title.trim(),
      body: `${input.body}\n\n— Generated by Reqraft Agent 🤖`,
      commitMessage: `${input.title.trim()}\n\nGenerated by Reqraft Agent.`,
      files: input.files,
      draft: input.draft ?? false,
    });
    return { ok: true as const, prUrl: pr.prUrl, prNumber: pr.prNumber, branch: pr.branchName };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to open the pull request.",
    };
  }
}
