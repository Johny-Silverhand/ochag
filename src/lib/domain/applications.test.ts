import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyApproveNetworkApplication, applySubmitNetworkApplication } from "./applications.ts";
import { emptySnapshot } from "../data/empty.ts";
import type { Actor } from "../authz/actor.ts";

const tech: Actor = {
  userId: "u-tech",
  role: "tech_admin",
  name: "Техник",
  homeBranchId: null,
  sessionBranchId: "all",
  actingOwnerId: null,
};

describe("network applications", () => {
  it("does not create a user on submit", () => {
    const { snap, application } = applySubmitNetworkApplication(emptySnapshot(), {
      ownerName: "Мария",
      login: "maria",
      password: "cafe12",
      pin: "2002",
      phone: "+7 900 111-22-33",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    assert.equal(snap.users.length, 0);
    assert.equal(application.status, "pending");
    assert.equal(snap.pendingNetworks?.[0]?.login, "maria");
  });

  it("creates the owner only after tech approval", () => {
    const submitted = applySubmitNetworkApplication(emptySnapshot(), {
      ownerName: "Мария",
      login: "maria",
      password: "cafe12",
      pin: "2002",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    });
    const approved = applyApproveNetworkApplication(submitted.snap, tech, { id: submitted.application.id, tariff: "mid" });
    assert.ok(approved.users.some((u) => u.email === "maria" && u.role === "owner"));
    assert.equal(approved.pendingNetworks?.[0]?.status, "approved");
  });
});
