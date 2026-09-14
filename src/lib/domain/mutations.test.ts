import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorFrom, AuthzError } from "../authz/actor.ts";
import { emptySnapshot } from "../data/empty.ts";
import { applyBootstrap, applyClosePeriod, applyInviteStaff, applyManualSale, applyOnboard, applyOpenShift, applyRevision, applyUpdateStaff } from "./mutations.ts";
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

describe("bootstrap tech admin", () => {
  it("creates a tech_admin and a first branch on an empty snapshot", () => {
    const snap = applyBootstrap(emptySnapshot(), {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    assert.equal(snap.users.length, 1);
    assert.equal(snap.users[0]?.role, "tech_admin");
    assert.equal(snap.users[0]?.email, "admin");
    assert.equal(snap.users[0]?.branchId, null);
    assert.equal(snap.branches.length, 1);
    assert.equal(snap.audit[0]?.action, "bootstrap");
    assert.equal(snap.opsLogs[0]?.event, "bootstrap");
    assert.throws(
      () =>
        applyBootstrap(snap, {
          name: "Ещё",
          login: "admin2",
          password: "secret",
          pin: "8888",
          branchName: "Юг",
        }),
      (err: unknown) => err instanceof AuthzError && /уже создана/i.test(err.message),
    );
  });

  it("lets tech_admin invite an owner; owner cannot invite tech_admin", () => {
    const snap = applyBootstrap(emptySnapshot(), {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
    });
    const admin = snap.users[0]!;
    const actor = actorFrom(admin, { userId: admin.id, branchId: snap.branches[0]!.id });
    const withOwner = applyInviteStaff(snap, actor, {
      name: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      role: "owner",
      branchId: snap.branches[0]!.id,
      shiftPay: 0,
      salesPercent: 0,
    });
    const owner = withOwner.users.find((u) => u.role === "owner")!;
    assert.equal(owner.branchId, null);
    assert.equal(withOwner.audit[0]?.action, "invite");
    assert.equal(withOwner.opsLogs[0]?.event, "account_create");
    const ownerActor = actorFrom(owner, { userId: owner.id, branchId: snap.branches[0]!.id });
    assert.throws(
      () =>
        applyInviteStaff(withOwner, ownerActor, {
          name: "Другой техник",
          login: "tech2",
          password: "ochag",
          pin: "1111",
          role: "tech_admin",
          branchId: snap.branches[0]!.id,
          shiftPay: 0,
          salesPercent: 0,
        }),
      (err: unknown) => err instanceof AuthzError && /роль/i.test(err.message),
    );
  });

  it("refuses to disable the last tech_admin and blocks login field via disabled flag", () => {
    const snap = applyBootstrap(emptySnapshot(), {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
    });
    const admin = snap.users[0]!;
    const actor = actorFrom(admin, { userId: admin.id, branchId: snap.branches[0]!.id });
    const withOwner = applyInviteStaff(snap, actor, {
      name: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      role: "owner",
      branchId: snap.branches[0]!.id,
      shiftPay: 0,
      salesPercent: 0,
    });
    const owner = withOwner.users.find((u) => u.role === "owner")!;
    assert.throws(
      () => applyUpdateStaff(withOwner, actor, { userId: admin.id, disabled: true }),
      (err: unknown) => err instanceof AuthzError && /свою учётку/i.test(err.message),
    );
    const disabledOwner = applyUpdateStaff(withOwner, actor, { userId: owner.id, disabled: true });
    assert.equal(disabledOwner.users.find((u) => u.id === owner.id)?.disabled, true);
    const ghost = { ...actor, userId: "ghost" };
    assert.throws(
      () => applyUpdateStaff(snap, ghost, { userId: admin.id, disabled: true }),
      (err: unknown) => err instanceof AuthzError && /последнего/i.test(err.message),
    );
  });
});
