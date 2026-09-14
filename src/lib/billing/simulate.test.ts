import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSettings, type Snapshot } from "../domain/types.ts";
import { applySimulatePayment, billingPublic, canSelfOnboard } from "./simulate.ts";
import { isTariffId } from "./plans.ts";

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

describe("billing simulation", () => {
  it("records tariff and unlocks self-onboard only after simulated pay", () => {
    const empty = blank();
    assert.equal(canSelfOnboard(empty), false);
    assert.equal(isTariffId("mid"), true);
    const paid = applySimulatePayment(empty, "mid", "2026-09-14T12:00:00.000Z");
    assert.equal(paid.settings.tariff, "mid");
    assert.equal(paid.settings.paymentSimulatedAt, "2026-09-14T12:00:00.000Z");
    assert.equal(canSelfOnboard(paid), true);
    const pub = billingPublic(paid);
    assert.equal(pub.paid, true);
    assert.equal(pub.canCreateNetwork, true);
    assert.equal(pub.onboarded, false);
  });

  it("does not offer create-network once staff already exist", () => {
    const paid = applySimulatePayment(blank(), "pro");
    paid.users = [
      {
        id: "u-1",
        name: "Владелец",
        email: "boss",
        password: "secret",
        pin: "1001",
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    paid.branches = [
      {
        id: "br-1",
        name: "Филиал",
        short: "Филиал",
        city: "—",
        address: "—",
        seats: 40,
        phone: "",
      },
    ];
    assert.equal(canSelfOnboard(paid), false);
    assert.equal(billingPublic(paid).onboarded, true);
  });
});
