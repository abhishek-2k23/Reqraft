import { and, eq } from "@repo/database";
import { githubInstallations, repositories } from "@repo/database/schema";

import { orgProcedure, protectedProcedure, router } from "../../trpc";
import { z } from "../../schema";

export const githubRouter = router({
  getInstallationStatus: protectedProcedure.query(async ({ ctx }) => {
    const [installation] = await ctx.db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, ctx.session.user.id));

    return { installed: Boolean(installation), installation: installation ?? null };
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
});
