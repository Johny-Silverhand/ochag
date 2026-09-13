import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorFrom, AuthzError } from "../authz/actor.ts";
import { emptySnapshot } from "../data/empty.ts";
import { applyManualSale, applyOnboard, applyOpenShift } from "./mutations.ts";
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
