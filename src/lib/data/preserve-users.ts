import type { Snapshot, StaffUser } from "../domain/types.ts";

function sameLogin(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isTech(user: StaffUser) {
  return user.role === "tech_admin";
}

/** Re-insert technicians a replace-write dropped (onboard leftover clear, stale PUT). */
export function preserveTechAdmins(prev: Snapshot, next: Snapshot): Snapshot {
  const missing = prev.users.filter((user) => {
    if (!isTech(user)) return false;
    return !next.users.some((row) => row.id === user.id || sameLogin(row.email, user.email));
  });
  if (missing.length === 0) return next;
  return { ...next, users: [...missing.map((user) => ({ ...user })), ...next.users] };
}

/**
 * Client/API dumps blank PIN/password and may omit users created after the tab loaded.
 * Merge missing previous rows so a smaller public snapshot cannot wipe the store.
 * An empty snapshot is a reset: only technicians are kept.
 */
export function protectStoredUsers(prev: Snapshot, next: Snapshot): Snapshot {
  const withTechs = preserveTechAdmins(prev, next);
  if (withTechs.users.length === 0) return withTechs;
  const publicLike = withTechs.users.every((user) => !user.password && !user.pin);
  if (!publicLike || prev.users.length <= withTechs.users.length) return withTechs;
  const ids = new Set(withTechs.users.map((user) => user.id));
  const logins = new Set(withTechs.users.map((user) => user.email.trim().toLowerCase()));
  const missing = prev.users.filter(
    (user) => !ids.has(user.id) && !logins.has(user.email.trim().toLowerCase()),
  );
  if (missing.length === 0) return withTechs;
  return { ...withTechs, users: [...withTechs.users, ...missing] };
}
