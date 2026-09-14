import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySnapshot } from "./empty.ts";
import { applyEnsureBootstrap, envBootstrapInput, readBootstrapEnv, rematerializeBootstrapSecrets, rematerializeLoginSecrets, repairLegacySnapshot, shouldSkipEnvBootstrap } from "./bootstrap.ts";
import type { Snapshot } from "../domain/types.ts";
import type { BootstrapInput } from "./bootstrap.ts";

function stubBootstrap(snap: Snapshot, input: BootstrapInput): Snapshot {
  return {
    ...snap,
    branches: [
      {
        id: "br-1",
        name: input.branchName,
        short: input.branchName.slice(0, 16),
        city: input.city,
        address: input.address,
        seats: 40,
        phone: "",
      },
    ],
    users: [
      {
        id: "u-tech",
        name: input.name,
        email: input.login,
        password: input.password,
        pin: input.pin,
        role: "tech_admin",
        position: "Администратор-техник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
        disabled: false,
      },
    ],
  };
}

describe("bootstrap env", () => {
  it("returns null until login, password and PIN are set", () => {
    const prev = {
      login: process.env.OCHAG_BOOTSTRAP_LOGIN,
      password: process.env.OCHAG_BOOTSTRAP_PASSWORD,
      pin: process.env.OCHAG_BOOTSTRAP_PIN,
    };
    delete process.env.OCHAG_BOOTSTRAP_LOGIN;
    delete process.env.OCHAG_BOOTSTRAP_PASSWORD;
    delete process.env.OCHAG_BOOTSTRAP_PIN;
    try {
      assert.equal(envBootstrapInput(), null);
      process.env.OCHAG_BOOTSTRAP_LOGIN = "admin";
      process.env.OCHAG_BOOTSTRAP_PASSWORD = "secret";
      process.env.OCHAG_BOOTSTRAP_PIN = "9999";
      const input = envBootstrapInput();
      assert.ok(input);
      assert.equal(input.login, "admin");
      assert.equal(readBootstrapEnv().token, process.env.OCHAG_BOOTSTRAP_TOKEN?.trim() ?? "");
    } finally {
      if (prev.login === undefined) delete process.env.OCHAG_BOOTSTRAP_LOGIN;
      else process.env.OCHAG_BOOTSTRAP_LOGIN = prev.login;
      if (prev.password === undefined) delete process.env.OCHAG_BOOTSTRAP_PASSWORD;
      else process.env.OCHAG_BOOTSTRAP_PASSWORD = prev.password;
      if (prev.pin === undefined) delete process.env.OCHAG_BOOTSTRAP_PIN;
      else process.env.OCHAG_BOOTSTRAP_PIN = prev.pin;
    }
  });

  it("leaves an empty snapshot empty so commercial onboard can run", () => {
    const input: BootstrapInput = {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    };
    const first = applyEnsureBootstrap(emptySnapshot(), input, stubBootstrap);
    assert.equal(first.users.length, 0);
  });

  it("does not recreate when a tech_admin already exists", () => {
    const input: BootstrapInput = {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    };
    const seeded = stubBootstrap(emptySnapshot(), input);
    const again = applyEnsureBootstrap(seeded, { ...input, password: "other", pin: "1111" }, stubBootstrap);
    assert.equal(again.users.length, 1);
    assert.equal(again.users[0]?.password, "secret");
    assert.equal(again.users[0]?.pin, "9999");
  });

  it("does not inject a technician into a commercially onboarded network", () => {
    const input: BootstrapInput = {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    };
    const commercial = emptySnapshot();
    commercial.settings = { ...commercial.settings, tariff: "basic", paymentSimulatedAt: "2026-09-14T12:00:00.000Z" };
    commercial.users = [
      {
        id: "u-cafe",
        name: "Мария",
        email: "maria",
        password: "cafe",
        pin: "2002",
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    const next = applyEnsureBootstrap(commercial, input, stubBootstrap);
    assert.equal(next.users.length, 1);
    assert.equal(next.users[0]?.email, "maria");
  });

  it("inserts a tech_admin into a leftover sample network without wiping staff", () => {
    const leftover = emptySnapshot();
    leftover.users = [
      {
        id: "u-owner",
        name: "Кирилл Сорокин",
        email: "owner",
        password: "ochag",
        pin: "",
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ];
    leftover.branches = [
      {
        id: "br-pushkin",
        name: "Очаг на Пушкина",
        short: "Пушкина",
        city: "Краснодар",
        address: "ул. Пушкина, 18",
        seats: 48,
        phone: "",
      },
    ];
    const repaired = repairLegacySnapshot(leftover);
    assert.equal(repaired.users[0]?.pin, "1001");
    const next = applyEnsureBootstrap(
      leftover,
      {
        name: "Техник",
        login: "admin",
        password: "secret",
        pin: "9999",
        branchName: "Центр",
        city: "—",
        address: "—",
      },
      stubBootstrap,
    );
    assert.equal(next.users.length, 2);
    assert.equal(next.users[0]?.role, "tech_admin");
    assert.equal(next.users[0]?.email, "admin");
    assert.equal(next.users.some((u) => u.email === "owner"), true);
    assert.equal(next.branches[0]?.id, "br-pushkin");
  });

  it("skips env bootstrap while a simulated payment waits for Создать сеть", () => {
    const paid = emptySnapshot();
    paid.settings = { ...paid.settings, tariff: "basic", paymentSimulatedAt: "2026-09-14T12:00:00.000Z" };
    assert.equal(shouldSkipEnvBootstrap(paid), true);
    assert.equal(shouldSkipEnvBootstrap(emptySnapshot()), false);
  });

  it("fills blank bootstrap tech secrets after a restore wipe", () => {
    const input: BootstrapInput = {
      name: "Техник",
      login: "admin",
      password: "secret",
      pin: "9999",
      branchName: "Центр",
      city: "Краснодар",
      address: "ул. Красная, 1",
    };
    const wiped = stubBootstrap(emptySnapshot(), input);
    wiped.users[0] = { ...wiped.users[0]!, id: "u-boot-admin", password: "", pin: "" };
    const filled = rematerializeBootstrapSecrets(wiped, input);
    assert.equal(filled.users[0]?.password, "secret");
    assert.equal(filled.users[0]?.pin, "9999");
    assert.equal(filled.users[0]?.id, "u-boot-admin");
    const next = applyEnsureBootstrap(wiped, { ...input, password: "other", pin: "1111" }, stubBootstrap);
    assert.equal(next.users[0]?.password, "other");
    assert.equal(next.users[0]?.pin, "1111");
    assert.equal(next.users.length, 1);
    const live = applyEnsureBootstrap(filled, { ...input, password: "other", pin: "1111" }, stubBootstrap);
    assert.equal(live.users[0]?.password, "secret");
  });

  it("rematerializeLoginSecrets prefers bootstrap env over seed ochag", () => {
    const prev = {
      login: process.env.OCHAG_BOOTSTRAP_LOGIN,
      password: process.env.OCHAG_BOOTSTRAP_PASSWORD,
      pin: process.env.OCHAG_BOOTSTRAP_PIN,
    };
    process.env.OCHAG_BOOTSTRAP_LOGIN = "admin";
    process.env.OCHAG_BOOTSTRAP_PASSWORD = "wake-up";
    process.env.OCHAG_BOOTSTRAP_PIN = "7777";
    try {
      const wiped = emptySnapshot();
      wiped.users = [
        {
          id: "u-boot-admin",
          name: "Техник",
          email: "admin",
          password: "",
          pin: "",
          role: "tech_admin",
          position: "Администратор-техник",
          branchId: null,
          shiftPay: 0,
          salesPercent: 0,
          phone: "",
        },
      ];
      const out = rematerializeLoginSecrets(wiped);
      assert.equal(out.users[0]?.password, "wake-up");
      assert.equal(out.users[0]?.pin, "7777");
    } finally {
      if (prev.login === undefined) delete process.env.OCHAG_BOOTSTRAP_LOGIN;
      else process.env.OCHAG_BOOTSTRAP_LOGIN = prev.login;
      if (prev.password === undefined) delete process.env.OCHAG_BOOTSTRAP_PASSWORD;
      else process.env.OCHAG_BOOTSTRAP_PASSWORD = prev.password;
      if (prev.pin === undefined) delete process.env.OCHAG_BOOTSTRAP_PIN;
      else process.env.OCHAG_BOOTSTRAP_PIN = prev.pin;
    }
  });
});
