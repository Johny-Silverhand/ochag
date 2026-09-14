import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminVisibleUsers,
  can,
  canDeleteAccount,
  canEditAccount,
  canInviteStaff,
  canSeeAllBranches,
  hasAbsoluteAccess,
  invitableRoles,
  isNetworkAdmin,
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
      "admin",
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
