import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryRepository } from "./memory.ts";

describe("memory repository", () => {
  it("loads seed and survives a save/reset cycle", async () => {
    const repo = createMemoryRepository();
    const first = await repo.load();
    assert.ok(first.sales.length > 0);
    assert.ok(first.stopList.length >= 0);
    first.sales = [];
    await repo.save(first);
    const saved = await repo.load();
    assert.equal(saved.sales.length, 0);
    const reset = await repo.reset();
    assert.ok(reset.sales.length > 0);
  });
});
