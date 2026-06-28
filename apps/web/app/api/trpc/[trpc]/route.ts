import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createContext, serverRouter } from "@repo/trpc/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/features/inngest/client";
import { runClarificationAgent } from "@/features/ai/clarification-agent";
import { editPrdWithAI } from "@/features/ai/prd-generator";

async function handler(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: serverRouter,
    createContext: () =>
      createContext({
        request,
        session,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emit: (event) => inngest.send(event as any),
        ai: { clarify: runClarificationAgent, editPrd: editPrdWithAI },
      }),
  });
}

export { handler as GET, handler as POST };
