import { TRPCError } from "@trpc/server";
import { and, count, eq } from "@repo/database";
import { invitations, members, organizations, subscriptions, usersTable } from "@repo/database/schema";
import { MEMBER_ROLES, MEMBER_SPECIALTIES, type MemberRole } from "@repo/database/schema";

import { adminProcedure, orgProcedure, publicProcedure, router } from "../../trpc";
import { z } from "../../schema";

export const memberRouter = router({
  // List all members of the active org with their user details
  list: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        memberId: members.id,
        role: members.role,
        specialty: members.specialty,
        joinedAt: members.createdAt,
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
      })
      .from(members)
      .innerJoin(usersTable, eq(members.userId, usersTable.id))
      .where(eq(members.organizationId, ctx.org.id));

    return rows;
  }),

  updateSpecialty: adminProcedure
    .input(z.object({ memberId: z.string(), specialty: z.enum(MEMBER_SPECIALTIES).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(members)
        .set({ specialty: input.specialty })
        .where(and(eq(members.id, input.memberId), eq(members.organizationId, ctx.org.id)))
        .returning();
      return updated;
    }),

  // Change a member's role — admin+ only, cannot demote another owner
  updateRole: adminProcedure
    .input(z.object({ memberId: z.string(), role: z.enum(MEMBER_ROLES) }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select()
        .from(members)
        .where(
          and(
            eq(members.id, input.memberId),
            eq(members.organizationId, ctx.org.id),
          ),
        );

      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      // Prevent demoting the only owner
      if (target.role === "owner" && input.role !== "owner") {
        const ownerCount = await ctx.db
          .select({ id: members.id })
          .from(members)
          .where(
            and(
              eq(members.organizationId, ctx.org.id),
              eq(members.role, "owner"),
            ),
          );
        if (ownerCount.length <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the only owner of the organization.",
          });
        }
      }

      const [updated] = await ctx.db
        .update(members)
        .set({ role: input.role })
        .where(eq(members.id, input.memberId))
        .returning();

      return updated;
    }),

  // Remove a member — admin+ only, cannot remove themselves if owner
  remove: adminProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select()
        .from(members)
        .where(
          and(
            eq(members.id, input.memberId),
            eq(members.organizationId, ctx.org.id),
          ),
        );

      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      if (target.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the owner of the organization.",
        });
      }

      await ctx.db.delete(members).where(eq(members.id, input.memberId));
      return { success: true };
    }),

  // Directly add a user by email — admin+ only.
  // If the email has no account yet, a stub user is created so they can be assigned tasks
  // immediately. They claim the account when they first sign in (Google/GitHub/email).
  // TODO: Replace stub creation with email-based invitation + acceptance link in production.
  directAdd: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(MEMBER_ROLES).default("developer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Block if already a member of this org
      const [alreadyMember] = await ctx.db
        .select({ id: members.id })
        .from(members)
        .innerJoin(usersTable, eq(members.userId, usersTable.id))
        .where(
          and(
            eq(members.organizationId, ctx.org.id),
            eq(usersTable.email, input.email),
          ),
        );

      if (alreadyMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already a member of the organization.",
        });
      }

      // Find existing user or create a stub account
      let userId: string;
      const [existingUser] = await ctx.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const stubId = crypto.randomUUID();
        const derivedName = input.email.split("@")[0]!
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        await ctx.db.insert(usersTable).values({
          id: stubId,
          name: derivedName,
          email: input.email,
          emailVerified: false,
        });
        userId = stubId;
      }

      const [member] = await ctx.db
        .insert(members)
        .values({ organizationId: ctx.org.id, userId, role: input.role })
        .returning();

      const [user] = await ctx.db
        .select({ name: usersTable.name, email: usersTable.email, image: usersTable.image })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      return { ...member!, ...user! };
    }),

  // Invite by email — admin+ only (premium feature with plan-based limits)
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(MEMBER_ROLES).default("developer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Enforce plan-based member limits: free=5, pro=10, higher=unlimited
      const [subscription] = await ctx.db
        .select({ plan: subscriptions.plan })
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, ctx.org.id));

      const plan = subscription?.plan ?? "free";
      const MEMBER_LIMITS: Record<string, number> = { free: 5, pro: 10 };
      const limit = MEMBER_LIMITS[plan] ?? Infinity;

      if (limit !== Infinity) {
        const countResult = await ctx.db
          .select({ memberCount: count() })
          .from(members)
          .where(eq(members.organizationId, ctx.org.id));

        const memberCount = countResult[0]?.memberCount ?? 0;

        if (memberCount >= limit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your ${plan} plan allows up to ${limit} members. Upgrade to invite more.`,
          });
        }
      }

      // Check if already a member
      const [existing] = await ctx.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .innerJoin(
          members,
          and(
            eq(members.userId, usersTable.id),
            eq(members.organizationId, ctx.org.id),
          ),
        )
        .where(eq(usersTable.email, input.email));

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already a member of the organization.",
        });
      }

      // Check for a still-pending invite to the same address
      const [pendingInvite] = await ctx.db
        .select({ id: invitations.id })
        .from(invitations)
        .where(
          and(
            eq(invitations.organizationId, ctx.org.id),
            eq(invitations.email, input.email),
            eq(invitations.status, "pending"),
          ),
        );

      if (pendingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation has already been sent to this email.",
        });
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invitation] = await ctx.db
        .insert(invitations)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.org.id,
          email: input.email,
          role: input.role,
          status: "pending",
          expiresAt,
          inviterId: ctx.session.user.id,
        })
        .returning();

      if (!invitation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Fetch org name and inviter name for the email
      const [org] = await ctx.db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, ctx.org.id));

      await ctx.sendInvite({
        to: input.email,
        inviterName: ctx.session.user.name ?? ctx.session.user.email ?? "Someone",
        orgName: org?.name ?? "your organization",
        role: input.role,
        invitationId: invitation.id,
        expiresAt,
      });

      return invitation;
    }),

  // List pending invitations for the active org
  listInvitations: orgProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, ctx.org.id),
          eq(invitations.status, "pending"),
        ),
      );
  }),

  // Cancel a pending invitation
  cancelInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(invitations)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(invitations.id, input.invitationId),
            eq(invitations.organizationId, ctx.org.id),
          ),
        );
      return { success: true };
    }),

  // Public: look up invitation details by ID — used by the /invite page before the user signs in
  getInvitation: publicProcedure
    .input(z.object({ invitationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          status: invitations.status,
          expiresAt: invitations.expiresAt,
          orgName: organizations.name,
        })
        .from(invitations)
        .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
        .where(eq(invitations.id, input.invitationId));

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found or already used." });
      if (row.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation has already been used." });
      if (row.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation has expired." });

      return row;
    }),

  // Accept an invitation — called when the invited user signs in and lands on the accept link
  acceptInvitation: orgProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [invite] = await ctx.db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, input.invitationId),
            eq(invitations.email, ctx.session.user.email ?? ""),
          ),
        );

      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      if (invite.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation is no longer valid." });
      }
      if (invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired." });
      }

      await ctx.db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, input.invitationId));

      await ctx.db
        .insert(members)
        .values({
          id: crypto.randomUUID(),
          organizationId: invite.organizationId,
          userId: ctx.session.user.id,
          role: invite.role as MemberRole,
        })
        .onConflictDoNothing();

      const [org] = await ctx.db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, invite.organizationId));

      return { orgName: org?.name ?? "your organization" };
    }),
});
