import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSettings, type Snapshot } from "../domain/types.ts";
import { applySimulatePayment, billingPublic, canSelfOnboard, showCommercialEntry, snapshotForCommercialOnboard } from "./simulate.ts";
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
    assert.equal(showCommercialEntry(paid), false);
    assert.equal(billingPublic(paid).onboarded, true);
    assert.equal(billingPublic(paid).commercialEntry, false);
  });

  it("keeps commercial entry after tariff/pay while the store is still empty", () => {
    const empty = blank();
    assert.equal(showCommercialEntry(empty), true);
    const picked = { ...empty, settings: { ...empty.settings, tariff: "basic" as const } };
    assert.equal(showCommercialEntry(picked), true);
    assert.equal(canSelfOnboard(picked), false);
    const paid = applySimulatePayment(picked, "basic", "2026-09-14T13:00:00.000Z");
    assert.equal(showCommercialEntry(paid), true);
    assert.equal(canSelfOnboard(paid), true);
    assert.equal(billingPublic(paid).commercialEntry, true);
    assert.equal(billingPublic(paid).canCreateNetwork, true);
    assert.equal(billingPublic(paid).onboarded, false);
  });

  it("does not let leftover training hide tariffs; pay unlocks Создать сеть", () => {
    const leftover = applySimulatePayment(blank(), "trial", "2026-09-14T13:23:57.335Z");
    leftover.settings = { ...leftover.settings, sampleLoaded: true };
    leftover.users = [
      {
        id: "u-owner",
        name: "Кирилл Сорокин",
        email: "owner",
        password: "ochag",
        pin: "1001",
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    leftover.branches = [
      {
        id: "br-1",
        name: "Пушкина",
        short: "Пушкина",
        city: "Краснодар",
        address: "—",
        seats: 40,
        phone: "",
      },
    ];
    leftover.products = [{ id: "p-1", name: "Мука", category: "Бакалея", unit: "kg", minQty: 1, avgCost: 1 }];
    assert.equal(showCommercialEntry(leftover), true);
    assert.equal(canSelfOnboard(leftover), true);
    const pub = billingPublic(leftover);
    assert.equal(pub.commercialEntry, true);
    assert.equal(pub.canCreateNetwork, true);
    const cleared = snapshotForCommercialOnboard(leftover);
    assert.equal(cleared.users.length, 0);
    assert.equal(cleared.products.length, 0);
    assert.equal(cleared.settings.tariff, "trial");
    assert.equal(cleared.settings.paymentSimulatedAt, leftover.settings.paymentSimulatedAt);
    assert.equal(cleared.settings.sampleLoaded, false);
  });

  it("keeps a technician when leftover sample is replaced by Создать сеть", () => {
    const leftover = applySimulatePayment(blank(), "mid", "2026-09-14T13:23:57.335Z");
    leftover.settings = { ...leftover.settings, sampleLoaded: true };
    leftover.users = [
      {
        id: "u-tech",
        name: "Виктор",
        email: "admin",
        password: "ochag",
        pin: "0001",
        role: "tech_admin",
        position: "Администратор-техник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
      {
        id: "u-owner",
        name: "Кирилл Сорокин",
        email: "owner",
        password: "ochag",
        pin: "1001",
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    assert.equal(showCommercialEntry(leftover), true);
    assert.equal(canSelfOnboard(leftover), true);
    const cleared = snapshotForCommercialOnboard(leftover);
    assert.equal(cleared.users.length, 1);
    assert.equal(cleared.users[0]?.role, "tech_admin");
    assert.equal(cleared.users[0]?.password, "ochag");
    assert.equal(cleared.settings.paymentSimulatedAt, leftover.settings.paymentSimulatedAt);
  });

  it("does not wipe a commercially created network", () => {
    const live = applySimulatePayment(blank(), "pro");
    live.users = [
      {
        id: "u-cafe",
        name: "Мария",
        email: "maria",
        password: "cafe",
        pin: "2002",
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    const same = snapshotForCommercialOnboard(live);
    assert.equal(same.users[0]?.email, "maria");
    assert.equal(showCommercialEntry(live), false);
  });

  it("keeps Создать сеть when a technician is already in the store", () => {
    const paid = applySimulatePayment(blank(), "mid");
    paid.users = [
      {
        id: "u-tech",
        name: "Виктор",
        email: "admin",
        password: "secret",
        pin: "0001",
        role: "tech_admin",
        position: "Администратор-техник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
      {
        id: "u-cafe",
        name: "Мария",
        email: "maria",
        password: "cafe",
        pin: "2002",
        role: "owner",
        position: "Собственник",
        branchId: "br-1",
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    paid.branches = [
      {
        id: "br-1",
        name: "Центр",
        short: "Центр",
        city: "Краснодар",
        address: "—",
        seats: 40,
        phone: "",
      },
    ];
    assert.equal(showCommercialEntry(paid), true);
    assert.equal(canSelfOnboard(paid), true);
    const same = snapshotForCommercialOnboard(paid);
    assert.equal(same.users.length, 2);
    assert.equal(same.users.find((u) => u.role === "tech_admin")?.password, "secret");
    assert.equal(same.users.find((u) => u.email === "maria")?.email, "maria");
  });
});
