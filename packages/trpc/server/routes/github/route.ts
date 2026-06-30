import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull } from "@repo/database";
import {
  featureRequests,
  githubInstallations,
  pullRequests,
  repositories,
  reviewCycles,
  subscriptions,
} from "@repo/database/schema";

import { orgProcedure, protectedProcedure, router } from "../../trpc";
import { z } from "../../schema";

// Default repo cap for an org that has no subscription row yet (free plan).
const DEFAULT_REPO_LIMIT = 1;

const repoInput = z.object({
  projectId: z.string(),
  fullName: z.string(),
  githubRepoId: z.string(),
  installationId: z.number(),
});

export const githubRouter = router({
  getInstallationStatus: protectedProcedure.query(async ({ ctx }) => {
    const [installation] = await ctx.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, ctx.session.user.id));

    return { installed: Boolean(installation), installation: installation ?? null };
  }),

  // Saves the installation after GitHub redirects back with installation_id in the URL.
  // Uses upsert so re-installs don't create duplicates.
  saveInstallation: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        accountLogin: z.string().optional(),
        accountType: z.string().optional(),
        organizationId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [installation] = await ctx.db
        .insert(githubInstallations)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.session.user.id,
          installationId: input.installationId,
          accountLogin: input.accountLogin,
          accountType: input.accountType,
          organizationId: input.organizationId ?? null,
        })
        .onConflictDoUpdate({
          target: githubInstallations.userId,
          set: {
            installationId: input.installationId,
            accountLogin: input.accountLogin,
            accountType: input.accountType,
            updatedAt: new Date(),
          },
        })
        .returning();

      return installation;
    }),

  repositories: orgProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(repositories.organizationId, ctx.org.id)];

      if (input?.projectId) {
        conditions.push(eq(repositories.projectId, input.projectId));
      }

      return ctx.db
        .select()
        .from(repositories)
        .where(and(...conditions));
    }),

  listRepos: orgProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(repositories)
        .where(
          and(
            eq(repositories.projectId, input.projectId),
            eq(repositories.organizationId, ctx.org.id),
          ),
        ),
    ),

  // Cached PRs for a connected repo, each with its latest AI review verdict.
  pullRequestsByRepo: orgProcedure
    .input(z.object({ repoFullName: z.string() }))
    .query(async ({ ctx, input }) => {
      // Ensure the repo belongs to this org before exposing its PRs.
      const [repo] = await ctx.db
        .select({ id: repositories.id })
        .from(repositories)
        .where(
          and(
            eq(repositories.fullName, input.repoFullName),
            eq(repositories.organizationId, ctx.org.id),
          ),
        );
      if (!repo) return [];

      const prs = await ctx.db
        .select()
        .from(pullRequests)
        .where(eq(pullRequests.repoFullName, input.repoFullName))
        .orderBy(desc(pullRequests.number));

      return Promise.all(
        prs.map(async (pr) => {
          const [cycle] = await ctx.db
            .select({
              status: reviewCycles.status,
              overallVerdict: reviewCycles.overallVerdict,
              prdComplianceScore: reviewCycles.prdComplianceScore,
              headSha: reviewCycles.headSha,
            })
            .from(reviewCycles)
            .where(eq(reviewCycles.pullRequestId, pr.id))
            .orderBy(desc(reviewCycles.createdAt))
            .limit(1);

          return {
            id: pr.id,
            number: pr.number,
            title: pr.title,
            url: pr.githubPrUrl,
            authorLogin: pr.authorLogin,
            headBranch: pr.headBranch,
            baseBranch: pr.baseBranch,
            state: pr.state,
            featureId: pr.featureId,
            headSha: pr.headSha,
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
            // Whether the latest review covers the PR's current commit — lets the
            // UI offer "view existing review" instead of spending a fresh one.
            reviewedCurrentCommit: cycle?.headSha != null && cycle.headSha === pr.headSha,
            review: cycle
              ? {
                  status: cycle.status,
                  overallVerdict: cycle.overallVerdict,
                  prdComplianceScore: cycle.prdComplianceScore,
                }
              : null,
          };
        }),
      );
    }),

  // Unlinked PRs (no feature) from the org's connected repos — the candidates a
  // user can attach to a feature. Scoped to a project's repos when given.
  listLinkablePullRequests: orgProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(repositories.organizationId, ctx.org.id),
        isNull(pullRequests.featureId),
      ];
      if (input?.projectId) {
        conditions.push(eq(repositories.projectId, input.projectId));
      }

      return ctx.db
        .selectDistinct({
          id: pullRequests.id,
          number: pullRequests.number,
          title: pullRequests.title,
          repoFullName: pullRequests.repoFullName,
          headBranch: pullRequests.headBranch,
          state: pullRequests.state,
          url: pullRequests.githubPrUrl,
        })
        .from(pullRequests)
        .innerJoin(repositories, eq(repositories.fullName, pullRequests.repoFullName))
        .where(and(...conditions))
        .orderBy(desc(pullRequests.number));
    }),

  // Link a cached PR to a feature directly (no branch rename). Re-points any
  // existing review cycles for the PR to the feature and rolls the latest
  // verdict up to it. Future commits on the branch keep this link.
  linkPullRequestToFeature: orgProcedure
    .input(z.object({ pullRequestId: z.string(), featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // The PR must belong to one of this org's connected repos.
      const [row] = await ctx.db
        .select({ id: pullRequests.id, repoFullName: pullRequests.repoFullName })
        .from(pullRequests)
        .innerJoin(repositories, eq(repositories.fullName, pullRequests.repoFullName))
        .where(
          and(
            eq(pullRequests.id, input.pullRequestId),
            eq(repositories.organizationId, ctx.org.id),
          ),
        );
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pull request not found" });
      }

      const [feature] = await ctx.db
        .select({ id: featureRequests.id })
        .from(featureRequests)
        .where(
          and(
            eq(featureRequests.id, input.featureId),
            eq(featureRequests.organizationId, ctx.org.id),
          ),
        );
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature not found" });
      }

      await ctx.db
        .update(pullRequests)
        .set({ featureId: input.featureId, updatedAt: new Date() })
        .where(eq(pullRequests.id, input.pullRequestId));

      // Carry the PR's review history over to the feature.
      await ctx.db
        .update(reviewCycles)
        .set({ featureId: input.featureId })
        .where(eq(reviewCycles.pullRequestId, input.pullRequestId));

      // Reflect the latest completed verdict on the feature.
      const [latest] = await ctx.db
        .select({ status: reviewCycles.status })
        .from(reviewCycles)
        .where(eq(reviewCycles.pullRequestId, input.pullRequestId))
        .orderBy(desc(reviewCycles.createdAt))
        .limit(1);

      if (latest?.status === "passed" || latest?.status === "failed") {
        await ctx.db
          .update(featureRequests)
          .set({
            status: latest.status === "passed" ? "approved" : "blocked",
            updatedAt: new Date(),
          })
          .where(eq(featureRequests.id, input.featureId));
      }

      return { linked: true };
    }),

  connectRepo: orgProcedure
    .input(
      z.object({
        projectId: z.string(),
        fullName: z.string(),
        githubRepoId: z.string(),
        installationId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // One repo → one project: reject if it's already connected anywhere in
      // this org (the user must disconnect it first to move it).
      const [existing] = await ctx.db
        .select({ id: repositories.id })
        .from(repositories)
        .where(
          and(
            eq(repositories.organizationId, ctx.org.id),
            eq(repositories.fullName, input.fullName),
          ),
        );
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This repository is already connected to a project. Disconnect it there first to move it.",
        });
      }

      // Enforce the plan's repository limit (-1 = unlimited).
      const [sub] = await ctx.db
        .select({ repositoryLimit: subscriptions.repositoryLimit })
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, ctx.org.id));
      const repoLimit = sub?.repositoryLimit ?? DEFAULT_REPO_LIMIT;

      if (repoLimit !== -1) {
        const [used] = await ctx.db
          .select({ value: count() })
          .from(repositories)
          .where(eq(repositories.organizationId, ctx.org.id));
        if ((used?.value ?? 0) >= repoLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your plan allows ${repoLimit} ${repoLimit === 1 ? "repository" : "repositories"}. Upgrade to connect more.`,
          });
        }
      }

      const [owner = "", name = input.fullName] = input.fullName.split("/");
      const [repo] = await ctx.db
        .insert(repositories)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          organizationId: ctx.org.id,
          githubRepoId: input.githubRepoId,
          fullName: input.fullName,
          name,
          owner,
          installationId: input.installationId,
        })
        .returning();

      return repo;
    }),

  disconnectRepo: orgProcedure
    .input(z.object({ repoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(repositories)
        .where(
          and(
            eq(repositories.id, input.repoId),
            eq(repositories.organizationId, ctx.org.id),
          ),
        );
    }),
});
