"use client";

import { useSyncExternalStore } from "react";
import { parsePartialJson } from "ai";
import { toast } from "sonner";

import type { AgentPlan, PartialAgentPlan } from "../plan-schema";

/**
 * Module-level chat store for the Agent page. Lives OUTSIDE React on purpose:
 * a run keeps streaming while the user navigates to other tabs/pages (the page
 * component unmounts, the store doesn't), and conversations are persisted to
 * localStorage so nothing is lost on route changes or reloads.
 */

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      plan: AgentPlan;
      /** The feature this run implemented — drives the PR's branch name. */
      featureId?: string | null;
      /** True when the user stopped the run — the plan is a partial result. */
      cancelled?: boolean;
      prUrl?: string;
      prNumber?: number;
      prBranch?: string;
      prDraft?: boolean;
    };

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

export type AgentChatState = {
  /** Newest-first. */
  sessions: ChatSession[];
  /** null = a fresh, not-yet-persisted chat. */
  activeId: string | null;
  /** The in-flight run, if any — at most one at a time, on any session. */
  run: { sessionId: string; livePlan: PartialAgentPlan } | null;
};

export type AgentRunPayload = {
  repositoryId: string;
  provider: string;
  model: string;
  prompt: string;
  featureId: string | null;
  taskIds: string[] | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

const STORAGE_KEY = "reqraft.agent.chats.v1";
const EMPTY: AgentChatState = { sessions: [], activeId: null, run: null };

// Must match ERROR_SENTINEL in app/api/agent/stream/route.ts — separates the
// streamed JSON text from a trailing error message.
const ERROR_SENTINEL = String.fromCharCode(0);

const uid = () => Math.random().toString(36).slice(2);

let state: AgentChatState | null = null;
let abortController: AbortController | null = null;
const listeners = new Set<() => void>();

function load(): AgentChatState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw) as Pick<AgentChatState, "sessions" | "activeId">;
    return { sessions: saved.sessions ?? [], activeId: saved.activeId ?? null, run: null };
  } catch {
    return EMPTY;
  }
}

function persist(next: AgentChatState) {
  const save = (sessions: ChatSession[]) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, activeId: next.activeId }));
  try {
    save(next.sessions);
  } catch {
    // Quota exceeded (file contents can be large) — drop the oldest half of
    // the history and retry once; losing old chats beats losing the new one.
    try {
      save(next.sessions.slice(0, Math.max(1, Math.floor(next.sessions.length / 2))));
    } catch {
      /* storage unavailable — chats stay in-memory for this session */
    }
  }
}

function setState(next: AgentChatState, options?: { skipPersist?: boolean }) {
  state = next;
  if (!options?.skipPersist) persist(next);
  for (const listener of listeners) listener();
}

