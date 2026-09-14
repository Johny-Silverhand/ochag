import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { secretsEqual } from "./secrets.ts";

describe("secretsEqual", () => {
  it("accepts matching strings", () => {
    assert.equal(secretsEqual("ochag", "ochag"), true);
    assert.equal(secretsEqual("", ""), true);
  });

  it("rejects mismatches of same or different length", () => {
    assert.equal(secretsEqual("ochag", "ochaf"), false);
    assert.equal(secretsEqual("ochag", "x"), false);
    assert.equal(secretsEqual("pin", "1001"), false);
  });
});
