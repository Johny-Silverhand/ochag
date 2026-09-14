/**
 * Durable snapshot store: one JSONB row in `ops_state` (migrations/0002_ops.sql).
 * Normalized tables in 0003_core.sql stay for later; the running app still
 * mutates a Snapshot document so we do not rewrite the domain layer.
 */
import { emptySnapshot } from "../data/empty";
import { normalizeSnapshot } from "../data/normalize";
import { rematerializeSeedSecrets, retainSecrets, SEED_LOGIN_PEERS } from "../data/secrets";
import { createSeed } from "../data/seed";
import type { Snapshot } from "../domain/types";
import { withDbRetry } from "./db-errors";
import type { OpsRepository, StoreSource } from "./types";

type QuerySql = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export const OPS_STATE_ID = "ochag";

const ENSURE_SQL = `
create table if not exists ops_state (
  id         text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
)
`;

function asPayload(value: unknown): Snapshot {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeSnapshot(value as Snapshot);
  }
  if (typeof value === "string") {
    try {
      return normalizeSnapshot(JSON.parse(value) as Snapshot);
    } catch {
      return emptySnapshot();
    }
  }
  return emptySnapshot();
}

function toJson(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}

export function createPostgresRepository(
  source: StoreSource = "neon",
  sqlProvider: () => Promise<QuerySql> = async () => {
    const { getSql } = await import("../db");
    return getSql();
  },
): OpsRepository {
  let ensured = false;

  async function sql(): Promise<QuerySql> {
    const client = await withDbRetry(() => sqlProvider());
    if (!ensured) {
      await withDbRetry(() => client.query(ENSURE_SQL));
      ensured = true;
    }
    return client;
  }

  async function read(): Promise<{ snap: Snapshot; updatedAt: string | null }> {
    const client = await sql();
    const rows = await withDbRetry(() =>
      client.query<{ payload: unknown; updated_at: string | Date | null }>(
        "select payload, updated_at from ops_state where id = $1",
        [OPS_STATE_ID],
      ),
    );
    const row = rows[0];
    if (!row) return { snap: emptySnapshot(), updatedAt: null };
    const updatedAt =
      row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at ? String(row.updated_at) : null;
    const snap = rematerializeSeedSecrets(asPayload(row.payload), SEED_LOGIN_PEERS);
    return { snap, updatedAt };
  }

  async function write(snapshot: Snapshot): Promise<Snapshot> {
    const client = await sql();
    const prev = (await read()).snap;
    const next = rematerializeSeedSecrets(retainSecrets(prev, normalizeSnapshot(snapshot)), SEED_LOGIN_PEERS);
    const now = new Date().toISOString();
    await withDbRetry(() =>
      client.query(
        `insert into ops_state (id, payload, updated_at)
         values ($1, $2::jsonb, $3::timestamptz)
         on conflict (id) do update set payload = excluded.payload, updated_at = excluded.updated_at`,
        [OPS_STATE_ID, toJson(next), now],
      ),
    );
    return next;
  }

  return {
    source,
    async load() {
      return (await read()).snap;
    },
    async save(snapshot) {
      await write(snapshot);
    },
    async reset() {
      const blank = emptySnapshot();
      await write(blank);
      return structuredClone(blank);
    },
    async loadSample() {
      const seed = createSeed();
      await write(seed);
      return structuredClone(seed);
    },
    async status() {
      try {
        const cur = await read();
        return {
          source,
          ready: true,
          updatedAt: cur.updatedAt,
          sales: cur.snap.sales.length,
        };
      } catch {
        return { source, ready: false, updatedAt: null, sales: 0 };
      }
    },
  };
}
