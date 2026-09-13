import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { normalizeSnapshot } from "../data/normalize";
import { emptySnapshot } from "../data/empty";
import type { Snapshot } from "../domain/types";
import { createMemoryRepository } from "./memory";
import type { OpsRepository } from "./types";

const DEFAULT_PATH = resolve(process.cwd(), ".data/ochag.json");

async function readJson(path: string): Promise<Snapshot | null> {
  try {
    const raw = await readFile(path, "utf8");
    return normalizeSnapshot(JSON.parse(raw) as Snapshot);
  } catch {
    return null;
  }
}

export function createJsonRepository(filePath = DEFAULT_PATH): OpsRepository {
  const memory = createMemoryRepository("json");
  let hydrated = false;

  async function hydrate() {
    if (hydrated) return;
    const disk = await readJson(filePath);
    if (disk) await memory.save(disk);
    else {
      const blank = emptySnapshot();
      await memory.save(blank);
      await persist(blank);
    }
    hydrated = true;
  }

  async function persist(snapshot: Snapshot) {
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(snapshot), "utf8");
    } catch (err) {
      console.warn("[ochag] JSON store is read-only, staying in memory:", err);
    }
  }

  return {
    source: "json",
    async load() {
      await hydrate();
      return memory.load();
    },
    async save(snapshot) {
      await hydrate();
      await memory.save(snapshot);
      await persist(await memory.load());
    },
    async reset() {
      await hydrate();
      const blank = await memory.reset();
      await persist(blank);
      return blank;
    },
    async loadSample() {
      await hydrate();
      const seed = memory.loadSample ? await memory.loadSample() : await memory.reset();
      await persist(seed);
      return seed;
    },
    async status() {
      await hydrate();
      return memory.status();
    },
  };
}
