import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryRepository } from "./memory.ts";
import { isOnboarded } from "../data/empty.ts";

describe("memory repository", () => {
  it("starts empty and loads the sample only on demand", async () => {
    const repo = createMemoryRepository();
    const first = await repo.load();
    assert.equal(first.sales.length, 0);
    assert.equal(isOnboarded(first), false);
    first.sales = [];
    await repo.save(first);
    const saved = await repo.load();
    assert.equal(saved.sales.length, 0);
    const reset = await repo.reset();
    assert.equal(reset.sales.length, 0);
    assert.equal(isOnboarded(reset), false);
    const sample = repo.loadSample ? await repo.loadSample() : reset;
    assert.ok(sample.sales.length > 0);
    assert.equal(sample.settings.sampleLoaded, true);
  });
});
