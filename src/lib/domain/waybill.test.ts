import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySnapshot } from "../data/empty.ts";
import { transferLegs } from "../reports/pdf.ts";
import type { Snapshot, StockMovement } from "./types.ts";

function mov(partial: Partial<StockMovement> & Pick<StockMovement, "id" | "qty">): StockMovement {
  return {
    at: "2026-09-14T12:00:00.000Z",
    branchId: "br-a",
    productId: "prd-1",
    type: "transfer",
    cost: 100,
    userId: "u1",
    refId: "tr-1",
    counterpartBranchId: "br-b",
    ...partial,
  };
}

describe("transfer waybill legs", () => {
  it("groups both warehouse legs by refId", () => {
    const snap = {
      ...emptySnapshot(),
      movements: [mov({ id: "in", qty: 4, branchId: "br-b", counterpartBranchId: "br-a" }), mov({ id: "out", qty: -4 })],
    } as Snapshot;
    const legs = transferLegs(snap, "tr-1");
    assert.equal(legs.length, 2);
    assert.equal(legs[0]?.qty, -4);
    assert.equal(legs[1]?.qty, 4);
  });

  it("does not invent a waybill for a missing transfer", () => {
    assert.throws(() => transferLegs(emptySnapshot(), "nope"), /не найдена/);
  });
});
