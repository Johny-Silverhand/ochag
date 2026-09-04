import type { Snapshot } from "../domain/types";
import { createSeed } from "./seed";

async function readJson<T>(url: string, fallback?: T): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 404 && fallback !== undefined) return fallback;
  if (!r.ok) throw new Error("Локальный контур недоступен");
  return r.json() as Promise<T>;
}

export async function getOpsStatus() {
  return readJson<{ source: "neon" | "pglite"; ready: boolean; updatedAt: string | null; sales: number }>(
    "/_ops/status",
    { source: "pglite", ready: false, updatedAt: null, sales: 0 },
  );
}

export async function loadOpsSnapshot(): Promise<Snapshot> {
  const r = await fetch("/_ops/snapshot", { cache: "no-store" });
  if (r.status === 404 || !r.ok) {
    const seed = createSeed();
    await saveOpsSnapshot({ data: seed });
    return seed;
  }
  return r.json() as Promise<Snapshot>;
}

export async function saveOpsSnapshot(input: { data: Snapshot } | Snapshot) {
  const snap = input && typeof input === "object" && "data" in input ? input.data : input;
  const r = await fetch("/_ops/snapshot", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snap),
  });
  if (!r.ok) throw new Error("Не удалось записать снимок");
  return { ok: true as const, at: new Date().toISOString() };
}

export async function resetOpsSnapshot(): Promise<Snapshot> {
  const seed = createSeed();
  await saveOpsSnapshot({ data: seed });
  return seed;
}
