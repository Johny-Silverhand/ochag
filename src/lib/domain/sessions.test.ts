import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { emptySnapshot } from "../data/empty.ts";
import { applyOnboard } from "./onboard.ts";
import { assignOwnerIds } from "./tenancy.ts";
import {
  ACTIVITY_THROTTLE_MS,
  attachSession,
  assertSessionActive,
  clientIp,
  mintDeviceSession,
  revokeOtherSessions,
  revokeSession,
  sessionListRows,
  touchSession,
} from "./sessions.ts";

function onboarded() {
  return assignOwnerIds(
    applyOnboard(emptySnapshot(), {
      ownerName: "Мария",
      login: "maria",
      password: "cafe",
      pin: "2002",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    }),
  );
}

describe("device sessions", () => {
  it("keeps two concurrent sessions valid; revoke one leaves the other", () => {
    const snap = onboarded();
    const owner = snap.users.find((u) => u.role === "owner")!;
    const reqA = new Request("https://ochag.example/api/v1/auth/login", {
      headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)", "x-forwarded-for": "203.0.113.10" },
    });
    const reqB = new Request("https://ochag.example/api/v1/auth/login", {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", "x-forwarded-for": "198.51.100.20" },
    });
    const a = mintDeviceSession({ userId: owner.id, request: reqA, at: "2026-09-01T10:00:00.000Z" });
    const b = mintDeviceSession({ userId: owner.id, request: reqB, at: "2026-09-01T11:00:00.000Z" });
    let live = attachSession(attachSession(snap, a), b);
    assert.equal((live.deviceSessions ?? []).filter((s) => s.userId === owner.id && !s.revokedAt).length, 2);
    const actor = {
      userId: owner.id,
      role: "owner" as const,
      homeBranchId: owner.branchId,
      sessionBranchId: "all",
    };
    live = revokeSession(live, actor, a.id, "2026-09-01T12:00:00.000Z");
    assert.throws(() => assertSessionActive(live, { ...actor, sessionId: a.id }), AuthzError);
    assert.doesNotThrow(() => assertSessionActive(live, { ...actor, sessionId: b.id }));
    const listed = sessionListRows(live, { ...actor, sessionId: b.id });
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.id, b.id);
    assert.equal(listed[0]?.ip, "198.51.100.20");
    assert.equal(listed[0]?.createdAt, "2026-09-01T11:00:00.000Z");
    assert.equal(listed[0]?.lastActivityAt, "2026-09-01T11:00:00.000Z");
    assert.match(listed[0]?.deviceLabel ?? "", /Windows|Chrome/);
  });

  it("rejects a token with no session id so revoke cannot be skipped", () => {
    const snap = onboarded();
    const owner = snap.users.find((u) => u.role === "owner")!;
    assert.throws(
      () =>
        assertSessionActive(snap, {
          userId: owner.id,
          role: "owner",
          homeBranchId: owner.branchId,
          sessionBranchId: "all",
        }),
      AuthzError,
    );
  });

  it("lets an owner see staff sessions and a tech in that contour revoke them", () => {
    let live = onboarded();
    const owner = live.users.find((u) => u.role === "owner")!;
    live = {
      ...live,
      users: [
        ...live.users,
        {
          id: "u-mgr",
          name: "Анна",
          email: "anna",
          password: "hall",
          pin: "3003",
          role: "manager",
          position: "Управляющий",
          branchId: live.branches[0]!.id,
          ownerId: owner.id,
          shiftPay: 0,
          salesPercent: 0,
          phone: "",
        },
      ],
    };
    const ownerSess = mintDeviceSession({ userId: owner.id, at: "2026-09-01T10:00:00.000Z" });
    const mgrSess = mintDeviceSession({
      userId: "u-mgr",
      request: new Request("https://ochag.example/", { headers: { "x-forwarded-for": "203.0.113.77" } }),
      at: "2026-09-01T10:30:00.000Z",
    });
    live = attachSession(attachSession(live, ownerSess), mgrSess);
    const ownerActor = {
      userId: owner.id,
      role: "owner" as const,
      homeBranchId: owner.branchId,
      sessionBranchId: "all",
      sessionId: ownerSess.id,
    };
    const ownerList = sessionListRows(live, ownerActor);
    assert.equal(ownerList.length, 2);
    assert.ok(ownerList.some((r) => r.userName === "Анна" && r.ip === "203.0.113.77"));

    const techActor = {
      userId: "u-tech",
      role: "tech_admin" as const,
      homeBranchId: null,
      sessionBranchId: "all",
      actingOwnerId: owner.id,
    };
    assert.equal(sessionListRows(live, techActor).length, 2);
    live = revokeSession(live, techActor, mgrSess.id, "2026-09-01T12:00:00.000Z");
    assert.throws(() => assertSessionActive(live, { ...techActor, userId: "u-mgr", sessionId: mgrSess.id }), AuthzError);
    assert.doesNotThrow(() => assertSessionActive(live, ownerActor));
  });

  it("throttles lastActivity writes and revoke-others keeps the current device", () => {
    const snap = onboarded();
    const owner = snap.users.find((u) => u.role === "owner")!;
    const a = mintDeviceSession({ userId: owner.id, at: "2026-09-01T10:00:00.000Z" });
    const b = mintDeviceSession({ userId: owner.id, at: "2026-09-01T10:01:00.000Z" });
    let live = attachSession(attachSession(snap, a), b);
    const soon = new Date(Date.parse(a.lastActivityAt) + ACTIVITY_THROTTLE_MS - 1000).toISOString();
    const same = touchSession(live, a.id, soon);
    assert.equal(same, live);
    const later = new Date(Date.parse(a.lastActivityAt) + ACTIVITY_THROTTLE_MS + 1000).toISOString();
    live = touchSession(live, a.id, later);
    assert.equal(live.deviceSessions?.find((s) => s.id === a.id)?.lastActivityAt, later);
    const actor = {
      userId: owner.id,
      role: "owner" as const,
      homeBranchId: owner.branchId,
      sessionBranchId: "all",
      sessionId: a.id,
    };
    live = revokeOtherSessions(live, actor, a.id, later);
    assert.doesNotThrow(() => assertSessionActive(live, actor));
    assert.throws(() => assertSessionActive(live, { ...actor, sessionId: b.id }), AuthzError);
  });

  it("takes the first public hop from x-forwarded-for", () => {
    const req = new Request("https://ochag.example/", {
      headers: { "x-forwarded-for": "10.1.1.1, 203.0.113.9, 127.0.0.1", "x-real-ip": "192.168.0.8" },
    });
    assert.equal(clientIp(req), "203.0.113.9");
  });
});
