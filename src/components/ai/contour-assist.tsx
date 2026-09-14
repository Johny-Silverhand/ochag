import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import type { CalcTask } from "@/lib/ai/calc";
import { useOps, useSessionUser } from "@/lib/data/store";
import { can } from "@/lib/domain/permissions";
import type { Insight, Period } from "@/lib/domain/types";

const TASK_LABEL: Record<CalcTask, string> = {
  margin: "Маржа",
  forecast: "Прогноз",
  shift: "Смена / пик",
  cover: "Покрытие",
};

function providerLabel(provider: string, fallback: boolean) {
  if (provider === "ollama" && !fallback) return "Ollama";
  if (fallback) return "эвристика (модель недоступна)";
  return "эвристика";
}

type AssistResponse = {
  value: unknown;
  provider: string;
  fallback?: boolean;
  error?: string;
};

export function ContourAssist({
  tasks = ["forecast", "cover"],
  showNarrative = false,
  showRecommend = true,
  title = "Разбор по цифрам",
}: {
  tasks?: CalcTask[];
  showNarrative?: boolean;
  showRecommend?: boolean;
  title?: string;
}) {
  const period = useOps((s) => s.period);
  const session = useOps((s) => s.session);
  const user = useSessionUser();
  const [busy, setBusy] = useState("");
  const [provider, setProvider] = useState("");
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [recs, setRecs] = useState<Insight[]>([]);

  if (!can(user?.role ?? "waiter", "ai")) return null;

  async function run(path: string, extra: Record<string, unknown> = {}) {
    setBusy(path + String(extra.task ?? ""));
    try {
      const res = await api<AssistResponse>(path, {
        method: "POST",
        body: { period: period as Period, branchId: session?.branchId ?? "all", ...extra },
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
    <Card className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <p className="mt-1 text-xs text-muted">
            Цифры считает контур. Ollama комментирует, если включена.{" "}
            <Link to="/ai" className="underline-offset-2 hover:underline">
              Все расчёты
            </Link>
          </p>
        </div>
        {provider ? <Badge>{providerLabel(provider, fallback)}</Badge> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {showNarrative ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/narrative").then((res) => {
                if (res) {
                  setText(String(res.value ?? ""));
                  setRecs([]);
                }
              });
            }}
          >
            {busy === "ai/narrative" ? "Считаем…" : "Сводка"}
          </Button>
        ) : null}
        {tasks.map((id) => (
          <Button
            key={id}
            variant="secondary"
            size="sm"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/calc", { task: id }).then((res) => {
                if (res) {
                  setText(String(res.value ?? ""));
                  setRecs([]);
                }
              });
            }}
          >
            {busy === `ai/calc${id}` ? "Считаем…" : TASK_LABEL[id]}
          </Button>
        ))}
        {showRecommend ? (
          <Button
            size="sm"
            disabled={Boolean(busy)}
            onClick={() => {
              void run("ai/recommend").then((res) => {
                if (res) {
                  setRecs((res.value as Insight[]) ?? []);
                  setText("");
                }
              });
            }}
          >
            {busy === "ai/recommend" ? "Считаем…" : "Рекомендации"}
          </Button>
        ) : null}
      </div>
      {text ? <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p> : null}
      {recs.length ? (
        <ul className="mt-3 space-y-2">
          {recs.map((r) => (
            <li key={r.id} className="rounded-xl bg-bg p-3">
              <div className="text-sm font-medium">{r.title}</div>
              <p className="mt-1 text-xs text-muted">{r.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </Card>
  );
}
