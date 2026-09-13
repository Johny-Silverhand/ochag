import { uid } from "../utils";
import type { AuditEntry, Snapshot } from "./types";
import type { Actor } from "../authz/actor";

export function appendAudit(
  snap: Snapshot,
  actor: Actor,
  action: string,
  entity: string,
  detail: string,
  branchId?: string,
): Snapshot {
  const row: AuditEntry = {
    id: uid("aud"),
    at: new Date().toISOString(),
    userId: actor.userId,
    action,
    entity,
    branchId,
    detail,
  };
  return { ...snap, audit: [row, ...snap.audit].slice(0, 2000) };
}
