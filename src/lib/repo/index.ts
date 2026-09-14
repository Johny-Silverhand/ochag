import { createMemoryRepository } from "./memory";
import { hasDatabaseUrl, resolveStoreSource } from "./store-source";
import type { OpsRepository, StoreSource } from "./types";

export type { OpsRepository, StoreSource } from "./types";
export { hasDatabaseUrl, resolveStoreSource } from "./store-source";

const globalRef = globalThis as typeof globalThis & {
  __ochagRepo__?: Promise<OpsRepository>;
};

export function getRepo(): Promise<OpsRepository> {
  globalRef.__ochagRepo__ ??= (async () => {
    const source = resolveStoreSource();
    if (source === "json") {
      const { createJsonRepository } = await import("./json-file");
      return createJsonRepository();
    }
    if (source === "neon") {
      const { createPostgresRepository } = await import("./postgres");
      return createPostgresRepository("neon");
    }
    return createMemoryRepository();
  })().catch((err) => {
    globalRef.__ochagRepo__ = undefined;
    throw err;
  });
  return globalRef.__ochagRepo__;
}

/** Test helper: drop the memoized repo so the next getRepo() re-reads env. */
export function resetRepoCache() {
  globalRef.__ochagRepo__ = undefined;
}