function getSnapshot(): AgentChatState {
  if (state === null) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React binding — re-renders on any chat/run change. */
export function useAgentChat(): AgentChatState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// Fill in whatever the stream didn't finish, so a partial run is still a
// readable (and, if it has files, raisable) message — used on success, on
// cancel, and to keep the generated content visible when a run errors out.
function normalizePlan(p: PartialAgentPlan): AgentPlan {
  return {
    title: p.title ?? "Untitled change",
    summary: p.summary ?? "",
    questions: (p.questions ?? []).filter((q): q is string => Boolean(q)),
    plan: (p.plan ?? []).filter((s): s is string => Boolean(s)),
    files: (p.files ?? []).flatMap((f) =>
      f?.path
        ? [
            {
              path: f.path,
              action: f.action === "modify" ? ("modify" as const) : ("create" as const),
              content: f.content ?? "",
              rationale: f.rationale ?? "",
            },
          ]
        : [],
    ),
    prDescription: p.prDescription ?? "",
    notes: p.notes ?? "",
  };
}

const planHasContent = (p: AgentPlan) =>
  Boolean(p.summary.trim() || p.questions.length > 0 || p.plan.length > 0 || p.files.length > 0);

function touchSession(sessions: ChatSession[], sessionId: string, mutate: (s: ChatSession) => ChatSession) {
  const updated = sessions.map((s) => (s.id === sessionId ? { ...mutate(s), updatedAt: Date.now() } : s));
  // Keep newest-activity-first ordering for the history list.
  return [...updated].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const agentChatStore = {
  /** Start a fresh chat (persisted only once the first message is sent). */
  newChat() {
    const s = getSnapshot();
    if (s.run && s.activeId === null) return; // nothing to reset
    setState({ ...s, activeId: null });
  },

  selectChat(id: string) {
    const s = getSnapshot();
    if (s.sessions.some((session) => session.id === id)) setState({ ...s, activeId: id });
  },

  deleteChat(id: string) {
    const s = getSnapshot();
    if (s.run?.sessionId === id) {
      toast.error("That chat has a generation running — stop it first.");
      return;
    }
    setState({
      ...s,
      sessions: s.sessions.filter((session) => session.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    });
  },

  /** Attach the raised PR to its message so the card flips to "Open #N". */
  markMessagePr(
    sessionId: string,
    messageId: string,
    pr: { prUrl: string; prNumber: number; prBranch: string; prDraft: boolean },
  ) {
    const s = getSnapshot();
    setState({
      ...s,
      sessions: touchSession(s.sessions, sessionId, (session) => ({
        ...session,
        messages: session.messages.map((m) =>
          m.id === messageId && m.role === "assistant" ? { ...m, ...pr } : m,
        ),
      })),
    });
  },

  /** Stop the in-flight run; whatever streamed so far is kept as a message. */
  cancelRun() {
    abortController?.abort();
  },

  /**
   * Send a message and stream the reply. Creates the session if `sessionId`
   * is null. The whole run lives in this module — navigating away from the
   * Agent page does not interrupt it. Returns false if a run is already
   * in flight (one at a time).
   */
  startRun(sessionId: string | null, payload: AgentRunPayload): boolean {
    let s = getSnapshot();
    if (s.run) {
      toast.error("A generation is already running — stop it or wait for it to finish.");
      return false;
    }

    // Create the session on first message; title = the prompt.
    let targetId = sessionId;
    if (!targetId || !s.sessions.some((session) => session.id === targetId)) {
      targetId = uid();
      const now = Date.now();
      const session: ChatSession = {
        id: targetId,
        title: payload.prompt.slice(0, 60),
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      s = { ...s, sessions: [session, ...s.sessions], activeId: targetId };
    }

    const runSessionId = targetId;
    setState({
      ...s,
      sessions: touchSession(s.sessions, runSessionId, (session) => ({
        ...session,
        messages: [...session.messages, { id: uid(), role: "user", content: payload.prompt }],
      })),
      run: { sessionId: runSessionId, livePlan: {} },
    });

    abortController = new AbortController();
    void runStream(runSessionId, payload, abortController.signal);
    return true;
  },
};

async function runStream(sessionId: string, payload: AgentRunPayload, signal: AbortSignal) {
  let latest: PartialAgentPlan = {};
  let errorText: string | null = null;
  let cancelled = false;

  const finish = () => {
    const s = getSnapshot();
    const plan = normalizePlan(latest);
    // Keep whatever was generated — a failed or cancelled run must never wipe
    // the output. The session may have been deleted meanwhile; then drop it.
    const sessions = planHasContent(plan)
      ? touchSession(s.sessions, sessionId, (session) => ({
          ...session,
          messages: [
            ...session.messages,
            {
              id: uid(),
              role: "assistant" as const,
              plan,
              featureId: payload.featureId,
              ...(cancelled ? { cancelled: true } : {}),
            },
          ],
        }))
      : s.sessions;
    setState({ ...s, sessions, run: null });
    abortController = null;
    if (cancelled) toast.info("Generation stopped — kept what was written so far.");
    else if (errorText?.trim()) toast.error(errorText.trim());
  };

  let response: Response;
  try {
    response = await fetch("/api/agent/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    cancelled = signal.aborted;
    if (!cancelled) errorText = "Network error — couldn't reach the agent.";
    finish();
    return;
  }

  if (!response.ok || !response.body) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null;
    errorText = err?.error ?? "The agent run failed.";
    finish();
    return;
  }

  // Accumulate the streamed JSON text and re-parse it into a partial plan
  // (throttled — parsing a large half-written object on every network chunk
  // is wasted work). Anything after the NUL sentinel is an error message.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let jsonText = "";
  let lastParsedAt = 0;

  const parseLatest = async (force: boolean) => {
    const now = Date.now();
    if (!force && now - lastParsedAt < 150) return;
    lastParsedAt = now;
    const { value } = await parsePartialJson(jsonText);
    if (value && typeof value === "object") {
      latest = value as PartialAgentPlan;
      const s = getSnapshot();
      if (s.run?.sessionId === sessionId) {
        setState({ ...s, run: { sessionId, livePlan: latest } }, { skipPersist: true });
      }
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const sentinelIdx = chunk.indexOf(ERROR_SENTINEL);
      if (sentinelIdx >= 0) {
        jsonText += chunk.slice(0, sentinelIdx);
        errorText = chunk.slice(sentinelIdx + 1);
      } else if (errorText !== null) {
        errorText += chunk;
      } else {
        jsonText += chunk;
      }
      await parseLatest(false);
    }
    await parseLatest(true);
  } catch {
    cancelled = signal.aborted;
    if (!cancelled) errorText = errorText ?? "The connection dropped mid-run.";
    try {
      await parseLatest(true);
    } catch {
      /* keep whatever parsed last */
    }
  }

  finish();
}
