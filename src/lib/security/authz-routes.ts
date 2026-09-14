import { AuthzError } from "../authz/error.ts";
import { canSeeDebts, canSeeOpsLog, hasAbsoluteAccess } from "../domain/permissions.ts";
import type { Role } from "../domain/types.ts";
import { canSwitchOwner } from "../domain/tenancy.ts";

/** Server-side AuthZ for sensitive routes. Never rely on the client hiding a page. */
export function assertApiAuthz(method: string, path: string, actor: { role: Role }) {
  const m = method.toUpperCase();
  if (path === "owners" || (m === "POST" && path === "session/owner")) {
    if (!canSwitchOwner(actor.role)) {
      throw new AuthzError("Список владельцев только для администратора-техника");
    }
  }
  if (path === "debts/ledger" || path.startsWith("debts/ledger/")) {
    if (!canSeeDebts(actor.role)) {
      throw new AuthzError("Учёт долгов доступен только владельцу");
    }
  }
  if (path === "state/reset") {
    if (!hasAbsoluteAccess(actor.role)) throw new AuthzError("Сброс недоступен");
  }
  if (path === "state/sample") {
    if (!hasAbsoluteAccess(actor.role)) {
      throw new AuthzError("Учебный срез доступен только администратору-технику");
    }
  }
}

export function assertCanSeeOpsLog(role: Role) {
  if (!canSeeOpsLog(role)) throw new AuthzError("Консоль доступна только администратору-технику");
}

const PRIVILEGED_WRITES = new Set([
  "state/reset",
  "state/sample",
  "staff/invite",
  "staff/update",
  "staff/delete",
  "settings/network",
  "branches",
  "branches/update",
  "branches/delete",
  "session/owner",
  "debts/ledger",
  "debts/ledger/pay",
  "debts/ledger/update",
]);

export function isPrivilegedWrite(path: string) {
  return PRIVILEGED_WRITES.has(path);
}
