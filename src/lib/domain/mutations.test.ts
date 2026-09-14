import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorFrom, AuthzError } from "../authz/actor.ts";
import { emptySnapshot } from "../data/empty.ts";
import { applyAddBranch, applyBootstrap, applyClosePeriod, applyDeleteBranch, applyDeleteStaff, applyInviteStaff, applyKeeperSales, applyManualSale, applyOnboard, applyOpenShift, applyRevision, applyUpdateBranch, applyUpdateStaff } from "./mutations.ts";
import { publicSnapshot } from "./finance.ts";
import { protectStoredUsers } from "../data/preserve-users.ts";
import { retainSecrets } from "../data/secrets.ts";
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

  it("refuses a keeper import without an open shift", () => {
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
      () =>
        applyKeeperSales(onboarded, actor, [
          {
            at: new Date().toISOString(),
            items: [{ recipeId: "r1", name: "Чай", qty: 1, price: 50, sum: 50 }],
            payments: [{ type: "card", amount: 50 }],
            total: 50,
            waiterId: actor.userId,
            source: "keeper",
          },
        ]),
      (err: unknown) => err instanceof AuthzError && /смену/i.test(err.message),
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
    assert.equal(disabledOwner.audit[0]?.action, "block");
    assert.equal(disabledOwner.opsLogs[0]?.event, "account_block");
    const ghost = { ...actor, userId: "ghost" };
    assert.throws(
      () => applyUpdateStaff(snap, ghost, { userId: admin.id, disabled: true }),
      (err: unknown) => err instanceof AuthzError && /последнего/i.test(err.message),
    );
  });

  it("lets tech_admin delete an owner and refuses to delete the last remaining tech_admin", () => {
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
    const deleted = applyDeleteStaff(withOwner, actor, { userId: owner.id });
    assert.equal(deleted.users.some((u) => u.id === owner.id), false);
    assert.equal(deleted.audit[0]?.action, "delete");
    assert.equal(deleted.opsLogs[0]?.event, "account_delete");
    assert.throws(
      () => applyDeleteStaff(deleted, actor, { userId: admin.id }),
      (err: unknown) => err instanceof AuthzError && /свою учётку/i.test(err.message),
    );
    const ownerActor = actorFrom(owner, { userId: owner.id, branchId: snap.branches[0]!.id });
    assert.throws(
      () => applyDeleteStaff(withOwner, ownerActor, { userId: admin.id }),
      (err: unknown) => err instanceof AuthzError && /удаление/i.test(err.message),
    );
    const ghost = { ...actor, userId: "ghost" };
    assert.throws(
      () => applyDeleteStaff(snap, ghost, { userId: admin.id }),
      (err: unknown) => err instanceof AuthzError && /последнего/i.test(err.message),
    );
  });
});

