import { AuthzError } from "../authz/actor";
import { parseKeeperXml } from "./keeper-xml";
import type { KeeperReceipt } from "./keeper";

export function readKeeperEnv() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const baseUrl = env?.OCHAG_KEEPER_URL?.trim() ?? "";
  const terminalId = env?.OCHAG_KEEPER_TERMINAL?.trim() || "POS-01";
  const user = env?.OCHAG_KEEPER_USER?.trim() ?? "";
  const password = env?.OCHAG_KEEPER_PASSWORD ?? "";
  const query = env?.OCHAG_KEEPER_QUERY?.trim() ?? "";
  const localish = !baseUrl || /keeper\.local|localhost|127\.0\.0\.1/i.test(baseUrl);
  return {
    baseUrl,
    terminalId,
    user,
    password,
    query,
    enabled: Boolean(baseUrl) && !localish,
  };
}

export function publicKeeperStatus() {
  const e = readKeeperEnv();
  return {
    xmlImport: true as const,
    http: {
      configured: e.enabled,
      urlHost: hostOf(e.baseUrl),
      userSet: Boolean(e.user),
      passwordSet: Boolean(e.password),
      querySet: Boolean(e.query),
      terminalId: e.terminalId,
    },
  };
}

function hostOf(url: string) {
  try {
    return url ? new URL(url).host : "";
  } catch {
    return "";
  }
}

export function defaultKeeperQuery(terminalId: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7Command CMD="GetOrderList" onlyOpened="0" terminal="${terminalId}" date="${day}"/>
</RK7Query>`;
}

export async function fetchKeeperXml(): Promise<string> {
  const cfg = readKeeperEnv();
  if (!cfg.enabled) {
    throw new AuthzError(
      "HTTP кипера не настроен. Задайте OCHAG_KEEPER_URL (XML-интерфейс RK7, доступный из интернета) или загрузите XML-файл.",
      400,
    );
  }
  const headers: Record<string, string> = {
    "content-type": "application/xml; charset=utf-8",
    accept: "application/xml, text/xml, */*",
  };
  if (cfg.user) {
    headers.authorization = `Basic ${Buffer.from(`${cfg.user}:${cfg.password}`).toString("base64")}`;
  }
  const body = cfg.query || defaultKeeperQuery(cfg.terminalId);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(cfg.baseUrl, { method: "POST", headers, body, signal: ac.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new AuthzError(`RK7 ответил ${res.status}: ${text.slice(0, 180) || res.statusText}`, 502);
    }
    if (!text.trim()) throw new AuthzError("RK7 вернул пустой ответ", 502);
    return text;
  } catch (err) {
    if (err instanceof AuthzError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AuthzError(
        "RK7 не ответил за 15 секунд. С облака касса в локальной сети кафе обычно недоступна — выгрузите XML с менеджерской станции.",
        504,
      );
    }
    throw new AuthzError(err instanceof Error ? err.message : "Не удалось связаться с RK7", 502);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchKeeperReceipts(): Promise<KeeperReceipt[]> {
  const xml = await fetchKeeperXml();
  const rows = parseKeeperXml(xml);
  if (rows.length === 0) {
    throw new AuthzError(
      "HTTP кипера ответил, но чеков в XML нет. Проверьте команду GetOrderList у дилера или загрузите Z-отчёт файлом.",
      400,
    );
  }
  return rows;
}
