import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { ServerRouter } from "@repo/trpc/server";

import { DEFAULT_API_URL, loadConfig } from "./config";

export type ReqraftClient = ReturnType<typeof createClient>;

/** Base URL precedence: --api flag → REQRAFT_API_URL → config → default. */
export function resolveApiUrl(flag?: string): string {
  return (flag ?? process.env.REQRAFT_API_URL ?? loadConfig().apiUrl ?? DEFAULT_API_URL).replace(
    /\/$/,
    "",
  );
}

/** Token precedence: REQRAFT_TOKEN env (CI) → stored config token. */
export function resolveToken(): string | undefined {
  return process.env.REQRAFT_TOKEN ?? loadConfig().token;
}

/** A fully type-safe tRPC client bound to the resolved API + bearer token. */
export function createClient(opts: { apiUrl: string; token?: string }) {
  return createTRPCClient<ServerRouter>({
    links: [
      httpBatchLink({
        url: `${opts.apiUrl}/api/trpc`,
        headers() {
          return opts.token ? { authorization: `Bearer ${opts.token}` } : {};
        },
      }),
    ],
  });
}
