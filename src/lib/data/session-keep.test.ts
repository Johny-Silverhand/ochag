import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySnapshot } from "./empty.ts";
import { keepStoredSession, shouldReplaceSnapshot } from "./session-keep.ts";

describe("keepStoredSession", () => {
  const session = { userId: "u-tech", branchId: "all" };

  it("keeps the session when a transient empty snapshot arrives", () => {
    assert.deepEqual(keepStoredSession(session, emptySnapshot()), session);
  });

  it("keeps the session when the user is still in the incoming snapshot", () => {
    const incoming = emptySnapshot();
    incoming.users = [{ id: "u-tech", name: "Тех", email: "admin", password: "", pin: "", role: "tech_admin", position: "", branchId: null, shiftPay: 0, salesPercent: 0, phone: "" }];
    assert.deepEqual(keepStoredSession(session, incoming), session);
  });

  it("clears the session when another live network no longer has that user", () => {
    const incoming = emptySnapshot();
    incoming.users = [{ id: "u-other", name: "Другой", email: "boss", password: "x", pin: "1111", role: "owner", position: "", branchId: null, shiftPay: 0, salesPercent: 0, phone: "" }];
    assert.equal(keepStoredSession(session, incoming), null);
  });

  it("does not replace a live snapshot with an empty load", () => {
    const live = emptySnapshot();
    live.users = [{ id: "u-tech", name: "Тех", email: "admin", password: "x", pin: "0001", role: "tech_admin", position: "", branchId: null, shiftPay: 0, salesPercent: 0, phone: "" }];
    assert.equal(shouldReplaceSnapshot(live, emptySnapshot()), false);
    assert.equal(shouldReplaceSnapshot(emptySnapshot(), live), true);
    assert.equal(shouldReplaceSnapshot(emptySnapshot(), emptySnapshot()), true);
  });
});
