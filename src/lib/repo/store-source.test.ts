import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasDatabaseUrl, resolveStoreSource } from "./store-source.ts";

describe("resolveStoreSource", { concurrency: false }, () => {
  const prevStore = process.env.OCHAG_STORE;
  const prevDb = process.env.DATABASE_URL;

  function restore() {
    if (prevStore === undefined) delete process.env.OCHAG_STORE;
    else process.env.OCHAG_STORE = prevStore;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
  }

  it("uses neon when DATABASE_URL is set and OCHAG_STORE is unset", () => {
    try {
      delete process.env.OCHAG_STORE;
      process.env.DATABASE_URL = "postgres://example/db";
      assert.equal(hasDatabaseUrl(), true);
      assert.equal(resolveStoreSource(), "neon");
    } finally {
      restore();
    }
  });

  it("keeps an explicit memory store even with DATABASE_URL", () => {
    try {
      process.env.OCHAG_STORE = "memory";
      process.env.DATABASE_URL = "postgres://example/db";
      assert.equal(resolveStoreSource(), "memory");
    } finally {
      restore();
    }
  });

  it("falls back to memory without DATABASE_URL", () => {
    try {
      delete process.env.OCHAG_STORE;
      delete process.env.DATABASE_URL;
      assert.equal(hasDatabaseUrl(), false);
      assert.equal(resolveStoreSource(), "memory");
    } finally {
      restore();
    }
  });

  it("treats postgres/neon aliases as neon when the URL is present", () => {
    try {
      process.env.OCHAG_STORE = "postgres";
      process.env.DATABASE_URL = "postgres://example/db";
      assert.equal(resolveStoreSource(), "neon");
      process.env.OCHAG_STORE = "neon";
      assert.equal(resolveStoreSource(), "neon");
    } finally {
      restore();
    }
  });
});
