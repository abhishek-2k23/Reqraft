import "server-only";
import { headers } from "next/headers";
import type { ServerRouter } from "@repo/trpc/client";
import { createTRPCProxyClient, httpLink } from "@repo/trpc/client";

function makeServerLink() {
  return httpLink({
    // Must be an absolute URL for server-side fetch. The relative /api/trpc only works in browsers.
    url: `http://localhost:${process.env.PORT ?? "3000"}/api/trpc`,
    headers: async () => {
      // Forward the incoming request's cookies so orgProcedure can read the session.
      const h = await headers();
      return { cookie: h.get("cookie") ?? "" };
    },
  });
}

export const api = createTRPCProxyClient<ServerRouter>({
  links: [makeServerLink()],
});

export const apiStreaming = createTRPCProxyClient<ServerRouter>({
  links: [makeServerLink()],
});
