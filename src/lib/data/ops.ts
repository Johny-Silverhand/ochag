import { createServerFn } from "@tanstack/react-start";
import type { Snapshot } from "../domain/types";
import { normalizeSnapshot } from "./normalize";

function asSnapshot(value: unknown): Snapshot {
  return normalizeSnapshot(value as Snapshot);
}

export const getOpsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getRepo } = await import("@/lib/repo");
  const repo = await getRepo();
  return repo.status();
});

export const loadOpsSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const { getRepo } = await import("@/lib/repo");
  const repo = await getRepo();
  return repo.load();
});

export const saveOpsSnapshot = createServerFn({ method: "POST" })
  .validator((input: unknown) => asSnapshot(input))
  .handler(async ({ data }) => {
    const { getRepo } = await import("@/lib/repo");
    const repo = await getRepo();
    await repo.save(data);
    return { ok: true as const, at: new Date().toISOString() };
  });

export const resetOpsSnapshot = createServerFn({ method: "POST" }).handler(async () => {
  const { getRepo } = await import("@/lib/repo");
  const repo = await getRepo();
  return repo.reset();
});

export const loadSampleOpsSnapshot = createServerFn({ method: "POST" }).handler(async () => {
  const { getRepo } = await import("@/lib/repo");
  const repo = await getRepo();
  if (repo.loadSample) return repo.loadSample();
  const { createSeed } = await import("./seed");
  const seed = createSeed();
  await repo.save(seed);
  return seed;
});
