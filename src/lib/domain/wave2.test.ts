import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorFrom, AuthzError } from "../authz/actor.ts";
import { emptySnapshot } from "../data/empty.ts";
import { publicSnapshot } from "./finance.ts";
import { applyOnboard } from "./onboard.ts";
import { applyCreateLedgerDebt, applyPayLedgerDebt, visibleLedgerDebts } from "./debts.ts";
import { applyOpenShift, applyCloseShift, applyShiftIncidental } from "./mutations.ts";
import { shiftTotals } from "./engine.ts";
import { canSeeDebts } from "./permissions.ts";
import { defaultSettings, type StaffUser } from "./types.ts";
import { averageCheque, revenueByHour, waiterVoidsAndDiscounts } from "./reports-extra.ts";

function user(partial: Partial<StaffUser> & Pick<StaffUser, "id" | "role" | "email">): StaffUser {
  return {
    name: partial.name ?? partial.email,
    password: "ochag",
    pin: "1001",
    position: partial.role,
    branchId: partial.branchId ?? null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "",
    ...partial,
  };
}

describe("ledger debts visibility", () => {
  it("lets only the owner (and tech) create and see accounting debts", () => {
    assert.equal(canSeeDebts("owner"), true);
    assert.equal(canSeeDebts("tech_admin"), true);
    assert.equal(canSeeDebts("manager"), false);
    assert.equal(canSeeDebts("waiter"), false);

    const onboarded = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      branchName: "Пушкина",
      city: "Краснодар",
      address: "ул. Пушкина, 1",
    });
    const branchId = onboarded.branches[0]!.id;
    const owner = actorFrom(onboarded.users[0]!, { userId: onboarded.users[0]!.id, branchId });
    const managerUser = user({ id: "u-mgr", role: "manager", email: "manager", branchId });
    const withMgr = { ...onboarded, users: [...onboarded.users, managerUser] };
    const manager = actorFrom(managerUser, { userId: managerUser.id, branchId });

    const withDebt = applyCreateLedgerDebt(withMgr, owner, {
      kind: "client",
      partyName: "Иванов банкет",
      amount: 15000,
      note: "доплата за зал",
    });
    assert.equal(withDebt.ledgerDebts.length, 1);
    assert.equal(visibleLedgerDebts(withDebt, "owner").length, 1);
    assert.equal(visibleLedgerDebts(withDebt, "manager").length, 0);
    assert.equal(publicSnapshot(withDebt, "manager").ledgerDebts.length, 0);
    assert.equal(publicSnapshot(withDebt, "owner").ledgerDebts.length, 1);

    assert.throws(
      () => applyCreateLedgerDebt(withDebt, manager, { kind: "supplier", partyName: "Мясоопт", amount: 8000 }),
      (err: unknown) => err instanceof AuthzError && /владельц/i.test(err.message),
    );

    const paid = applyPayLedgerDebt(withDebt, owner, { debtId: withDebt.ledgerDebts[0]!.id, amount: 5000, note: "часть" });
    assert.equal(paid.ledgerDebts[0]!.status, "partial");
    assert.equal(paid.ledgerDebts[0]!.paid, 5000);
  });
});

describe("shift incidental expenses", () => {
  it("counts till-paid side costs in expected cash on close", () => {
    const onboarded = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      branchName: "Пушкина",
      city: "Краснодар",
      address: "ул. Пушкина, 1",
    });
    const branchId = onboarded.branches[0]!.id;
    const actor = actorFrom(onboarded.users[0]!, { userId: onboarded.users[0]!.id, branchId });
    const opened = applyOpenShift(
      { ...onboarded, recipes: [{ id: "r1", name: "Чай", category: "Бар", price: 100, yieldPortions: 1, items: [] }] },
      actor,
      {
        openCash: 10000,
        staffIds: [actor.userId],
        startList: ["r1"],
        incidentals: [{ title: "DJ на открытие", amount: 2000, paidFromTill: true }],
      },
    );
    const shift = opened.shifts[0]!;
    assert.equal(shift.incidentals?.length, 1);
    assert.equal(opened.expenses.some((e) => e.note.includes("DJ")), true);
    const during = applyShiftIncidental(opened, actor, { title: "Шары", amount: 500, paidFromTill: true, phase: "during" });
    const totals = shiftTotals(during.shifts[0]!, during.sales);
    assert.equal(totals.incidentalCash, 2500);
    assert.equal(totals.expected, 7500);

    const closed = applyCloseShift(during, actor, {
      closeCash: 7500,
      incidentals: [{ title: "Певица", amount: 3000, paidFromTill: true }],
    });
    const done = closed.shifts[0]!;
    assert.equal(done.status, "closed");
    assert.equal(done.incidentals?.length, 3);
    assert.equal(done.expectedCash, 4500);
    assert.equal(done.discrepancy, 3000);
  });
});

describe("average cheque and hourly rollup", () => {
  it("uses cheque timestamps and ignores voids", () => {
    const snap = emptySnapshot();
    const sales = [
      {
        id: "s1",
        number: "1",
        branchId: "br-1",
        shiftId: "sh",
        at: "2026-09-14T18:10:00.000Z",
        items: [{ recipeId: "r", name: "Чай", qty: 2, price: 100, sum: 200, costAtSale: 20 }],
        payments: [{ type: "cash" as const, amount: 200 }],
        total: 200,
        waiterId: "w1",
        source: "manual" as const,
      },
      {
        id: "s2",
        number: "2",
        branchId: "br-1",
        shiftId: "sh",
        at: "2026-09-14T18:40:00.000Z",
        items: [{ recipeId: "r", name: "Чай", qty: 1, price: 400, sum: 400, costAtSale: 40 }],
        payments: [{ type: "card" as const, amount: 350 }],
        total: 350,
        waiterId: "w1",
        source: "manual" as const,
        discount: 50,
        discountReason: "постоянный",
      },
      {
        id: "s3",
        number: "3",
        branchId: "br-1",
        shiftId: "sh",
        at: "2026-09-14T12:00:00.000Z",
        items: [{ recipeId: "r", name: "Чай", qty: 1, price: 999, sum: 999, costAtSale: 10 }],
        payments: [{ type: "cash" as const, amount: 999 }],
        total: 999,
        waiterId: "w2",
        source: "manual" as const,
        voided: true,
      },
    ];
    const full = { ...snap, sales, settings: defaultSettings() };
    const avg = averageCheque(full, "30d", "br-1");
    assert.equal(avg.checks, 2);
    assert.equal(avg.revenue, 550);
    assert.equal(avg.avgCheck, 275);
    const hourly = revenueByHour(full, "30d", "br-1");
    const peak = hourly.rows.find((r) => r.hour === 21);
    assert.ok(peak);
    assert.equal(peak!.checks, 2);
    assert.equal(peak!.revenue, 550);
    assert.equal(hourly.peakRevenue, 550);
    const voids = waiterVoidsAndDiscounts(full, "30d", "br-1");
    const w1 = voids.find((r) => r.waiterId === "w1");
    const w2 = voids.find((r) => r.waiterId === "w2");
    assert.equal(w1?.discounts, 1);
    assert.equal(w1?.discountSum, 50);
    assert.equal(w2?.voids, 1);
    assert.equal(w2?.voidSum, 999);
  });
});
