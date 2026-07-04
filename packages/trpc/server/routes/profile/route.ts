import { randomInt, randomUUID } from "node:crypto";

import { and, count, eq } from "@repo/database";
import {
  featureRequests,
  members,
  organizations,
  subscriptions,
  tasks,
  usersTable,
  verificationsTable,
} from "@repo/database/schema";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../../trpc";
import { z } from "../../schema";
import { enforceRateLimit } from "../../rate-limit";

const VERIFY_CODE_TTL_MINUTES = 10;

function verificationIdentifier(userId: string) {
  return `email-verify:${userId}`;
}

export const profileRouter = router({
  // Current user's email + verification state, read fresh from the DB so the
  // UI updates immediately after a successful verification.
  emailStatus: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({ email: usersTable.email, emailVerified: usersTable.emailVerified })
      .from(usersTable)
      .where(eq(usersTable.id, ctx.session.user.id));

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return user;
  }),

  // Email a 6-digit code the user can enter to prove they own their address.
  // GitHub sign-ins often land with an unverified (or noreply) email, and we
  // refuse to send PRDs to unverified addresses — this is the way out.
  sendEmailVerificationCode: protectedProcedure.mutation(async ({ ctx }) => {
    enforceRateLimit({
      key: `email-verify-send:${ctx.session.user.id}`,
      limit: 5,
      windowMs: 10 * 60_000,
      message: "Too many verification emails — please wait a few minutes and try again.",
    });

    const [user] = await ctx.db
      .select({ name: usersTable.name, email: usersTable.email, emailVerified: usersTable.emailVerified })
      .from(usersTable)
      .where(eq(usersTable.id, ctx.session.user.id));

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    if (user.emailVerified) return { alreadyVerified: true, email: user.email };
    if (!user.email.includes("@") || user.email.endsWith("@users.noreply.github.com")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Your account has no reachable email address. Make your email public on GitHub or sign in with another method, then try again.",
      });
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const identifier = verificationIdentifier(ctx.session.user.id);

    // One live code per user — a resend invalidates the previous code.
    await ctx.db.delete(verificationsTable).where(eq(verificationsTable.identifier, identifier));
    await ctx.db.insert(verificationsTable).values({
      id: randomUUID(),
      identifier,
      value: JSON.stringify({ code, email: user.email }),
      expiresAt: new Date(Date.now() + VERIFY_CODE_TTL_MINUTES * 60_000),
    });

    await ctx.sendVerificationCode({
      to: user.email,
      name: user.name,
      code,
      expiresInMinutes: VERIFY_CODE_TTL_MINUTES,
    });

    return { alreadyVerified: false, email: user.email };
  }),

  // Check the 6-digit code and mark the account's email as verified.
  verifyEmailCode: protectedProcedure
    .input(z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit({
        key: `email-verify-check:${ctx.session.user.id}`,
        limit: 10,
        windowMs: 10 * 60_000,
        message: "Too many attempts — please wait a few minutes and try again.",
      });

      const identifier = verificationIdentifier(ctx.session.user.id);
      const [record] = await ctx.db
        .select()
        .from(verificationsTable)
        .where(eq(verificationsTable.identifier, identifier));

      if (!record || record.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This code has expired. Request a new one and try again.",
        });
      }

      let stored: { code?: string; email?: string } = {};
      try {
        stored = JSON.parse(record.value) as { code?: string; email?: string };
      } catch {
        // Corrupt record — treat as expired below.
      }

      const [user] = await ctx.db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, ctx.session.user.id));

      if (!stored.code || !user || stored.email !== user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This code is no longer valid. Request a new one and try again.",
        });
      }

      if (stored.code !== input.code) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That code doesn't match. Double-check the email and try again.",
        });
      }

      await ctx.db
        .update(usersTable)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(usersTable.id, ctx.session.user.id));
      await ctx.db.delete(verificationsTable).where(eq(verificationsTable.identifier, identifier));

      return { verified: true };
    }),

  // All organizations the current user belongs to, with their role + plan
  memberships: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        role: members.role,
        plan: subscriptions.plan,
      })
      .from(members)
      .innerJoin(organizations, eq(organizations.id, members.organizationId))
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .where(eq(members.userId, ctx.session.user.id));

    // Attach member count for each org
    const withCounts = await Promise.all(
      rows.map(async (row) => {
        const countResult = await ctx.db
          .select({ memberCount: count() })
          .from(members)
          .where(eq(members.organizationId, row.orgId));
        const memberCount = countResult[0]?.memberCount ?? 0;
        return { ...row, plan: row.plan ?? "free", memberCount };
      }),
    );

    return withCounts;
  }),

  // All tasks assigned to the current user across all orgs
  myTasks: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        type: tasks.type,
        featureTitle: featureRequests.title,
        orgName: organizations.name,
        featureId: tasks.featureId,
        organizationId: featureRequests.organizationId,
      })
      .from(tasks)
      .innerJoin(featureRequests, eq(featureRequests.id, tasks.featureId))
      .innerJoin(organizations, eq(organizations.id, featureRequests.organizationId))
      .where(eq(tasks.assignedTo, ctx.session.user.id))
      .limit(20);

    return rows;
  }),
});
