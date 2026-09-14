import { emptySnapshot } from "../data/empty";
import { createSeed } from "../data/seed";
import { normalizeSnapshot } from "../data/normalize";
import { protectStoredUsers } from "../data/preserve-users";
import { retainSecrets } from "../data/secrets";
import { publicSnapshot } from "../domain/finance";
import type { Snapshot } from "../domain/types";
import type { OpsRepository, StoreSource } from "./types";

interface MemorySlot {
  snapshot: Snapshot;
  updatedAt: string;
}

const globalRef = globalThis as typeof globalThis & {
  __ochagMemory__?: MemorySlot;
};

function slot(): MemorySlot {
  globalRef.__ochagMemory__ ??= {
    snapshot: emptySnapshot(),
    updatedAt: new Date().toISOString(),
  };
  return globalRef.__ochagMemory__;
}

export function createMemoryRepository(source: StoreSource = "memory"): OpsRepository {
  return {
    source,
    async load() {
      return structuredClone(slot().snapshot);
    },
    async save(snapshot) {
      const prev = slot().snapshot;
      const guarded = protectStoredUsers(prev, normalizeSnapshot(snapshot));
      const next = retainSecrets(prev, guarded);
      slot().snapshot = next;
      slot().updatedAt = new Date().toISOString();
    },
    async reset() {
      const blank = emptySnapshot();
      slot().snapshot = blank;
      slot().updatedAt = new Date().toISOString();
      return structuredClone(blank);
    },
    async loadSample() {
      const seed = createSeed();
      slot().snapshot = seed;
      slot().updatedAt = new Date().toISOString();
      return structuredClone(seed);
    },
    async status() {
      const cur = slot();
      return {
        source,
        ready: true,
        updatedAt: cur.updatedAt,
        sales: cur.snapshot.sales.length,
      };
    },
  };
}

export function peekMemory(): Snapshot {
  return slot().snapshot;
}

export function publicPeek(): Snapshot {
  return publicSnapshot(slot().snapshot);
}
