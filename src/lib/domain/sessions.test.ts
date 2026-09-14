import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { emptySnapshot } from "../data/empty.ts";
import { applyOnboard } from "./onboard.ts";
import { attachSession, mintDeviceSession, revokeSession, assertSessionActive } from "./sessions.ts";

describe("device sessions", () => {
  it("keeps two sessions valid until one is revoked", () => {
    const snap = applyOnboard(emptySnapshot(), {
      ownerName: "Мария",
      login: "maria",
      password: "cafe",
      pin: "2002",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    const owner = snap.users.find((u) => u.role === "owner")!;
    const a = mintDeviceSession({ userId: owner.id, at: "2026-09-01T10:00:00.000Z" });
    const b = mintDeviceSession({ userId: owner.id, at: "2026-09-01T11:00:00.000Z" });
    let live = attachSession(attachSession(snap, a), b);
    assert.equal((live.deviceSessions ?? []).filter((s) => s.userId === owner.id && !s.revokedAt).length, 2);
    const actor = { userId: owner.id, role: "owner" as const, homeBranchId: owner.branchId, sessionBranchId: "all" };
    live = revokeSession(live, actor, a.id, "2026-09-01T12:00:00.000Z");
    assert.throws(() => assertSessionActive(live, { ...actor, sessionId: a.id }), AuthzError);
    assert.doesNotThrow(() => assertSessionActive(live, { ...actor, sessionId: b.id }));
    const listed = (live.deviceSessions ?? []).filter((s) => s.userId === owner.id);
    assert.ok(listed.find((s) => s.id === a.id)?.ip);
    assert.ok(listed.find((s) => s.id === a.id)?.createdAt);
  });
});
