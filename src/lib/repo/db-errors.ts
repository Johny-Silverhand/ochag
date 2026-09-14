/** Map Neon/Postgres/network failures to a stable Russian message for the UI. */

export const DB_UNAVAILABLE_MSG = "База временно недоступна";
export const DB_WAIT_MSG = "База временно недоступна, подождите";

export class StoreUnavailableError extends Error {
  readonly status = 503;
  constructor(message = DB_UNAVAILABLE_MSG) {
    super(message);
    this.name = "StoreUnavailableError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
  if (msg === DB_UNAVAILABLE_MSG || msg === DB_WAIT_MSG) return true;
  if (isRetryableDbError(err)) return true;
  if (DB_MISCONFIG.test(msg)) return true;
  return OPAQUE_INFRA.test(msg);
}

export function isTransientHttpStatus(status: number) {
  return status === 0 || status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

export function isTransientClientFailure(err: unknown): boolean {
  if (err instanceof ApiError && isTransientHttpStatus(err.status)) return true;
  if (err instanceof StoreUnavailableError) return true;
  return isDbUnavailableError(err);
}

export function isUnauthorizedFailure(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 401;
  const msg = messageOf(err);
  return /сессия истекла|нужен вход/i.test(msg);
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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
  if (msg === DB_WAIT_MSG || msg === DB_UNAVAILABLE_MSG || isDbUnavailableError(err)) return DB_WAIT_MSG;
  if (OPAQUE_INFRA.test(msg) || /^HTTP\s*[45]\d\d/i.test(msg) || /unexpected end of json/i.test(msg)) {
    if (/^HTTP\s*401/i.test(msg) || /^HTTP\s*403/i.test(msg)) return fallback;
    if (/^HTTP\s*5\d\d/i.test(msg) || OPAQUE_INFRA.test(msg)) return DB_WAIT_MSG;
    return fallback;
  }
  if (!/[А-Яа-яЁё]/.test(msg) && /error|timeout|connect|postgres|neon|sql|pool|fetch/i.test(msg)) {
    return DB_WAIT_MSG;
  }
  return msg;
}

export async function withDbRetry<T>(fn: () => Promise<T>, pauseMs = 1000): Promise<T> {
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
