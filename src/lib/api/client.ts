import { callOchagApi } from "./server";

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

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const token = getToken();
  try {
    const res = await fetch(`/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
    });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (data && typeof data === "object" && "token" in data && typeof (data as { token?: string }).token === "string") {
      setToken((data as { token: string }).token);
    }
    return data;
  } catch (err) {
    const fallback = await callOchagApi({
      data: { path, method, body: opts.body, token },
    });
    if (fallback.status >= 400) {
      const message = (fallback.data as { error?: string })?.error || `HTTP ${fallback.status}`;
      throw new Error(message);
    }
    const data = fallback.data as T & { token?: string };
    if (data && typeof data === "object" && data.token) setToken(data.token);
    return data;
  }
}
