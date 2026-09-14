import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountPlaceLabel,
  adminVisibleUsers,
  can,
  canDeleteAccount,
  canEditAccount,
  canInviteStaff,
  canLoadSample,
  canManageBranches,
  canResetDemo,
  canSeeAllBranches,
  canSeeDebts,
  canSeeNetworkStats,
  canSeeOpsLog,
  hasAbsoluteAccess,
  invitableRoles,
  isNetworkAdmin,
  scopedBranchId,
} from "./permissions.ts";

describe("tech_admin access", () => {
  it("has absolute access to every module", () => {
    const modules = [
      "dashboard",
      "sales",
      "inventory",
      "recipes",
      "shifts",
      "procurement",
      "banquets",
      "staff",
      "reports",
      "integrations",
      "settings",
      "planning",
      "schedule",
      "quality",
      "ai",
      "admin",
      "debts",
    ] as const;
    for (const module of modules) {
      assert.equal(can("tech_admin", module), true);
    }
    assert.equal(hasAbsoluteAccess("tech_admin"), true);
    assert.equal(hasAbsoluteAccess("owner"), false);
    assert.equal(canSeeAllBranches("tech_admin"), true);
    assert.equal(canInviteStaff("tech_admin"), true);
    assert.equal(isNetworkAdmin("tech_admin"), true);
  });

  it("lets tech_admin invite every role, owner only hall staff", () => {
    assert.deepEqual(invitableRoles("tech_admin"), ["tech_admin", "owner", "manager", "cook", "waiter"]);
    assert.deepEqual(invitableRoles("owner"), ["manager", "cook", "waiter"]);
    assert.deepEqual(invitableRoles("waiter"), []);
  });

  it("does not grant waiter integrations or all-branch view", () => {
    assert.equal(can("waiter", "integrations"), false);
    assert.equal(canSeeAllBranches("waiter"), false);
    assert.equal(can("owner", "integrations"), true);
  });

  it("scopes cook and waiter away from network aggregates and branch CRUD", () => {
    assert.equal(canSeeNetworkStats("cook"), false);
    assert.equal(canSeeNetworkStats("waiter"), false);
    assert.equal(canSeeNetworkStats("manager"), true);
    assert.equal(canManageBranches("manager"), false);
    assert.equal(canManageBranches("owner"), true);
    assert.equal(canManageBranches("tech_admin"), true);
    assert.equal(canSeeDebts("owner"), true);
    assert.equal(canSeeDebts("manager"), false);
    assert.equal(canSeeDebts("tech_admin"), true);
    assert.equal(canSeeOpsLog("tech_admin"), true);
    assert.equal(canSeeOpsLog("owner"), false);
    assert.equal(canSeeOpsLog("manager"), false);
    assert.equal(canLoadSample("owner"), false);
    assert.equal(canLoadSample("tech_admin"), true);
    assert.equal(canResetDemo("manager"), false);
    assert.equal(scopedBranchId("cook", "all", "br-1"), "br-1");
    assert.equal(scopedBranchId("owner", "all", "br-1"), "all");
  });

  it("lets tech_admin edit owners but not themselves", () => {
    const actor = { role: "tech_admin" as const, userId: "u-tech" };
    assert.equal(canEditAccount(actor, { id: "u-owner", role: "owner" }), true);
    assert.equal(canEditAccount(actor, { id: "u-tech", role: "tech_admin" }), false);
    assert.equal(canEditAccount({ role: "owner", userId: "u-owner" }, { id: "u-tech", role: "tech_admin" }), false);
  });

  it("shows tech_admin every account and hides tech_admin from an owner", () => {
    const users = [
      { id: "u-tech", role: "tech_admin" as const, branchId: null },
      { id: "u-owner", role: "owner" as const, branchId: null },
      { id: "u-wait", role: "waiter" as const, branchId: "br-1" },
    ];
    const tech = adminVisibleUsers(
      { role: "tech_admin", userId: "u-tech", homeBranchId: null, sessionBranchId: "all" },
      users,
    );
    assert.equal(tech.length, 3);
    const techScoped = adminVisibleUsers(
      { role: "tech_admin", userId: "u-tech", homeBranchId: null, sessionBranchId: "br-1" },
      users,
    );
    assert.equal(techScoped.length, 3);
    const owner = adminVisibleUsers(
      { role: "owner", userId: "u-owner", homeBranchId: null, sessionBranchId: "all" },
      users,
    );
    assert.deepEqual(
      owner.map((u) => u.id).sort(),
      ["u-owner", "u-wait"],
    );
    const twoOwners = [
      ...users,
      { id: "u-cafe-2", role: "owner" as const, branchId: "br-2" },
    ];
    const techAll = adminVisibleUsers(
      { role: "tech_admin", userId: "u-tech", homeBranchId: null, sessionBranchId: "br-1" },
      twoOwners,
    );
    assert.equal(techAll.length, 4);
    assert.ok(techAll.some((u) => u.id === "u-cafe-2"));
    const branches = [
      { id: "br-1", short: "Пушкина", name: "Пушкина", city: "Краснодар" },
      { id: "br-2", short: "Центр", name: "Центр", city: "Сочи" },
    ];
    assert.equal(accountPlaceLabel({ role: "tech_admin", branchId: null }, branches), "вся сеть");
    assert.equal(accountPlaceLabel({ role: "owner", branchId: null }, branches), "вся сеть");
    assert.equal(accountPlaceLabel({ role: "owner", branchId: "br-2" }, branches), "Центр · Сочи");
    assert.equal(accountPlaceLabel({ role: "waiter", branchId: "br-1" }, branches), "Пушкина · Краснодар");
  });

  it("lets tech_admin delete others but not self or the last remaining tech_admin", () => {
    const users = [
      { id: "u-tech", role: "tech_admin" as const },
      { id: "u-owner", role: "owner" as const },
    ];
    const actor = { role: "tech_admin" as const, userId: "u-tech" };
    assert.equal(canDeleteAccount(actor, { id: "u-owner", role: "owner" }, users), true);
    assert.equal(canDeleteAccount(actor, { id: "u-tech", role: "tech_admin" }, users), false);
    assert.equal(canDeleteAccount({ role: "owner", userId: "u-owner" }, { id: "u-tech", role: "tech_admin" }, users), false);
    assert.equal(
      canDeleteAccount(actor, { id: "u-tech", role: "tech_admin" }, [{ id: "u-tech", role: "tech_admin" }]),
      false,
    );
  });
});
