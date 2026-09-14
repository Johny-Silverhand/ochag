import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatHandoff, generatePassword, generatePin } from "./credentials.ts";

describe("credentials", () => {
  it("generates a PIN of four digits and a password of at least 8 chars", () => {
    const pin = generatePin();
    assert.match(pin, /^\d{4}$/);
    const password = generatePassword();
    assert.equal(password.length, 10);
    assert.match(password, /^[a-z0-9]+$/);
  });

  it("formats a copyable handoff block", () => {
    const text = formatHandoff({
      name: "Анна",
      login: "anna",
      password: "secret12",
      pin: "2200",
      roleLabel: "Управляющий",
    });
    assert.match(text, /Логин: anna/);
    assert.match(text, /Пароль: secret12/);
    assert.match(text, /PIN: 2200/);
  });
});
