import { AuthzError } from "../authz/error.ts";
import { isProductionRuntime } from "../authz/jwt.ts";
import { publicErrorMessage } from "../repo/db-errors.ts";

const buckets = new Map<string, { n: number; t: number }>();

export const AUTH_RATE_MAX = 20;
export const AUTH_RATE_WINDOW_MS = 60_000;
export const MAX_JSON_BYTES = 1_500_000;
export const LOGIN_FAIL_LIMIT = 8;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const first = forwarded.split(",")[0]?.trim() ?? "";
  return first.slice(0, 64) || "unknown";
}

export function rateLimit(key: string, max = AUTH_RATE_MAX, windowMs = AUTH_RATE_WINDOW_MS) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now - cur.t > windowMs) {
    buckets.set(key, { n: 1, t: now });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (now - v.t > windowMs) buckets.delete(k);
      }
    }
    return { ok: true as const, remaining: max - 1 };
  }
  cur.n += 1;
  if (cur.n > max) return { ok: false as const, remaining: 0 };
  return { ok: true as const, remaining: Math.max(0, max - cur.n) };
}

export function assertAuthRate(request: Request, login?: string) {
  const ip = clientIp(request);
  const ipHit = rateLimit(`auth:ip:${ip}`);
  if (!ipHit.ok) throw new AuthzError("Слишком много попыток входа. Подождите минуту.", 429);
  if (login) {
    const loginHit = rateLimit(`auth:login:${login.toLowerCase()}`, 12, AUTH_RATE_WINDOW_MS);
    if (!loginHit.ok) throw new AuthzError("Слишком много попыток для этого логина. Подождите минуту.", 429);
  }
}

export function assertWriteRate(request: Request, userId: string) {
  const hit = rateLimit(`write:${userId}:${clientIp(request)}`, 120, AUTH_RATE_WINDOW_MS);
  if (!hit.ok) throw new AuthzError("Слишком много запросов. Подождите минуту.", 429);
}

export function securityHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("origin") ?? "";
  const self = request ? new URL(request.url).origin : "";
  const allowOrigin = origin && (origin === self || allowedOrigin(origin)) ? origin : "";
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "x-frame-options": "DENY",
    "content-security-policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://grok.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    ...(allowOrigin
      ? {
          "access-control-allow-origin": allowOrigin,
          vary: "Origin",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
        }
      : {}),
  };
}

function allowedOrigin(origin: string) {
  const extra = (typeof process !== "undefined" ? process.env.OCHAG_APP_ORIGIN : undefined)?.trim();
  if (extra && origin === extra.replace(/\/$/, "")) return true;
  return false;
}

export function assertSameOriginOrNone(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const self = new URL(request.url).origin;
  if (origin === self || allowedOrigin(origin)) return;
  throw new AuthzError("Источник запроса не разрешён", 403);
}

export function assertPayloadSize(request: Request, text: string) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_JSON_BYTES || text.length > MAX_JSON_BYTES) {
    throw new AuthzError("Слишком большой запрос", 413);
  }
}

export function opaqueApiError(err: unknown): string {
  if (err instanceof AuthzError) return err.message;
  const msg = publicErrorMessage(err);
  if (isProductionRuntime() && !/[А-Яа-яЁё]/.test(msg)) return "Ошибка контура";
  return msg;
}

/** Reset in-memory buckets — tests only. */
export function resetRateLimits() {
  buckets.clear();
}
