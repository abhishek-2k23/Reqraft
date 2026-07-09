import { streamAgentPlan } from "@/features/agent/server/engine";
import {
  prepareAgentRun,
  rememberModel,
  type AgentRunRequest,
} from "@/features/agent/server/run";

// Long generations (full file contents) can run for many minutes.
export const maxDuration = 800;

// Separates streamed JSON text from a trailing error message. NUL can never
// occur inside JSON text, so the client can split them unambiguously. Must
// match ERROR_SENTINEL in the Agent page.
const ERROR_SENTINEL = String.fromCharCode(0);

/**
 * Streams an agent plan as the raw JSON text of the object being generated —
 * a flat HTTP stream, deliberately NOT an RSC streamable value: those chain
 * every update and blow the call stack on long runs. The client accumulates
 * the text and re-parses it as partial JSON.
 *
 * If the run fails mid-stream (provider error, schema validation), the error
 * message is appended after ERROR_SENTINEL — the client keeps whatever was
 * generated before the failure.
 */
export async function POST(req: Request) {
  let input: AgentRunRequest;
  try {
    input = (await req.json()) as AgentRunRequest;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const prep = await prepareAgentRun(input);
  if (!prep.ok) return Response.json({ error: prep.error }, { status: 400 });
  const { deps } = prep;

  // req.signal fires when the client disconnects or aborts (the Cancel button)
  // — passing it through stops the provider call instead of letting it run on.
  const result = streamAgentPlan(deps.engineInput, req.signal);
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The client may already be gone when we try to write — never let that
      // throw past the model teardown.
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          /* stream already cancelled */
        }
      };
      try {
        for await (const delta of result.textStream) {
          send(delta);
        }
        // Rejects if the finished object fails schema validation — the partial
        // text already sent stays usable on the client either way.
        await result.object;
        rememberModel(deps.keyId, input.model);
      } catch (error) {
        // An abort is the client's own doing — nothing to report. Provider
        // errors (bad key, model access, quota) surface as-is so the user can
        // fix their key/model — the message never includes the key.
        if (!req.signal.aborted) {
          const message = error instanceof Error ? error.message : "The agent run failed.";
          send(ERROR_SENTINEL + message);
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by cancellation */
        }
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
