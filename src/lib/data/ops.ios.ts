import type { Snapshot } from "../domain/types";
import { createSeed } from "./seed";

const KEY = "ochag-ops-ios-v1";

function read(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function write(snap: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap));
}

export async function getOpsStatus() {
  const snap = read();
  return {
    source: "pglite" as const,
    ready: Boolean(snap),
    updatedAt: snap ? new Date().toISOString() : null,
    sales: snap?.sales.length ?? 0,
  };
}

export async function loadOpsSnapshot(): Promise<Snapshot> {
  const existing = read();
  if (existing) return existing;
  const seed = createSeed();
  write(seed);
  return seed;
}

export async function saveOpsSnapshot(input: { data: Snapshot } | Snapshot) {
  const snap = input && typeof input === "object" && "data" in input ? input.data : input;
  write(snap);
  return { ok: true as const, at: new Date().toISOString() };
}

export async function resetOpsSnapshot(): Promise<Snapshot> {
  const seed = createSeed();
  write(seed);
  return seed;
}
