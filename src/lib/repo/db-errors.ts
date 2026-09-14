/** Map Neon/Postgres/network failures to a stable Russian message for the UI. */

export const DB_UNAVAILABLE_MSG = "База временно недоступна";

export class StoreUnavailableError extends Error {
  readonly status = 503;
  constructor(message = DB_UNAVAILABLE_MSG) {
    super(message);
    this.name = "StoreUnavailableError";
  }
}

const RETRYABLE =
  /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|connection terminated|connection timeout|timeout expired|too many clients|remaining connection slots|the database system is starting up|can't connect|cannot connect|server closed the connection|Connection terminated unexpectedly|sorry, too many clients|connect ETIMEDOUT|Client has encountered a connection error|57P03|57P01|08006|08001|08003|08000|53300/i;

const OPAQUE_INFRA =
  /failed to fetch|networkerror|load failed|fetch failed|unexpected token|internal server error|function invocation|upstream|socket hang up|json\.parse|HTTP 5\d\d|status 5\d\d/i;

const DB_MISCONFIG =
  /password authentication failed|no pg_hba\.conf|SSL connection has been closed|DATABASE_URL/i;

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  return "";
}

function codeOf(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

export function isRetryableDbError(err: unknown): boolean {
  const code = codeOf(err);
  if (/^(08|57P|53300|ECONN|ETIMED|ENOTFOUND|EAI_AGAIN)/i.test(code)) return true;
  return RETRYABLE.test(`${code} ${messageOf(err)}`);
}

export function isDbUnavailableError(err: unknown): boolean {
  if (err instanceof StoreUnavailableError) return true;
  const msg = messageOf(err);
  if (msg === DB_UNAVAILABLE_MSG) return true;
  if (isRetryableDbError(err)) return true;
  if (DB_MISCONFIG.test(msg)) return true;
  return OPAQUE_INFRA.test(msg);
}

export function wrapDbError(err: unknown): Error {
  if (err instanceof StoreUnavailableError) return err;
  if (isDbUnavailableError(err)) return new StoreUnavailableError();
  return err instanceof Error ? err : new Error(String(err));
}

export function publicErrorMessage(err: unknown, fallback = "Ошибка контура"): string {
  if (isDbUnavailableError(err)) return DB_UNAVAILABLE_MSG;
  const msg = messageOf(err).trim();
  if (!msg) return fallback;
  if (OPAQUE_INFRA.test(msg)) return DB_UNAVAILABLE_MSG;
  if (!/[А-Яа-яЁё]/.test(msg) && /error|timeout|connect|postgres|neon|sql|pool/i.test(msg)) {
    return DB_UNAVAILABLE_MSG;
  }
  return msg;
}

/** Client-side: never show raw HTTP/JSON/Node text on login, onboard, billing. */
export function clientErrorMessage(err: unknown, fallback = "Не удалось выполнить запрос. Попробуйте ещё раз."): string {
  const msg = messageOf(err).trim();
  if (!msg) return fallback;
  if (msg === DB_UNAVAILABLE_MSG || isDbUnavailableError(err)) return DB_UNAVAILABLE_MSG;
  if (OPAQUE_INFRA.test(msg) || /^HTTP\s*[45]\d\d/i.test(msg) || /unexpected end of json/i.test(msg)) {
    if (/^HTTP\s*401/i.test(msg) || /^HTTP\s*403/i.test(msg)) return fallback;
    if (/^HTTP\s*5\d\d/i.test(msg) || OPAQUE_INFRA.test(msg)) return DB_UNAVAILABLE_MSG;
    return fallback;
  }
  if (!/[А-Яа-яЁё]/.test(msg) && /error|timeout|connect|postgres|neon|sql|pool|fetch/i.test(msg)) {
    return DB_UNAVAILABLE_MSG;
  }
  return msg;
}

export async function withDbRetry<T>(fn: () => Promise<T>, pauseMs = 400): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRetryableDbError(err)) throw wrapDbError(err);
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
    try {
      return await fn();
    } catch (again) {
      throw wrapDbError(again);
    }
  }
}
