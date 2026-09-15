import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cashDiscrepancy, parseMoney } from "./money.ts";

describe("parseMoney", () => {
  it("reads spaces, currency and comma decimals", () => {
    assert.equal(parseMoney("5 000"), 5000);
    assert.equal(parseMoney("5000р"), 5000);
    assert.equal(parseMoney("5.000,50"), 5000.5);
    assert.equal(parseMoney("-6500"), -6500);
    assert.equal(parseMoney(""), 0);
  });
});

describe("cashDiscrepancy", () => {
  it("keeps the sign of a negative expected till", () => {
    assert.equal(cashDiscrepancy(5000, -6500), 11500);
  });

  it("does not treat a new till extra as already in expected", () => {
    assert.equal(cashDiscrepancy(5000, -6500, 0), 11500);
    assert.equal(cashDiscrepancy(5000, -3500, 3000), 11500);
  });
});
