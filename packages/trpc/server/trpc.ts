import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

export const protectedProcedure = tRPCContext.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  const organizationId = ctx.session.session.activeOrganizationId;

  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Select an organization before accessing this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      org: {
        id: organizationId,
      },
      memberRole: "member" as const,
    },
  });
});
