import { db, type Database } from "@repo/database";

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

export type CreateContextOptions = {
  request?: Request;
  session?: AuthSession;
};

export type ContextValue = {
  db: Database;
  request?: Request;
  session: AuthSession;
};

export async function createContext(
  options: CreateContextOptions = {},
): Promise<ContextValue> {
  return {
    db,
    request: options.request,
    session: options.session ?? null,
  };
}

export type Context = ContextValue;
