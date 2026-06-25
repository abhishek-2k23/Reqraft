import { TRPCError } from "@trpc/server";
import { and, eq } from "@repo/database";
import { projects } from "@repo/database/schema";

import { orgProcedure, router } from "../../trpc";
import { z } from "../../schema";

export const projectRouter = router({
  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .insert(projects)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.org.id,
          createdBy: ctx.session.user.id,
          name: input.name,
          slug: input.slug,
          description: input.description,
        })
        .returning();

      return project;
    }),

  list: orgProcedure.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, ctx.org.id)),
  ),

  getById: orgProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.organizationId, ctx.org.id),
          ),
        );

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return project;
    }),
});
