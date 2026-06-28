import { and, count, eq } from "@repo/database";
import {
  featureRequests,
  members,
  organizations,
  subscriptions,
  tasks,
  usersTable,
} from "@repo/database/schema";

import { protectedProcedure, router } from "../../trpc";

export const profileRouter = router({
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
