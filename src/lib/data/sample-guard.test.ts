import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { emptySnapshot } from "./empty.ts";
import {
  SAMPLE_BLOCKED_MSG,
  SAMPLE_ROLE_MSG,
  assertResetAllowed,
  assertSampleLoadAllowed,
  canReplaceWithSample,
  looksLikeCommercialNetwork,
} from "./sample-guard.ts";

function commercialSnap() {
  const snap = emptySnapshot();
  snap.users = [
    {
      id: "u_live_owner",
      name: "Мария",
      email: "maria",
      password: "cafe-secret",
      pin: "2002",
      role: "owner",
      position: "Собственник",
      branchId: "br_1",
      shiftPay: 0,
      salesPercent: 0,
      phone: "",
    },
  ];
  snap.branches = [
    {
      id: "br_1",
      name: "Центр",
      short: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
      seats: 40,
      phone: "",
      halls: ["Основной зал"],
    },
  ];
  return snap;
}

describe("sample-load safety", () => {
  it("refuses to replace a live commercial network", () => {
    const snap = commercialSnap();
    assert.equal(looksLikeCommercialNetwork(snap), true);
    const verdict = canReplaceWithSample(snap, "tech_admin");
    assert.equal(verdict.ok, false);
    if (!verdict.ok) assert.equal(verdict.reason, SAMPLE_BLOCKED_MSG);
    assert.throws(
      () => assertSampleLoadAllowed(snap, "tech_admin"),
      (err: unknown) => err instanceof AuthzError && err.message === SAMPLE_BLOCKED_MSG,
    );
  });

  it("refuses sample load for owner and manager even on an empty store", () => {
    assert.equal(canReplaceWithSample(emptySnapshot(), "owner").ok, false);
    assert.equal(canReplaceWithSample(emptySnapshot(), "manager").ok, false);
    const blocked = canReplaceWithSample(emptySnapshot(), "owner");
    if (!blocked.ok) assert.equal(blocked.reason, SAMPLE_ROLE_MSG);
  });

  it("lets a technician load sample onto an empty or leftover training snapshot", () => {
    assert.equal(canReplaceWithSample(emptySnapshot(), "tech_admin").ok, true);
    const leftover = emptySnapshot();
    leftover.settings = { ...leftover.settings, sampleLoaded: true };
    leftover.users = [
      {
        id: "u-owner",
        name: "Кирилл",
        email: "owner",
        password: "ochag",
        pin: "1001",
        role: "owner",
        position: "Собственник",
        branchId: "br_1",
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    leftover.branches = commercialSnap().branches;
    assert.equal(looksLikeCommercialNetwork(leftover), false);
    assert.equal(canReplaceWithSample(leftover, "tech_admin").ok, true);
  });

  it("does not treat leftover seed logins as a commercial wipe target", () => {
    const leftover = emptySnapshot();
    leftover.settings = { ...leftover.settings, sampleLoaded: true };
    leftover.users = [
      {
        id: "u-owner",
        name: "Кирилл",
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
    ];
    assert.equal(looksLikeCommercialNetwork(leftover), false);
  });

  it("blocks a commercial reset for owner, allows technician", () => {
    const snap = commercialSnap();
    assert.throws(
      () => assertResetAllowed(snap, "owner"),
      (err: unknown) => err instanceof AuthzError,
    );
    assert.doesNotThrow(() => assertResetAllowed(snap, "tech_admin"));
  });
});
