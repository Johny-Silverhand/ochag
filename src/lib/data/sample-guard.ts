import { AuthzError } from "../authz/error.ts";
import { canLoadSample, canResetDemo, hasAbsoluteAccess } from "../domain/permissions.ts";
import type { Role, Snapshot, StaffUser } from "../domain/types.ts";
import { looksLikeSeedNetwork } from "./bootstrap.ts";
import { SEED_LOGIN_PEERS } from "./secrets.ts";

const SEED_IDS = new Set(SEED_LOGIN_PEERS.map((u) => u.id));
const SEED_LOGINS = new Set(SEED_LOGIN_PEERS.map((u) => u.email.trim().toLowerCase()));

export const SAMPLE_BLOCKED_MSG =
  "Учебные данные нельзя загрузить поверх живой сети — логины владельцев и сотрудников останутся на месте.";

export const SAMPLE_ROLE_MSG = "Учебный срез доступен только администратору-технику, на отдельном демо-контуре.";

export const RESET_BLOCKED_MSG = "Сброс живой коммерческой сети запрещён. Обратитесь к администратору-технику.";

function isSeedStaff(user: StaffUser) {
  return SEED_IDS.has(user.id) || SEED_LOGINS.has(user.email.trim().toLowerCase());
}

/** Real owner/staff rows that are not leftover seed logins. */
export function commercialStaff(snap: Snapshot): StaffUser[] {
  return snap.users.filter((u) => {
    if (u.role === "tech_admin") return false;
    return !isSeedStaff(u);
  });
}

export function looksLikeCommercialNetwork(snap: Snapshot): boolean {
  if (commercialStaff(snap).length > 0) return true;
  if (snap.settings.sampleLoaded) return false;
  return snap.users.some((u) => u.role === "owner") && !looksLikeSeedNetwork(snap);
}

export function canReplaceWithSample(snap: Snapshot, role?: Role): { ok: true } | { ok: false; reason: string } {
  if (role && !canLoadSample(role)) return { ok: false, reason: SAMPLE_ROLE_MSG };
  if (looksLikeCommercialNetwork(snap)) return { ok: false, reason: SAMPLE_BLOCKED_MSG };
  return { ok: true };
}

export function assertSampleLoadAllowed(snap: Snapshot, role?: Role) {
  const verdict = canReplaceWithSample(snap, role);
  if (!verdict.ok) throw new AuthzError(verdict.reason, 403);
}

export function canWipeNetwork(snap: Snapshot, role: Role): { ok: true } | { ok: false; reason: string } {
  if (!canResetDemo(role) && !hasAbsoluteAccess(role)) {
    return { ok: false, reason: RESET_BLOCKED_MSG };
  }
  if (looksLikeCommercialNetwork(snap) && !hasAbsoluteAccess(role)) {
    return { ok: false, reason: RESET_BLOCKED_MSG };
  }
  return { ok: true };
}

export function assertResetAllowed(snap: Snapshot, role: Role) {
  const verdict = canWipeNetwork(snap, role);
  if (!verdict.ok) throw new AuthzError(verdict.reason, 403);
}
