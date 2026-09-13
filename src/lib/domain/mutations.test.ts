import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorFrom, AuthzError } from "../authz/actor.ts";
import { emptySnapshot } from "../data/empty.ts";
import { applyClosePeriod, applyManualSale, applyOnboard, applyOpenShift, applyRevision } from "./mutations.ts";
import { defaultSettings } from "./types.ts";

const ownerActor = actorFrom(
  {
    id: "u-1",
    name: "Владелец",
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
  { userId: "u-1", branchId: "all" },
);

describe("write scope", () => {
  it("refuses a write while the owner is on all branches", () => {
    const snap = emptySnapshot();
    assert.throws(
      () => applyOpenShift(snap, ownerActor, { openCash: 1000, staffIds: [], startList: ["r1"] }),
      (err: unknown) => err instanceof AuthzError && /филиал/i.test(err.message),
    );
  });
});

describe("start-list", () => {
  it("refuses to open a shift without a start-list", () => {
    const onboarded = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      branchName: "Пушкина",
      city: "Краснодар",
      address: "ул. Пушкина, 1",
    });
    const actor = { ...ownerActor, userId: onboarded.users[0]!.id, sessionBranchId: onboarded.branches[0]!.id };
    assert.throws(
      () => applyOpenShift(onboarded, actor, { openCash: 15000, staffIds: [actor.userId], startList: [] }),
      (err: unknown) => err instanceof AuthzError && /старт-лист/i.test(err.message),
    );
  });
});

describe("manual cheque vs keeper link", () => {
  it("blocks a manual cheque when the cash link is on", () => {
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
    const actor = { ...ownerActor, userId: onboarded.users[0]!.id, sessionBranchId: branchId };
    const withShift = applyOpenShift(
      { ...onboarded, settings: { ...defaultSettings(), keeperCashLink: true }, recipes: [] },
      actor,
      { openCash: 1000, staffIds: [actor.userId], startList: ["none"] },
    );
    assert.throws(
      () => applyManualSale(withShift, actor, [], "cash"),
      (err: unknown) => err instanceof AuthzError && /кипер/i.test(err.message),
    );
  });
});

describe("period close", () => {
  it("requires a done revision on the selected branch", () => {
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
    const actor = { ...ownerActor, userId: onboarded.users[0]!.id, sessionBranchId: branchId };
    assert.throws(
      () => applyClosePeriod(onboarded, actor, { from: "2026-09-01", to: "2026-09-13", revisionId: "missing" }),
      (err: unknown) => err instanceof AuthzError && /ревизи/i.test(err.message),
    );
    const withRev = applyRevision(onboarded, actor, [{ productId: "p1", bookQty: 2, factQty: 2 }], "закрытие");
    const rev = withRev.revisions[0]!;
    const closed = applyClosePeriod(withRev, actor, { from: rev.date, to: rev.date, revisionId: rev.id });
    assert.equal(closed.closedPeriods.length, 1);
    assert.throws(
      () => applyManualSale(closed, actor, [], "cash"),
      (err: unknown) => err instanceof AuthzError && /закрыт/i.test(err.message),
    );
  });
});
