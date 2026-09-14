import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorFrom } from "../authz/actor.ts";
import { AuthzError } from "../authz/error.ts";
import { emptySnapshot } from "../data/empty.ts";
import { publicSnapshot } from "./finance.ts";
import { applyInviteStaff, applySessionOwner, applyWriteoff } from "./mutations.ts";
import { applyOnboard } from "./onboard.ts";
import { adminVisibleUsers } from "./permissions.ts";
import { assignOwnerIds, effectiveOwnerId, canSwitchOwner, ownerSummaries, scopeSnapshot, assertReadableBranch } from "./tenancy.ts";

function techSnap() {
  const snap = emptySnapshot();
  snap.users = [
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
  return snap;
}

const maria = {
  ownerName: "Мария",
  login: "maria",
  password: "cafe",
  pin: "2002",
  branchName: "Центр",
  city: "Краснодар",
  address: "ул. Красная, 1",
};

const ivan = {
  ownerName: "Иван",
  login: "ivan",
  password: "bistro",
  pin: "4004",
  branchName: "Юг",
  city: "Сочи",
  address: "Набережная, 2",
};

describe("owner tenancy", () => {
  it("lets tech see every owner", () => {
    const live = applyOnboard(applyOnboard(techSnap(), maria), ivan);
    const owners = live.users.filter((u) => u.role === "owner");
    assert.equal(owners.length, 2);
    assert.deepEqual(
      adminVisibleUsers(
        { role: "tech_admin", userId: "u-tech", homeBranchId: null, sessionBranchId: "all" },
        live.users,
      )
        .filter((u) => u.role === "owner")
        .map((u) => u.email)
        .sort(),
      ["ivan", "maria"],
    );
  });

  it("scopes snapshot so owner A sales do not appear for owner B", () => {
    let live = applyOnboard(applyOnboard(techSnap(), maria), ivan);
    live = assignOwnerIds(live);
    const mariaId = live.users.find((u) => u.email === "maria")!.id;
    const ivanId = live.users.find((u) => u.email === "ivan")!.id;
    const mariaBr = live.branches.find((b) => b.ownerId === mariaId)!.id;
    const ivanBr = live.branches.find((b) => b.ownerId === ivanId)!.id;
    live = {
      ...live,
      sales: [
        {
          id: "s-a",
          number: "1",
          at: "2026-09-01T12:00:00.000Z",
          branchId: mariaBr,
          shiftId: "sh-a",
          waiterId: mariaId,
          items: [],
          payments: [{ type: "cash", amount: 1000 }],
          total: 1000,
          source: "manual",
        },
        {
          id: "s-b",
          number: "2",
          at: "2026-09-01T13:00:00.000Z",
          branchId: ivanBr,
          shiftId: "sh-b",
          waiterId: ivanId,
          items: [],
          payments: [{ type: "cash", amount: 2000 }],
          total: 2000,
          source: "manual",
        },
      ],
    };
    const mariaView = scopeSnapshot(live, mariaId);
    assert.equal(mariaView.sales.length, 1);
    assert.equal(mariaView.sales[0]?.id, "s-a");
    assert.ok(mariaView.branches.every((b) => b.ownerId === mariaId));
    assert.equal(
      mariaView.users.filter((u) => u.role === "owner").map((u) => u.email).join(),
      "maria",
    );
    const pub = publicSnapshot(live, {
      userId: "u-tech",
      role: "tech_admin",
      homeBranchId: null,
      sessionBranchId: "all",
      actingOwnerId: mariaId,
    });
    assert.equal(pub.sales.length, 1);
    assert.equal(pub.sales[0]?.id, "s-a");
  });

  it("forbids a manager from reading another owner's branch", () => {
    let live = assignOwnerIds(applyOnboard(applyOnboard(techSnap(), maria), ivan));
    const mariaId = live.users.find((u) => u.email === "maria")!.id;
    const ivanBr = live.branches.find((b) => b.ownerId !== mariaId)!.id;
    const waiter = {
      userId: "u-wait",
      role: "manager" as const,
      homeBranchId: live.branches.find((b) => b.ownerId === mariaId)!.id,
      sessionBranchId: live.branches.find((b) => b.ownerId === mariaId)!.id,
      ownerId: mariaId,
    };
    live = {
      ...live,
      users: [
        ...live.users,
        {
          id: "u-wait",
          name: "Анна",
          email: "anna",
          password: "hall",
          pin: "3003",
          role: "manager",
          position: "Управляющий",
          branchId: waiter.homeBranchId,
          ownerId: mariaId,
          shiftPay: 0,
          salesPercent: 0,
          phone: "",
        },
      ],
    };
    assert.throws(() => assertReadableBranch(live, waiter, ivanBr), AuthzError);
    assert.equal(effectiveOwnerId(waiter, live), mariaId);
  });

  it("does not let owner or manager use the owner switcher", () => {
    assert.equal(canSwitchOwner("owner"), false);
    assert.equal(canSwitchOwner("manager"), false);
    assert.equal(canSwitchOwner("tech_admin"), true);
  });

  it("lists invited owners and switching contour changes branches, staff and stats", () => {
    let live = assignOwnerIds(applyOnboard(applyOnboard(techSnap(), maria), ivan));
    const techUser = live.users.find((u) => u.role === "tech_admin")!;
    const tech = actorFrom(techUser, { userId: techUser.id, branchId: "all" });
    live = applyInviteStaff(live, tech, {
      name: "Ольга",
      login: "olga",
      password: "cafe",
      pin: "5005",
      role: "owner",
      branchId: "",
      shiftPay: 0,
      salesPercent: 0,
    });
    assert.deepEqual(
      ownerSummaries(live)
        .map((o) => o.email)
        .sort(),
      ["ivan", "maria", "olga"],
    );

    const mariaId = live.users.find((u) => u.email === "maria")!.id;
    const ivanId = live.users.find((u) => u.email === "ivan")!.id;
    const mariaBr = live.branches.find((b) => b.ownerId === mariaId)!.id;
    const ivanBr = live.branches.find((b) => b.ownerId === ivanId)!.id;
    live = {
      ...live,
      sales: [
        {
          id: "s-a",
          number: "1",
          at: "2026-09-01T12:00:00.000Z",
          branchId: mariaBr,
          shiftId: "sh-a",
          waiterId: mariaId,
          items: [],
          payments: [{ type: "cash", amount: 1000 }],
          total: 1000,
          source: "manual",
        },
        {
          id: "s-b",
          number: "2",
          at: "2026-09-01T13:00:00.000Z",
          branchId: ivanBr,
          shiftId: "sh-b",
          waiterId: ivanId,
          items: [],
          payments: [{ type: "cash", amount: 2000 }],
          total: 2000,
          source: "manual",
        },
      ],
    };

    const mariaActor = applySessionOwner(tech, mariaId, live);
    const mariaView = publicSnapshot(live, mariaActor);
    assert.equal(mariaActor.sessionBranchId, "all");
    assert.ok(mariaView.branches.every((b) => b.ownerId === mariaId));
    assert.equal(mariaView.sales.length, 1);
    assert.equal(mariaView.sales[0]?.id, "s-a");
    assert.equal(mariaView.users.filter((u) => u.role === "owner").map((u) => u.email).join(), "maria");

    const ivanActor = applySessionOwner(mariaActor, ivanId, live);
    const ivanView = publicSnapshot(live, ivanActor);
    assert.ok(ivanView.branches.every((b) => b.ownerId === ivanId));
    assert.equal(ivanView.sales[0]?.id, "s-b");
    assert.notEqual(ivanView.branches[0]?.id, mariaView.branches[0]?.id);

    const managerUser = live.users.find((u) => u.email === "maria")!;
    const manager = actorFrom(
      { ...managerUser, role: "manager", ownerId: mariaId },
      { userId: managerUser.id, branchId: mariaBr },
    );
    assert.throws(() => applySessionOwner(manager, ivanId, live), AuthzError);

    assert.throws(
      () =>
        applyWriteoff(
          live,
          { ...mariaActor, sessionBranchId: ivanBr },
          { productId: "prd-x", qty: 1, reason: "spoilage" },
        ),
      (err: unknown) => err instanceof AuthzError && /контур/i.test((err as Error).message),
    );
  });
});
