import { callOchagApi } from "./server";
import {
  ApiError,
  DB_WAIT_MSG,
  clientErrorMessage,
  isTransientClientFailure,
  isTransientHttpStatus,
  sleep,
} from "../repo/db-errors";

const TOKEN_KEY = "ochag-jwt";
const SLOW_PATH = /^(auth\/|health$|$)/;
const LOGIN_TIMEOUT_MS = 20_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_PAUSE_MS = 1_000;

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function userFacingApiError(status: number, data?: { error?: string }) {
  const mapped = data?.error
    ? clientErrorMessage(new Error(data.error), data.error)
    : status >= 500
      ? DB_WAIT_MSG
      : "Не удалось выполнить запрос. Попробуйте ещё раз.";
  return new ApiError(mapped, status);
}

export type StoreHealth = {
  ok: boolean;
  error?: string;
  store?: { source?: string; ready?: boolean; updatedAt?: string | null; sales?: number };
  billing?: {
    tariff: "trial" | "basic" | "mid" | "pro" | null;
    paymentSimulatedAt: string | null;
    paid?: boolean;
    canCreateNetwork?: boolean;
    commercialEntry?: boolean;
  };
};

function asDown(data: Partial<StoreHealth> = {}): StoreHealth {
  return {
    ...data,
    ok: false,
    error: data.error || DB_WAIT_MSG,
    store: {
      source: data.store?.source,
      ready: false,
      updatedAt: data.store?.updatedAt,
      sales: data.store?.sales,
    },
  };
}

async function readHealthOnce(): Promise<StoreHealth> {
  const res = await fetch("/api/v1/health", { cache: "no-store", signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS) });
  const data = (await res.json()) as StoreHealth;
  if (!data || typeof data !== "object") return asDown();
  const ready = data.store?.ready !== false && res.ok && data.ok !== false;
  if (!ready) return asDown({ ...data, error: data.error || DB_WAIT_MSG });
  return data;
}

export async function fetchStoreHealth(): Promise<StoreHealth> {
  try {
    const first = await readHealthOnce();
    if (first.ok && first.store?.ready !== false) return first;
    await sleep(RETRY_PAUSE_MS);
    try {
      const second = await readHealthOnce();
      if (second.ok && second.store?.ready !== false) return second;
      return asDown(second);
    } catch {
      return asDown(first);
    }
  } catch {
    try {
      await sleep(RETRY_PAUSE_MS);
      return await readHealthOnce();
    } catch {
      return asDown();
    }
  }
}

async function requestOnce<T>(
  path: string,
  method: string,
  token: string,
  body: unknown,
): Promise<T> {
  const timeoutMs = SLOW_PATH.test(path) ? LOGIN_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const res = await fetch(`/api/v1/${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let data: T & { error?: string; token?: string };
  try {
    data = (await res.json()) as T & { error?: string; token?: string };
  } catch {
    throw userFacingApiError(res.status);
  }
  if (!res.ok) throw userFacingApiError(res.status, data);
  if (data && typeof data === "object" && typeof data.token === "string") setToken(data.token);
  return data;
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const token = getToken();

  const run = () => requestOnce<T>(path, method, token, opts.body);

  try {
    try {
      return await run();
    } catch (err) {
      if (!isTransientClientFailure(err) && !(err instanceof ApiError && isTransientHttpStatus(err.status))) {
        throw err;
      }
      await sleep(RETRY_PAUSE_MS);
      return await run();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    try {
      const fallback = await callOchagApi({
        data: { path, method, body: opts.body, token },
      });
      let parsed: T & { error?: string; token?: string };
      try {
        parsed = JSON.parse(fallback.json || "{}") as T & { error?: string; token?: string };
      } catch {
        throw userFacingApiError(fallback.status);
      }
      if (fallback.status >= 400) throw userFacingApiError(fallback.status, parsed);
      if (parsed && typeof parsed === "object" && typeof parsed.token === "string") setToken(parsed.token);
      return parsed;
    } catch (fallbackErr) {
      if (fallbackErr instanceof ApiError) throw fallbackErr;
      throw new ApiError(clientErrorMessage(err, DB_WAIT_MSG), isTransientClientFailure(err) ? 503 : 0);
    }
  }
}
