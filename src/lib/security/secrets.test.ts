import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

  it("does not import node:crypto (client bundle)", () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "secrets.ts"), "utf8");
    assert.equal(src.includes("node:crypto"), false);
    assert.equal(src.includes("timingSafeEqual"), false);
  });
});
