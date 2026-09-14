import type { Insight } from "../domain/types.ts";
import type { AiProvider, ResolvedOllama } from "./provider.ts";
import type { SafeMetrics } from "./safe-context.ts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SYSTEM =
  "Ты операционный аналитик сети кафе «Очаг». Отвечай по-русски коротко. Используй только переданные агрегаты. Не выдумывай персональные данные.";

async function chat(
  cfg: ResolvedOllama,
  system: string,
  user: string,
  fetchImpl: FetchLike,
  timeoutMs = 20_000,
): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${cfg.base}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama ${res.status}${text ? `: ${text.slice(0, 180)}` : ""}`);
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Ollama вернула пустой ответ");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Ollama не ответила за ${Math.round(timeoutMs / 1000)} с (${cfg.base})`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

export function createOllamaProvider(
  cfg: ResolvedOllama,
  fetchImpl: FetchLike = fetch,
): AiProvider {
  return {
    id: "ollama",
    async narrative(metrics) {
      return chat(cfg, SYSTEM, `Сводка периода:\n${JSON.stringify(metrics)}`, fetchImpl);
    },
    async ask(question, metrics) {
      return chat(cfg, SYSTEM, `Метрики: ${JSON.stringify(metrics)}\nВопрос: ${question}`, fetchImpl);
    },
    async recommend(metrics) {
      const raw = await chat(
        cfg,
        SYSTEM,
        `Дай 3 рекомендации JSON-массивом [{id,severity,title,body,module}] по метрикам: ${JSON.stringify(metrics)}`,
        fetchImpl,
      );
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start < 0 || end < 0) throw new Error("Ollama не вернула JSON-рекомендации");
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Insight[];
      return parsed.slice(0, 6).map((row, i) => ({
        id: row.id || `ollama-${i}`,
        severity: row.severity === "critical" || row.severity === "warning" ? row.severity : "info",
        title: String(row.title ?? "Рекомендация"),
        body: String(row.body ?? ""),
        module: String(row.module ?? "dashboard"),
      }));
    },
  };
}

export async function ollamaAvailable(
  cfg: ResolvedOllama,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 2500,
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.configured || !cfg.base) {
    return { ok: false, error: "Ollama не настроена" };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetchImpl(`${cfg.base}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, error: `Ollama ${res.status} на ${cfg.base}` };
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: `Ollama недоступна (${cfg.base}): нет ответа` };
    }
    return { ok: false, error: `Ollama недоступна (${cfg.base}): ${msg}` };
  }
}

export function ollamaUnreachableMessage(cfg: ResolvedOllama, error: string) {
  return `Локальная модель не ответила: ${error}. Проверьте адрес ${cfg.base || "Ollama"} и что сервис запущен.`;
}
