import type { Snapshot } from "../domain/types";

export type StoreSource = "memory" | "json" | "pglite" | "neon";

export interface OpsRepository {
  source: StoreSource;
  load(): Promise<Snapshot>;
  save(snapshot: Snapshot): Promise<void>;
  reset(): Promise<Snapshot>;
  loadSample?(): Promise<Snapshot>;
  status(): Promise<{ source: StoreSource; ready: boolean; updatedAt: string | null; sales: number }>;
}
