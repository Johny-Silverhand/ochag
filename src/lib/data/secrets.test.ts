import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSettings, type Snapshot, type StaffUser } from "../domain/types.ts";
import {
  applyPublicState,
  ensureSampleCredentials,
  hasBlankSecrets,
  matchLocalPassword,
  matchLocalPin,
  rematerializeSeedSecrets,
  retainSecrets,
} from "./secrets.ts";

const owner: StaffUser = {
  id: "u-owner",
  name: "Кирилл Сорокин",
  email: "owner",
  password: "ochag",
  pin: "1001",
  role: "owner",
  position: "Собственник",
  branchId: null,
  shiftPay: 0,
  salesPercent: 0,
  phone: "+7 918 000-00-01",
};

function snap(users: StaffUser[], sampleLoaded = true): Snapshot {
  return {
    branches: [],
    users,
    products: [],
    recipes: [],
    stock: [],
    movements: [],
    invoices: [],
    sales: [],
    shifts: [],
    requests: [],
    banquets: [],
    expenses: [],
    payroll: [],
    revisions: [],
    stopList: [],
    suppliers: [],
    closedPeriods: [],
    debts: [],
    payrollAdjustments: [],
    revenuePlans: [],
    audit: [],
    opsLogs: [],
    outbox: [],
    pushSubs: [],
    settings: { ...defaultSettings(), sampleLoaded },
  };
}

const seedUsers = [owner];

describe("retainSecrets", () => {
  it("does not let a blank publicSnapshot wipe local pin/password", () => {
    const prev = snap([owner]);
    const next = snap([{ ...owner, password: "", pin: "" }]);
    const out = retainSecrets(prev, next);
    assert.equal(out.users[0]?.password, "ochag");
    assert.equal(out.users[0]?.pin, "1001");
  });

  it("matches a peer by email when ids differ", () => {
    const prev = snap([owner]);
    const next = snap([{ ...owner, id: "other", password: "", pin: "" }]);
    const out = retainSecrets(prev, next);
    assert.equal(out.users[0]?.password, "ochag");
    assert.equal(out.users[0]?.pin, "1001");
  });
});

describe("rematerializeSeedSecrets", () => {
  it("restores createSeed credentials by id/email when sampleLoaded and secrets are blank", () => {
    const stripped = snap([{ ...owner, password: "", pin: "" }]);
    assert.ok(hasBlankSecrets(stripped));
    const out = rematerializeSeedSecrets(stripped, seedUsers);
    assert.equal(out.users[0]?.password, "ochag");
    assert.equal(out.users[0]?.pin, "1001");
  });

  it("restores tech_admin seed credentials by id even if sampleLoaded is lost", () => {
    const tech: StaffUser = {
      id: "u-tech",
      name: "Виктор Мост",
      email: "admin",
      password: "",
      pin: "",
      role: "tech_admin",
      position: "Администратор-техник",
      branchId: null,
      shiftPay: 0,
      salesPercent: 0,
      phone: "",
    };
    const stripped = snap([tech], false);
    const out = rematerializeSeedSecrets(stripped, [
      { ...tech, password: "ochag", pin: "0001" },
      owner,
    ]);
    assert.equal(out.users[0]?.password, "ochag");
    assert.equal(out.users[0]?.pin, "0001");
    const byPassword = matchLocalPassword(stripped, "admin", "ochag", [
      { ...tech, password: "ochag", pin: "0001" },
      owner,
    ]);
    assert.ok(byPassword.user);
    assert.equal(byPassword.user?.email, "admin");
  });

  it("leaves a non-sample network alone", () => {
    const custom = snap(
      [
        {
          ...owner,
          id: "u-custom",
          email: "boss",
          password: "",
          pin: "",
        },
      ],
      false,
    );
    const out = rematerializeSeedSecrets(custom, seedUsers);
    assert.equal(out.users[0]?.password, "");
    assert.equal(out.users[0]?.email, "boss");
  });
});

describe("applyPublicState / local login", () => {
  it("keeps owner/ochag and PIN 1001 after a stripped API sample", () => {
    const incoming = snap([{ ...owner, password: "", pin: "" }]);
    const merged = applyPublicState(snap([], false), incoming, seedUsers);
    const byPassword = matchLocalPassword(merged, "owner", "ochag", seedUsers);
    const byPin = matchLocalPin(merged, "owner", "1001", seedUsers);
    assert.ok(byPassword.user);
    assert.ok(byPin.user);
    assert.equal(byPassword.user?.id, "u-owner");
    assert.equal(byPin.user?.pin, "1001");
  });

  it("rematerializes on login even if the client already stored blank secrets", () => {
    const stored = snap([{ ...owner, password: "", pin: "" }]);
    const byPassword = matchLocalPassword(stored, "owner", "ochag", seedUsers);
    const byPin = matchLocalPin(stored, "Owner", "1001", seedUsers);
    assert.equal(byPassword.user?.password, "ochag");
    assert.equal(byPin.user?.pin, "1001");
  });

  it("falls back to createSeed() when the sample has no owner secrets", () => {
    const broken = snap([{ ...owner, id: "x-owner", email: "x-owner", password: "", pin: "" }]);
    const fallback = snap([owner]);
    const fixed = ensureSampleCredentials(broken, seedUsers, () => fallback);
    assert.equal(fixed.users[0]?.email, "owner");
    assert.equal(fixed.users[0]?.password, "ochag");
    assert.equal(fixed.users[0]?.pin, "1001");
  });
});
