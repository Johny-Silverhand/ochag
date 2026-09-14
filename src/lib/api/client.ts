import { callOchagApi } from "./server";
import { DB_UNAVAILABLE_MSG, clientErrorMessage } from "../repo/db-errors";

const TOKEN_KEY = "ochag-jwt";

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
  if (data?.error) return clientErrorMessage(new Error(data.error), data.error);
  if (status >= 500) return DB_UNAVAILABLE_MSG;
  return "Не удалось выполнить запрос. Попробуйте ещё раз.";
}

function isUserFacing(err: unknown) {
  if (!(err instanceof Error)) return false;
  if (err.message === DB_UNAVAILABLE_MSG) return true;
  return /[А-Яа-яЁё]/.test(err.message);
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

export async function fetchStoreHealth(): Promise<StoreHealth> {
  try {
    const res = await fetch("/api/v1/health", { cache: "no-store" });
    const data = (await res.json()) as StoreHealth;
    if (!data || typeof data !== "object") {
      return { ok: false, error: DB_UNAVAILABLE_MSG, store: { ready: false } };
    }
    const ready = data.store?.ready !== false && res.ok && data.ok !== false;
    if (!ready) {
      return {
        ...data,
        ok: false,
        error: data.error || DB_UNAVAILABLE_MSG,
        store: { source: data.store?.source, ready: false, updatedAt: data.store?.updatedAt, sales: data.store?.sales },
      };
    }
    return data;
  } catch {
    return { ok: false, error: DB_UNAVAILABLE_MSG, store: { ready: false } };
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const token = getToken();

  const applyToken = (data: T & { token?: string }) => {
    if (data && typeof data === "object" && typeof data.token === "string") setToken(data.token);
  };

  try {
    const res = await fetch(`/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
    });
    let data: T & { error?: string; token?: string };
    try {
      data = (await res.json()) as T & { error?: string; token?: string };
    } catch {
      throw new Error(userFacingApiError(res.status));
    }
    if (!res.ok) throw new Error(userFacingApiError(res.status, data));
    applyToken(data);
    return data;
  } catch (err) {
    if (isUserFacing(err)) throw err;
    try {
      const fallback = await callOchagApi({
        data: { path, method, body: opts.body, token },
      });
      let parsed: T & { error?: string; token?: string };
      try {
        parsed = JSON.parse(fallback.json || "{}") as T & { error?: string; token?: string };
      } catch {
        throw new Error(userFacingApiError(fallback.status));
      }
      if (fallback.status >= 400) {
        throw new Error(userFacingApiError(fallback.status, parsed));
      }
      applyToken(parsed);
      return parsed;
    } catch (fallbackErr) {
      if (isUserFacing(fallbackErr)) throw fallbackErr;
      throw new Error(clientErrorMessage(err));
    }
  }
}
