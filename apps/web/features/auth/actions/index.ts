"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db, eq } from "@repo/database";
import {
  members,
  organizations,
  sessionsTable,
  usersTable,
} from "@repo/database/schema";
import { auth } from "@/lib/auth";

import {
  DEFAULT_AUTH_CALLBACK,
  getSafeCallbackPath,
  SIGN_IN_PATH,
} from "../utils";

async function signInSocial(provider: "github" | "google", formData: FormData) {
  const callback = formData.get("callbackUrl");
  const callbackURL = getSafeCallbackPath(
    typeof callback === "string" ? callback : null,
  );
  const result = await auth.api.signInSocial({
    body: { provider, callbackURL },
    headers: await headers(),
  });
  if (result.url) redirect(result.url);
  redirect(callbackURL);
}

export async function signInWithGithub(formData: FormData) {
  return signInSocial("github", formData);
}

export async function signInWithGoogle(formData: FormData) {
  return signInSocial("google", formData);
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect(SIGN_IN_PATH);
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callback = formData.get("callbackUrl");
  const callbackURL = getSafeCallbackPath(
    typeof callback === "string" ? callback : null,
  );

  await auth.api.signInEmail({
    body: { email, password },
    headers: await headers(),
  });

  redirect(callbackURL);
}

const DEMO_EMAIL = "demo@shipflow.ai";
const DEMO_PASSWORD = "Demo@ShipFlow2024!";
const DEMO_NAME = "Reqraft Demo";

export async function signInWithDemo() {
  const h = await headers();

  // Ensure demo account exists — silently ignore "already exists"
  try {
    await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME },
      headers: h,
    });
  } catch {
    // Account already exists — proceed to sign in
  }

  await auth.api.signInEmail({
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    headers: h,
  });

  // Ensure the demo user has an org with owner role and an active session pointing to it
  const [demoUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, DEMO_EMAIL));

  if (demoUser) {
    const [existingMember] = await db
      .select({ organizationId: members.organizationId })
      .from(members)
      .where(eq(members.userId, demoUser.id));

    let orgId: string;

    if (existingMember) {
      orgId = existingMember.organizationId;
    } else {
      const orgSlug = `demo-org-${demoUser.id.slice(0, 8)}`;
      const [org] = await db
        .insert(organizations)
        .values({ name: "Demo Organization", slug: orgSlug })
        .returning({ id: organizations.id });

      orgId = org!.id;

      await db.insert(members).values({
        organizationId: orgId,
        userId: demoUser.id,
        role: "owner",
      });
    }

    // Stamp every session for this user with the active org so orgProcedure passes
    await db
      .update(sessionsTable)
      .set({ activeOrganizationId: orgId })
      .where(eq(sessionsTable.userId, demoUser.id));
  }

  redirect(DEFAULT_AUTH_CALLBACK);
}
