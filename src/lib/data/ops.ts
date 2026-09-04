import { createServerFn } from "@tanstack/react-start";
import type { Snapshot } from "../domain/types";

const OPS_ID = "ochag";

function asSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== "object") {
    throw new Error("Пустой снимок операций");
  }
  return value as Snapshot;
}

export const getOpsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql, dbSource } = await import("@/lib/db");
  const sql = await getSql();
  const row = (
    await sql<{ updated_at: string; n_sales: number }>`
      select updated_at,
        coalesce(jsonb_array_length(payload->'sales'), 0)::int as n_sales
      from ops_state
      where id = ${OPS_ID}
    `
  )[0];
  return {
    source: dbSource,
    ready: Boolean(row),
    updatedAt: row?.updated_at ?? null,
    sales: row?.n_sales ?? 0,
  };
});

export const loadOpsSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { createSeed } = await import("./seed");
  const sql = await getSql();
  const rows = await sql<{ payload: Snapshot }>`
    select payload from ops_state where id = ${OPS_ID}
  `;
  if (rows[0]?.payload) return asSnapshot(rows[0].payload);

  const seed = createSeed();
  await sql.query(
    "insert into ops_state (id, payload, updated_at) values ($1, $2::jsonb, now())",
    [OPS_ID, JSON.stringify(seed)],
  );
  return seed;
});

export const saveOpsSnapshot = createServerFn({ method: "POST" })
  .validator((input: unknown) => asSnapshot(input))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(
      `insert into ops_state (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [OPS_ID, JSON.stringify(data)],
    );
    return { ok: true as const, at: new Date().toISOString() };
  });

export const resetOpsSnapshot = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { createSeed } = await import("./seed");
  const sql = await getSql();
  const seed = createSeed();
  await sql.query(
    `insert into ops_state (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [OPS_ID, JSON.stringify(seed)],
  );
  return seed;
});
