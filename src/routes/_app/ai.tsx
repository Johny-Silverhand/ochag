import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

function AiPage() {
  const period = useOps((s) => s.period);
  const session = useOps((s) => s.session);
  const [question, setQuestion] = useState("Почему фудкост такой и что резать первым?");
  const [narrative, setNarrative] = useState("");
  const [answer, setAnswer] = useState("");
  const [recs, setRecs] = useState<Insight[]>([]);
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState("");

  const body = { period: period as Period, branchId: session?.branchId ?? "all" };

  async function run(path: string, extra: Record<string, unknown> = {}) {
    setBusy(path);
    try {
      const res = await api<{ value: unknown; provider: string }>(path, { method: "POST", body: { ...body, ...extra } });
      setProvider(res.provider);
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
        eyebrow="Этап 3"
        title="Очаг AI"
        description="Автосводка, свободный вопрос и рекомендации по цифрам контура. Ollama, если доступна, иначе эвристика. PIN и телефоны в модель не уходят."
        actions={provider ? <Badge>{provider === "ollama" ? "Ollama" : "эвристика"}</Badge> : null}
      />
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
