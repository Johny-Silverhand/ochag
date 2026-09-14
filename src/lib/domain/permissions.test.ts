import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  can,
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
});
