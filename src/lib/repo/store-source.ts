import type { StoreSource } from "./types";

export function hasDatabaseUrl() {
  const raw = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
  return Boolean(raw && raw.trim());
}

/**
 * Production on Vercel must not stay on the default in-memory snapshot:
 * a new serverless instance drops every account. When DATABASE_URL is set,
 * use Postgres unless OCHAG_STORE explicitly asks for memory or json.
 */
export function resolveStoreSource(): StoreSource {
  const raw = (typeof process !== "undefined" ? process.env.OCHAG_STORE : undefined)?.trim().toLowerCase();
  if (raw === "json") return "json";
  if (raw === "memory") return "memory";
  if (raw === "postgres" || raw === "neon" || !raw) {
    if (hasDatabaseUrl()) return "neon";
    if (raw === "postgres" || raw === "neon") {
      console.warn("[ochag] OCHAG_STORE=postgres but DATABASE_URL is empty. Using memory.");
    }
  }
  return "memory";
}
