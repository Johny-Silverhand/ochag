/**
 * Future Postgres adapter. Migrations in `migrations/0003_core.sql` match this
 * shape. Do not import from the running app until DATABASE_URL is intentionally
 * enabled — the default store is memory/JSON.
 */
import type { OpsRepository } from "./types";

export function createPostgresRepository(): OpsRepository {
  throw new Error(
    "Postgres repository is prepared but not wired. Leave DATABASE_URL unused and run on the memory store.",
  );
}
