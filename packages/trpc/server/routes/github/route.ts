import { TRPCError } from "@trpc/server";
import { and, count, desc, eq } from "@repo/database";
import {
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
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
            review: cycle ?? null,
          };
        }),
      );
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
