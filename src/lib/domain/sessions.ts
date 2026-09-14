import { AuthzError } from "../authz/error.ts";
import { uid } from "../utils.ts";
import { hasAbsoluteAccess } from "./permissions.ts";
import type { DeviceSession, Snapshot } from "./types.ts";
import type { TenantActor } from "./tenancy.ts";

const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

export function deviceLabelFromUa(ua: string) {
  const raw = ua.trim() || "неизвестное устройство";
  if (/iPhone|iPad|iPod/i.test(raw)) return "iOS";
  if (/Android/i.test(raw)) return "Android";
  if (/Macintosh|Mac OS/i.test(raw)) return "Mac";
  if (/Windows/i.test(raw)) return "Windows";
  if (/Linux/i.test(raw)) return "Linux";
  return raw.slice(0, 48);
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const first = forwarded.split(",")[0]?.trim() ?? "";
  return first.slice(0, 64) || "unknown";
}

export function mintDeviceSession(input: { userId: string; request?: Request; at?: string }): DeviceSession {
  const at = input.at ?? new Date().toISOString();
  const ua = input.request?.headers.get("user-agent") ?? "";
  return {
    id: uid("sess"),
    userId: input.userId,
    deviceLabel: deviceLabelFromUa(ua),
    ip: input.request ? clientIp(input.request) : "unknown",
    createdAt: at,
    lastActivityAt: at,
  };
}

export function activeSessionsForUser(snap: Snapshot, userId: string): DeviceSession[] {
  return (snap.deviceSessions ?? []).filter((s) => s.userId === userId && !s.revokedAt);
}

export function assertSessionActive(snap: Snapshot, actor: TenantActor & { sessionId?: string }) {
  if (!actor.sessionId) return;
  const row = (snap.deviceSessions ?? []).find((s) => s.id === actor.sessionId);
  if (!row || row.userId !== actor.userId || row.revokedAt) {
    throw new AuthzError("Сессия отозвана", 401);
  }
}

export function touchSession(snap: Snapshot, sessionId: string | undefined, at = new Date().toISOString()): Snapshot {
  if (!sessionId) return snap;
  const rows = snap.deviceSessions ?? [];
  const row = rows.find((s) => s.id === sessionId && !s.revokedAt);
  if (!row) return snap;
  const prev = Date.parse(row.lastActivityAt);
  if (Number.isFinite(prev) && Date.parse(at) - prev < ACTIVITY_THROTTLE_MS) return snap;
  return {
    ...snap,
    deviceSessions: rows.map((s) => (s.id === sessionId ? { ...s, lastActivityAt: at } : s)),
  };
}

export function attachSession(snap: Snapshot, session: DeviceSession): Snapshot {
  const live = (snap.deviceSessions ?? []).filter((s) => s.userId !== session.userId || !s.revokedAt).slice(0, 40);
  return { ...snap, deviceSessions: [session, ...live].slice(0, 80) };
}

export function revokeSession(
  snap: Snapshot,
  actor: TenantActor,
  sessionId: string,
  at = new Date().toISOString(),
): Snapshot {
  const row = (snap.deviceSessions ?? []).find((s) => s.id === sessionId);
  if (!row) throw new AuthzError("Сессия не найдена", 404);
  const own = row.userId === actor.userId;
  const target = snap.users.find((u) => u.id === row.userId);
  const sameOwner =
    actor.role === "owner" && (target?.ownerId === actor.userId || target?.id === actor.userId);
  if (!own && !hasAbsoluteAccess(actor.role) && !sameOwner) {
    throw new AuthzError("Нельзя отозвать чужую сессию");
  }
  return {
    ...snap,
    deviceSessions: (snap.deviceSessions ?? []).map((s) =>
      s.id === sessionId ? { ...s, revokedAt: at } : s,
    ),
  };
}

export function revokeOtherSessions(
  snap: Snapshot,
  actor: TenantActor,
  keepId: string | undefined,
  at = new Date().toISOString(),
): Snapshot {
  return {
    ...snap,
    deviceSessions: (snap.deviceSessions ?? []).map((s) =>
      s.userId === actor.userId && s.id !== keepId && !s.revokedAt ? { ...s, revokedAt: at } : s,
    ),
  };
}

export function sessionsVisibleTo(snap: Snapshot, actor: TenantActor): DeviceSession[] {
  const rows = snap.deviceSessions ?? [];
  if (hasAbsoluteAccess(actor.role)) {
    if (!actor.actingOwnerId) return rows.filter((s) => !s.revokedAt || true);
    const ids = new Set(
      snap.users.filter((u) => u.id === actor.actingOwnerId || u.ownerId === actor.actingOwnerId).map((u) => u.id),
    );
    return rows.filter((s) => ids.has(s.userId));
  }
  if (actor.role === "owner") {
    const ids = new Set(
      snap.users.filter((u) => u.id === actor.userId || u.ownerId === actor.userId).map((u) => u.id),
    );
    return rows.filter((s) => ids.has(s.userId));
  }
  return rows.filter((s) => s.userId === actor.userId);
}
