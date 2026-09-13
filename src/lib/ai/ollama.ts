import type { Insight } from "../domain/types";
import type { AiProvider } from "./provider";
import { ollamaConfig } from "./provider";
import type { SafeMetrics } from "./safe-context";

async function chat(system: string, user: string): Promise<string> {
  const { base, model } = ollamaConfig();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("empty ollama");
    return text;
  } finally {
    clearTimeout(t);
  }
}

const SYSTEM =
  "Ты операционный аналитик сети кафе «Очаг». Отвечай по-русски коротко. Используй только переданные агрегаты. Не выдумывай персональные данные.";

export function createOllamaProvider(): AiProvider {
  return {
    id: "ollama",
    async narrative(metrics) {
      return chat(SYSTEM, `Сводка периода:\n${JSON.stringify(metrics)}`);
    },
    async ask(question, metrics) {
      return chat(SYSTEM, `Метрики: ${JSON.stringify(metrics)}\nВопрос: ${question}`);
    },
    async recommend(metrics) {
      const raw = await chat(
        SYSTEM,
        `Дай 3 рекомендации JSON-массивом [{id,severity,title,body,module}] по метрикам: ${JSON.stringify(metrics)}`,
      );
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start < 0 || end < 0) throw new Error("no json");
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

export async function ollamaAvailable() {
  const { base } = ollamaConfig();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${base}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}
