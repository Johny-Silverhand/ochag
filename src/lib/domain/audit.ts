import { uid } from "../utils.ts";
import type { AuditEntry, Snapshot } from "./types.ts";
import type { Actor } from "../authz/actor.ts";

export {
  AUDIT_ACTION_LABEL,
  auditActionLabel,
  auditGroup,
  scopedAudit,
  type AuditGroup,
} from "./audit-labels.ts";

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
  return { ...snap, audit: [row, ...(snap.audit ?? [])].slice(0, 2000) };
}
