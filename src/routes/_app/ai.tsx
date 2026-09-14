import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useOps } from "@/lib/data/store";
import type { CalcTask } from "@/lib/ai/calc";
import type { Insight, Period } from "@/lib/domain/types";
import { pct, rub } from "@/lib/format";

export const Route = createFileRoute("/_app/ai")({ component: AiPage });

function providerLabel(provider: string, fallback: boolean) {
  if (provider === "ollama" && !fallback) return "Ollama (живая модель)";
  if (fallback) return "эвристика (модель недоступна)";
  return "эвристика";
}

type CalcPayload = {
  contribution?: number;
  grossMarginPct?: number;
  foodCost?: number;
  writeoffSharePct?: number;
  net?: number;
  month?: string;
  planTarget?: number;
  monthFact?: number;
  runRateMonth?: number;
  gap?: number;
  onPace?: boolean | null;
  peakLabel?: string | null;
  peakRevenue?: number;
  peakChecks?: number;
  avgCheck?: number;
  itemsPerCheck?: number;
};

function AiPage() {
  const period = useOps((s) => s.period);
  const session = useOps((s) => s.session);
  const settings = useOps((s) => s.settings);
  const [narrative, setNarrative] = useState("");
  const [recs, setRecs] = useState<Insight[]>([]);
  const [task, setTask] = useState<CalcTask | "">("");
  const [explain, setExplain] = useState("");
  const [calc, setCalc] = useState<CalcPayload | null>(null);
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
      const res = await api<{
        value: unknown;
        provider: string;
        fallback?: boolean;
        error?: string;
        calc?: CalcPayload;
        task?: CalcTask;
      }>(path, {
        method: "POST",
        body: { ...body, ...extra },
      });
      setProvider(res.provider);
      setFallback(Boolean(res.fallback));
      setError(res.error ?? "");
      return res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Разбор недоступен");
      return null;
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Очаг AI"
        title="Разбор по цифрам"
        description="Сводка, рекомендации, маржа, прогноз месяца и пики смен — по данным контура. Свободного чата нет. PIN и телефоны в модель не уходят."
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
            ? `Модель ${status.model} доступна. Разбор периода, маржи и смен пойдёт в Ollama. Цифры считает контур, модель их не выдумывает.`
            : status?.configured
              ? `Ollama настроена, но сейчас не отвечает${status.error ? `: ${status.error}` : "."} Пока формулы контура — эвристика, не модель.`
              : "Ollama не включена. Раздел считает по формулам контура. Облачного LLM нет, свободного чата нет."}
        </p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-medium">Сводка периода</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {narrative || "Выручка, фудкост, списания, средний чек и пик — одним текстом по KPI."}
          </p>
          <Button
            className="mt-4"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/narrative").then((res) => {
                if (res) setNarrative(String(res.value ?? ""));
              });
            }}
          >
            {busy === "ai/narrative" ? "Считаем…" : "Сводка"}
          </Button>
        </Card>
        <Card>
          <div className="text-sm font-medium">Расчёты</div>
          <p className="mt-1 text-xs text-muted">Формулы контура всегда. Ollama добавляет вывод, если жива.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["margin", "Маржа"],
                ["forecast", "Прогноз месяца"],
                ["shift", "Смена / пик"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                variant={task === id ? "default" : "secondary"}
                disabled={Boolean(busy)}
                onClick={() => {
                  setTask(id);
                  void run("ai/calc", { task: id }).then((res) => {
                    if (!res) return;
                    setExplain(String(res.value ?? ""));
                    setCalc(res.calc ?? null);
                  });
                }}
              >
                {busy === "ai/calc" && task === id ? "Считаем…" : label}
              </Button>
            ))}
          </div>
          {task === "margin" && calc ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Kpi label="Маржа" value={pct(calc.grossMarginPct ?? 0)} />
              <Kpi label="Фудкост" value={pct(calc.foodCost ?? 0)} />
            </div>
          ) : null}
          {task === "forecast" && calc ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Kpi label="Темп месяца" value={rub(calc.runRateMonth ?? 0)} hint={calc.month} />
              <Kpi
                label="План"
                value={calc.planTarget ? rub(calc.planTarget) : "не задан"}
                hint={calc.onPace === false ? `разрыв ${rub(calc.gap ?? 0)}` : calc.onPace ? "в темпе" : ""}
              />
            </div>
          ) : null}
          {task === "shift" && calc ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Kpi label="Пик" value={calc.peakLabel ?? "—"} hint={calc.peakChecks ? `${calc.peakChecks} чек.` : undefined} />
              <Kpi label="Средний чек" value={rub(calc.avgCheck ?? 0)} hint={`${calc.itemsPerCheck ?? 0} поз.`} />
            </div>
          ) : null}
          {explain ? <p className="mt-3 text-sm leading-relaxed text-muted">{explain}</p> : null}
        </Card>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Рекомендации</div>
            <p className="mt-1 text-xs text-muted">
              Модель плюс сигналы контура. Подробные таблицы — в{" "}
              <Link to="/planning" className="underline-offset-2 hover:underline">
                аналитике
              </Link>
              .
            </p>
          </div>
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
          {recs.length === 0 ? <p className="text-sm text-muted">Пока пусто — соберите рекомендации по текущему срезу.</p> : null}
        </ul>
      </Card>
    </div>
  );
}
