import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { useOps } from "@/lib/data/store";
import type { Insight, Period } from "@/lib/domain/types";

export const Route = createFileRoute("/_app/ai")({ component: AiPage });

function providerLabel(provider: string, fallback: boolean) {
  if (provider === "ollama" && !fallback) return "Ollama (живая модель)";
  if (fallback) return "эвристика (модель недоступна)";
  return "эвристика";
}

function AiPage() {
  const period = useOps((s) => s.period);
  const session = useOps((s) => s.session);
  const settings = useOps((s) => s.settings);
  const [question, setQuestion] = useState("Почему фудкост такой и что резать первым?");
  const [narrative, setNarrative] = useState("");
  const [answer, setAnswer] = useState("");
  const [recs, setRecs] = useState<Insight[]>([]);
  const [provider, setProvider] = useState("");
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState<{ configured?: boolean; reachable?: boolean; model?: string; error?: string } | null>(null);

  const body = { period: period as Period, branchId: session?.branchId ?? "all" };

  useEffect(() => {
    void api<{ configured: boolean; reachable: boolean; model: string; error?: string }>("ai/status", { method: "GET" })
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [settings.ollamaEnabled, settings.ollamaBaseUrl, settings.ollamaModel]);

  async function run(path: string, extra: Record<string, unknown> = {}) {
    setBusy(path);
    try {
      const res = await api<{ value: unknown; provider: string; fallback?: boolean; error?: string }>(path, {
        method: "POST",
        body: { ...body, ...extra },
      });
      setProvider(res.provider);
      setFallback(Boolean(res.fallback));
      setError(res.error ?? "");
      return res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI недоступен");
      return null;
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Очаг AI"
        title="Сводка по цифрам"
        description="Живая Ollama, если владелец указал адрес в настройках сети. Иначе — эвристика по KPI, без притворства, что это модель. PIN и телефоны в запрос не уходят."
        actions={
          provider ? (
            <Badge>{providerLabel(provider, fallback)}</Badge>
          ) : status ? (
            <Badge>
              {status.reachable
                ? `Ollama · ${status.model}`
                : status.configured
                  ? "Ollama не отвечает"
                  : "эвристика"}
            </Badge>
          ) : null
        }
      />
      <Card className="mb-4">
        <p className="text-sm leading-relaxed text-muted">
          {status?.reachable
            ? `Модель ${status.model} доступна. Ответы пойдут в Ollama.`
            : status?.configured
              ? `Ollama настроена, но сейчас не отвечает${status.error ? `: ${status.error}` : "."} Пока работает эвристика.`
              : "Ollama не включена. Раздел считает по формулам контура. Облачного LLM в продукте нет."}
        </p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-medium">Сводка периода</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{narrative || "Нажмите «Рассказать», чтобы собрать текст по KPI."}</p>
          <Button
            className="mt-4"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/narrative").then((res) => {
                if (res) setNarrative(String(res.value ?? ""));
              });
            }}
          >
            {busy === "ai/narrative" ? "Думаем…" : "Рассказать"}
          </Button>
        </Card>
        <Card>
          <div className="text-sm font-medium">Вопрос по цифрам</div>
          <Field label="Вопрос" className="mt-3">
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
          </Field>
          <Button
            className="mt-3"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/ask", { question }).then((res) => {
                if (res) setAnswer(String(res.value ?? ""));
              });
            }}
          >
            {busy === "ai/ask" ? "Думаем…" : "Спросить"}
          </Button>
          {answer ? <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p> : null}
        </Card>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Рекомендации</div>
          <Button
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/recommend").then((res) => {
                if (res) setRecs((res.value as Insight[]) ?? []);
              });
            }}
          >
            {busy === "ai/recommend" ? "Считаем…" : "Собрать"}
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {recs.map((r) => (
            <li key={r.id} className="rounded-xl bg-bg p-3">
              <div className="text-sm font-medium">{r.title}</div>
              <p className="mt-1 text-xs text-muted">{r.body}</p>
            </li>
          ))}
          {recs.length === 0 ? <p className="text-sm text-muted">Пока пусто — соберите рекомендации.</p> : null}
        </ul>
      </Card>
    </div>
  );
}