describe("commercial onboard", () => {
  it("keeps an existing technician when the owner network is created", () => {
    const withTech = emptySnapshot();
    withTech.users = [
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
    ];
    const next = applyOnboard(withTech, {
      ownerName: "Мария",
      login: "maria",
      password: "cafe",
      pin: "2002",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    assert.equal(next.users.length, 2);
    assert.equal(next.users[0]?.email, "admin");
    assert.equal(next.users[0]?.password, "secret");
    assert.equal(next.users.find((u) => u.role === "owner")?.email, "maria");
  });
});

describe("staff CRUD", () => {
  function network() {
    const snap = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    const owner = snap.users.find((u) => u.role === "owner")!;
    const actor = actorFrom(owner, { userId: owner.id, branchId: snap.branches[0]!.id });
    return { snap, owner, actor, branchId: snap.branches[0]!.id };
  }

  it("lets an owner create and edit a cook, and keeps secrets through a public snapshot round-trip", () => {
    const { snap, actor, branchId } = network();
    const invited = applyInviteStaff(snap, actor, {
      name: "Денис",
      login: "denis",
      password: "kitchen1",
      pin: "3001",
      role: "cook",
      branchId,
      shiftPay: 2800,
      salesPercent: 0,
    });
    const cook = invited.users.find((u) => u.email === "denis")!;
    assert.equal(cook.role, "cook");
    assert.equal(cook.password, "kitchen1");
    assert.equal(cook.pin, "3001");
    const edited = applyUpdateStaff(invited, actor, {
      userId: cook.id,
      name: "Денис Жуков",
      shiftPay: 3000,
      password: "kitchen2",
    });
    const next = edited.users.find((u) => u.id === cook.id)!;
    assert.equal(next.name, "Денис Жуков");
    assert.equal(next.shiftPay, 3000);
    assert.equal(next.password, "kitchen2");
    const stored = retainSecrets(edited, protectStoredUsers(edited, publicSnapshot(edited)));
    assert.equal(stored.users.find((u) => u.email === "denis")?.password, "kitchen2");
    assert.equal(stored.users.find((u) => u.email === "denis")?.pin, "3001");
  });

  it("refuses a hall role without a real branch", () => {
    const { snap, actor } = network();
    assert.throws(
      () =>
        applyInviteStaff(snap, actor, {
          name: "Алина",
          login: "alina",
          password: "hall1",
          pin: "4001",
          role: "waiter",
          branchId: "missing",
          shiftPay: 0,
          salesPercent: 0,
        }),
      (err: unknown) => err instanceof AuthzError && /филиал/i.test(err.message),
    );
  });
});

describe("branch management", () => {
  function network() {
    const snap = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
      seats: 32,
      halls: ["Основной", "Веранда"],
    });
    const owner = snap.users.find((u) => u.role === "owner")!;
    const actor = actorFrom(owner, { userId: owner.id, branchId: snap.branches[0]!.id });
    return { snap, owner, actor };
  }

  it("lets the owner add, edit and delete an extra branch; manager cannot", () => {
    const { snap, actor } = network();
    const withSecond = applyAddBranch(snap, actor, {
      name: "Юг",
      city: "Сочи",
      address: "Набережная, 2",
      seats: 50,
      halls: ["Зал 1"],
    });
    const extra = withSecond.branches.find((b) => b.name === "Юг")!;
    assert.equal(extra.seats, 50);
    assert.deepEqual(extra.halls, ["Зал 1"]);
    const renamed = applyUpdateBranch(withSecond, actor, { branchId: extra.id, name: "Южный", seats: 55 });
    assert.equal(renamed.branches.find((b) => b.id === extra.id)?.name, "Южный");
    assert.equal(renamed.branches.find((b) => b.id === extra.id)?.seats, 55);
    const deleted = applyDeleteBranch(renamed, actor, { branchId: extra.id });
    assert.equal(deleted.branches.some((b) => b.id === extra.id), false);
    const manager = {
      ...actor,
      userId: "u-man",
      role: "manager" as const,
    };
    assert.throws(
      () => applyAddBranch(snap, manager, { name: "Ещё", city: "—", address: "—" }),
      (err: unknown) => err instanceof AuthzError && /владелец/i.test(err.message),
    );
  });

  it("refuses to delete the last branch", () => {
    const { snap, actor } = network();
    assert.throws(
      () => applyDeleteBranch(snap, actor, { branchId: snap.branches[0]!.id }),
      (err: unknown) => err instanceof AuthzError && /последний/i.test(err.message),
    );
  });
});

describe("manual sale payment", () => {
  it("records Перевод as a cheque payment", () => {
    const snap = applyOnboard(emptySnapshot(), {
      ownerName: "Кирилл",
      login: "owner",
      password: "ochag",
      pin: "1001",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    const owner = snap.users.find((u) => u.role === "owner")!;
    const actor = actorFrom(owner, { userId: owner.id, branchId: snap.branches[0]!.id });
    const opened = applyOpenShift(snap, actor, { openCash: 1000, staffIds: [owner.id], startList: ["none"] });
    opened.settings = { ...opened.settings, keeperCashLink: false };
    const sold = applyManualSale(
      opened,
      actor,
      [{ recipeId: "x", name: "Чай", qty: 1, price: 150, sum: 150 }],
      "transfer",
    );
    assert.equal(sold.sales[0]?.payments[0]?.type, "transfer");
    assert.equal(sold.sales[0]?.payments[0]?.amount, 150);
  });
});
