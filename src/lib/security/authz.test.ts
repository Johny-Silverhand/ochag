import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { actorFrom } from "../authz/actor.ts";
import { emptySnapshot } from "../data/empty.ts";
import { publicSnapshot } from "../domain/finance.ts";
import { applyCreateLedgerDebt, applyPayLedgerDebt, applyUpdateLedgerDebt } from "../domain/debts.ts";
import { applyOnboard } from "../domain/onboard.ts";
import { canSeeDebts, canSeeOpsLog } from "../domain/permissions.ts";
import { assignOwnerIds, canSwitchOwner } from "../domain/tenancy.ts";
import { assertApiAuthz, assertCanSeeOpsLog } from "./authz-routes.ts";

function managerActor(branchId: string, ownerId: string) {
  return actorFrom(
    {
      id: "u-mgr",
      name: "Анна",
      email: "anna",
      password: "hall",
      pin: "3003",
      role: "manager",
      position: "Управляющий",
      branchId,
      ownerId,
      shiftPay: 0,
      salesPercent: 0,
      phone: "",
    },
    { userId: "u-mgr", branchId },
  );
}

describe("API AuthZ negatives", () => {
  it("rejects a manager on debts, owners list and tech contour switch", () => {
    assert.equal(canSeeDebts("manager"), false);
    assert.equal(canSwitchOwner("manager"), false);
    assert.equal(canSeeOpsLog("manager"), false);
    assert.throws(() => assertApiAuthz("GET", "debts/ledger", { role: "manager" }), AuthzError);
    assert.throws(() => assertApiAuthz("POST", "debts/ledger", { role: "manager" }), AuthzError);
    assert.throws(() => assertApiAuthz("POST", "debts/ledger/pay", { role: "manager" }), AuthzError);
    assert.throws(() => assertApiAuthz("GET", "owners", { role: "manager" }), AuthzError);
    assert.throws(() => assertApiAuthz("POST", "session/owner", { role: "manager" }), AuthzError);
    assert.throws(() => assertApiAuthz("POST", "state/sample", { role: "manager" }), AuthzError);
    assert.throws(() => assertCanSeeOpsLog("manager"), AuthzError);
    assert.doesNotThrow(() => assertApiAuthz("GET", "owners", { role: "tech_admin" }));
    assert.doesNotThrow(() => assertApiAuthz("GET", "debts/ledger", { role: "owner" }));
  });

  it("does not let a manager mutate ledger debts even with a stolen id", () => {
    const live = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "cafe",
      pin: "1001",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    const owner = actorFrom(live.users[0]!, { userId: live.users[0]!.id, branchId: live.branches[0]!.id });
    const withDebt = applyCreateLedgerDebt(live, owner, {
      kind: "client",
      partyName: "Банкет",
      amount: 9000,
    });
    const mgr = managerActor(live.branches[0]!.id, live.users[0]!.id);
    assert.throws(() => applyPayLedgerDebt(withDebt, mgr, { debtId: withDebt.ledgerDebts[0]!.id, amount: 100 }), AuthzError);
    assert.throws(
      () => applyUpdateLedgerDebt(withDebt, mgr, { debtId: withDebt.ledgerDebts[0]!.id, note: "nope" }),
      AuthzError,
    );
  });

  it("strips ops console and password/PIN from a manager snapshot", () => {
    let live = assignOwnerIds(
      applyOnboard(emptySnapshot(), {
        ownerName: "Кирилл",
        login: "owner",
        password: "super-secret",
        pin: "9999",
        branchName: "Центр",
        city: "Краснодар",
        address: "ул. Красная, 1",
      }),
    );
    live = {
      ...live,
      opsLogs: [
        {
          id: "log-1",
          at: "2026-09-01T00:00:00.000Z",
          level: "warn",
          event: "api",
          detail: "техник сброс",
          userId: "u-tech",
        },
      ],
    };
    const mgr = managerActor(live.branches[0]!.id, live.users[0]!.id);
    const pub = publicSnapshot(live, mgr);
    assert.equal(pub.opsLogs.length, 0);
    assert.ok(pub.users.every((u) => u.password === "" && u.pin === ""));
    assert.equal(JSON.stringify(pub).includes("super-secret"), false);
    assert.equal(JSON.stringify(pub).includes("9999"), false);
  });
});
