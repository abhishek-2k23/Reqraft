import { App } from "octokit";

let app: App | null = null;

export function getGithubApp() {
  if (app) return app;
  
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!appId || !privateKey) {
    throw new Error("Missing GitHub App configuration in environment variables");
  }

  app = new App({
    appId,
    privateKey,
    webhooks: {
      secret: webhookSecret || "development",
    },
  });

  return app;
}
