import { NextResponse } from "next/server";

import { parseGitHubInstallationCallback } from "@/features/github/server/installation";

export function GET(request: Request) {
  const url = new URL(request.url);
  const callback = parseGitHubInstallationCallback(url.searchParams);
  const redirectUrl = new URL("/github", request.url);

  if (callback) {
    redirectUrl.searchParams.set("installationId", callback.installationId);

    if (callback.setupAction) {
      redirectUrl.searchParams.set("setupAction", callback.setupAction);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
