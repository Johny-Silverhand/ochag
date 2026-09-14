import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { envBootstrapInput, readBootstrapEnv } from "./bootstrap.ts";

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
});
