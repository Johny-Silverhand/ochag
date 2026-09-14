import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOGIN_INTRO } from "./brand.ts";

describe("login intro copy", () => {
  it("keeps the polished product line from the login screen", () => {
    assert.match(LOGIN_INTRO, /Контур склада, смен и прибыли/);
    assert.equal(LOGIN_INTRO.includes("Новый объект — тариф"), false);
    assert.equal(LOGIN_INTRO.includes("Создать сеть"), false);
  });
});
