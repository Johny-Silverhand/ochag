import { createMemoryRepository } from "./memory";
import type { OpsRepository, StoreSource } from "./types";

export type { OpsRepository, StoreSource } from "./types";

const globalRef = globalThis as typeof globalThis & {
  __ochagRepo__?: Promise<OpsRepository>;
};

/**
 * Default is the in-memory seed. Set OCHAG_STORE=json to persist locally.
 * Postgres is prepared (migrations + this switch) but not opened yet —
 * DATABASE_URL is ignored on purpose until the owner plugs it in.
 */
export function resolveStoreSource(): StoreSource {
  const raw = (typeof process !== "undefined" ? process.env.OCHAG_STORE : undefined)?.trim();
  if (raw === "json") return "json";
  if (raw === "postgres" || raw === "neon") {
    console.warn("[ochag] OCHAG_STORE=postgres is prepared but not wired. Using memory.");
  }
  return "memory";
}

export function getRepo(): Promise<OpsRepository> {
  globalRef.__ochagRepo__ ??= (async () => {
    const source = resolveStoreSource();
    if (source === "json") {
      const { createJsonRepository } = await import("./json-file");
      return createJsonRepository();
    }
    return createMemoryRepository();
  })();
  return globalRef.__ochagRepo__;
}
