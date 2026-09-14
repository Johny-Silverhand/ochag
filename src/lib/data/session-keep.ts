import type { Session } from "../domain/types.ts";
import type { Snapshot } from "../domain/types.ts";

/**
 * A cold/empty snapshot must not log the user out. Only a loaded network that
 * no longer contains the user (real 401 / replaced staff) clears the session.
 */
export function keepStoredSession(prevSession: Session | null, incoming: Snapshot): Session | null {
  if (!prevSession) return null;
  if (incoming.users.some((u) => u.id === prevSession.userId)) return prevSession;
  if (incoming.users.length === 0) return prevSession;
  return null;
}

/** Do not replace an in-memory network with a blank load from a DB hiccup. */
export function shouldReplaceSnapshot(prev: Pick<Snapshot, "users">, incoming: Pick<Snapshot, "users">) {
  if (incoming.users.length > 0) return true;
  if (prev.users.length > 0) return false;
  return true;
}
