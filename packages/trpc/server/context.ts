import { db, type Database } from "@repo/database";
import type { PrdDocumentData } from "@repo/services/shipflow/prd-document";

import type { OrgEvent, PublishOrgEvent } from "./events";

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    activeOrganizationId?: string | null;
  };
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
} | null;

export type ClarifyInput = {
  title: string;
  description: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ClarifyResult = {
  reply: string;
  isDone: boolean;
};

export type PrdContent = {
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  acceptanceCriteria: string[];
  edgeCases: string[];
  successMetrics: string[];
  technicalRequirements: string[];
  dependencies: string[];
  risks: string[];
  estimatedTotalHours: number | null;
};

export type EditPrdResult = PrdContent & { rawMarkdown: string };

export type SendInviteInput = {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  invitationId: string;
  expiresAt: Date;
};

export type SendPrdShareInput = {
  to: string;
  recipientName: string | null;
  sharedByName: string;
  featureId: string;
  message?: string;
  // Full PRD payload; the email renders the PDF attachment from this.
  document: PrdDocumentData;
};

export type CreateContextOptions = {
  request?: Request;
  session?: AuthSession;
  emit?: (event: { name: string; data: Record<string, unknown> }) => Promise<unknown>;
  ai?: {
    clarify: (input: ClarifyInput) => Promise<ClarifyResult>;
    editPrd: (input: { currentPrd: PrdContent; editPrompt: string }) => Promise<EditPrdResult>;
  };
  sendInvite?: (input: SendInviteInput) => Promise<unknown>;
  sendPrdShare?: (input: SendPrdShareInput) => Promise<unknown>;
  publish?: PublishOrgEvent;
};

export type ContextValue = {
  db: Database;
  request?: Request;
  session: AuthSession;
  emit: (event: { name: string; data: Record<string, unknown> }) => Promise<unknown>;
  ai: {
    clarify: (input: ClarifyInput) => Promise<ClarifyResult>;
    editPrd: (input: { currentPrd: PrdContent; editPrompt: string }) => Promise<EditPrdResult>;
  };
  sendInvite: (input: SendInviteInput) => Promise<unknown>;
  sendPrdShare: (input: SendPrdShareInput) => Promise<unknown>;
  publish: PublishOrgEvent;
};

const noopEmit = async () => {};
const noopClarify = async (): Promise<ClarifyResult> => ({
  reply: "Can you describe the target users and the success metric for this feature?",
  isDone: false,
});
const noopEditPrd = async ({ currentPrd }: { currentPrd: PrdContent }): Promise<EditPrdResult> => ({
  ...currentPrd,
  estimatedTotalHours: currentPrd.estimatedTotalHours ?? null,
  rawMarkdown: "",
});
const noopSendInvite = async () => {};
const noopSendPrdShare = async () => {};
const noopPublish: PublishOrgEvent = async () => {};

export async function createContext(
  options: CreateContextOptions = {},
): Promise<ContextValue> {
  return {
    db,
    request: options.request,
    session: options.session ?? null,
    emit: options.emit ?? noopEmit,
    ai: options.ai ?? { clarify: noopClarify, editPrd: noopEditPrd },
    sendInvite: options.sendInvite ?? noopSendInvite,
    sendPrdShare: options.sendPrdShare ?? noopSendPrdShare,
    publish: options.publish ?? noopPublish,
  };
}

export type Context = ContextValue;
export type { OrgEvent };
