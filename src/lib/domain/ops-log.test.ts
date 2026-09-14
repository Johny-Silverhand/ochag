import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSettings, type Snapshot } from "./types.ts";
import { auditActionLabel, auditGroup, scopedAudit } from "./audit-labels.ts";
import { appendOpsLog, recordAuthAttempt } from "./ops-log.ts";

function blank(): Snapshot {
  return {
    branches: [],
    users: [],
    products: [],
    recipes: [],
    stock: [],
    movements: [],
    invoices: [],
    sales: [],
    shifts: [],
    requests: [],
    banquets: [],
    expenses: [],
    payroll: [],
    revisions: [],
    stopList: [],
    suppliers: [],
    closedPeriods: [],
    debts: [],
    payrollAdjustments: [],
    revenuePlans: [],
    audit: [],
    opsLogs: [],
    outbox: [],
    pushSubs: [],
    settings: defaultSettings(),
  };
}

describe("ops log", () => {
  it("prepends newest first and keeps a cap", () => {
    let state = blank();
    state = appendOpsLog(state, { level: "info", event: "login", detail: "first", login: "a" });
    state = appendOpsLog(state, { level: "warn", event: "login_fail", detail: "second", login: "b" });
    assert.equal(state.opsLogs[0]?.detail, "second");
    assert.equal(state.opsLogs[1]?.detail, "first");
  });

  it("records failed and successful auth without storing a password", () => {
    const empty = blank();
    const fail = recordAuthAttempt(empty, {
      login: "ghost",
      via: "password",
      ok: false,
      reason: "Неверный логин или PIN",
    });
    assert.equal(fail.ok, false);
    assert.equal(fail.snap.opsLogs[0]?.event, "login_fail");
    assert.equal(fail.snap.opsLogs[0]?.login, "ghost");
    assert.doesNotMatch(JSON.stringify(fail.snap.opsLogs[0]), /ochag|secret/i);

    const ok = recordAuthAttempt(fail.snap, {
      login: "owner",
      via: "pin",
      ok: true,
      user: { id: "u-1" },
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.snap.opsLogs[0]?.event, "login");
    assert.equal(ok.snap.opsLogs[0]?.detail, "PIN");
  });
});

describe("audit labels and scope", () => {
  it("labels account provisioning and groups it as users", () => {
    assert.equal(auditActionLabel("invite"), "Создана учётка");
    assert.equal(auditActionLabel("staff"), "Изменена учётка");
    assert.equal(auditActionLabel("disable"), "Учётка отключена");
    assert.equal(auditGroup("invite"), "users");
    assert.equal(auditGroup("writeoff"), "stock");
  });

  it("lets tech_admin see every branch while a manager stays scoped", () => {
    const rows = [
      { id: "1", at: "2026-09-01", userId: "u", action: "writeoff", entity: "stock", branchId: "br-a", detail: "a" },
      { id: "2", at: "2026-09-01", userId: "u", action: "invite", entity: "user", detail: "net" },
      { id: "3", at: "2026-09-01", userId: "u", action: "transfer", entity: "stock", branchId: "br-b", detail: "b" },
    ];
    assert.equal(scopedAudit(rows, { role: "tech_admin", sessionBranchId: "br-a" }).length, 3);
    assert.deepEqual(
      scopedAudit(rows, { role: "manager", sessionBranchId: "br-a" }).map((e) => e.id),
      ["1", "2"],
    );
  });
});
