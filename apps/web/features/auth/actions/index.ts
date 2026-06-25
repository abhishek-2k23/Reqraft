"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import {
  DEFAULT_AUTH_CALLBACK,
  getSafeCallbackPath,
  SIGN_IN_PATH,
} from "../utils";

export async function signInWithGithub(formData: FormData) {
  const callback = formData.get("callbackUrl");
  const callbackURL = getSafeCallbackPath(
    typeof callback === "string" ? callback : null,
  );

  const result = await auth.api.signInSocial({
    body: {
      provider: "github",
      callbackURL,
    },
    headers: await headers(),
  });

  if (result.url) {
    redirect(result.url);
  }

  redirect(callbackURL);
}

export async function getServerSession() {
  if (process.env.SHIPFLOW_DEMO_AUTH === "true") {
    return {
      session: {
        id: "demo-session",
        userId: "demo-user",
        activeOrganizationId: "demo-org",
      },
      user: {
        id: "demo-user",
        name: "ShipFlow Demo",
        email: "demo@shipflow.ai",
        image: null,
      },
    };
  }

  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAuth(redirectTo = SIGN_IN_PATH) {
  const session = await getServerSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

export async function requireUnauth(redirectTo = DEFAULT_AUTH_CALLBACK) {
  const session = await getServerSession();

  if (session) {
    redirect(redirectTo);
  }
}
