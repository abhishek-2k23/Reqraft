import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createContext, serverRouter } from "@repo/trpc/server";
import { auth } from "@/lib/auth";

async function handler(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: serverRouter,
    createContext: () => createContext({ request, session }),
  });
}

export { handler as GET, handler as POST };
