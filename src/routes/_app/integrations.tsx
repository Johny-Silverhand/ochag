import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { getOpsStatus } from "@/lib/data/ops";
import { useOps } from "@/lib/data/store";
import { useSync } from "@/lib/data/sync";
import { ruDateTime } from "@/lib/format";
import { defaultKeeperConfig } from "@/lib/integrations/keeper";

export const Route = createFileRoute("/_app/integrations")({ component: IntegrationsPage });

function IntegrationsPage() {
  const resetDemo = useOps((s) => s.resetDemo);
  const loadSample = useOps((s) => s.loadSample);
  const logout = useOps((s) => s.logout);
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    source: "neon" | "pglite" | "memory" | "json";
    ready: boolean;
    updatedAt: string | null;
    sales: number;
  } | null>(null);

  useEffect(() => {
    void getOpsStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [sync.updatedAt]);

  const source = status?.source ?? sync.source;
  const dbLive =
    source === "neon"
      ? "Neon Postgres"
      : source === "json"
        ? "JSON-файл"
        : source === "memory"
          ? "Память процесса"
          : "Postgres (локальный контур)";

  return (
    <div>
      <PageHeader
        eyebrow="Подключения"
        title="Интеграции"
        description="Касса, база и операционные сигналы — рабочие точки, без заготовок."
      />

      <div className="grid gap-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">База</div>
              <h2 className="mt-1 text-lg font-medium">{dbLive}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Склад и касса живут в репозитории без живого Postgres. Миграции уже лежат в проекте — DATABASE_URL
                подключите позже, без переписывания контура.
              </p>
            </div>
            <Badge tone={status?.ready || sync.status === "ok" ? "success" : "warning"}>
              {sync.status === "saving" ? "запись" : status?.ready || sync.status === "ok" ? "онлайн" : "ожидание"}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Чеков в базе</dt>
              <dd className="mt-0.5 font-mono tabular-nums">{status?.sales ?? sync.sales}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Последняя запись</dt>
              <dd className="mt-0.5 text-sm">
                {status?.updatedAt ? ruDateTime(status.updatedAt) : sync.updatedAt ? ruDateTime(sync.updatedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Движок</dt>
              <dd className="mt-0.5 font-mono text-sm">{source ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">Касса</div>
              <h2 className="mt-1 text-lg font-medium">r_keeper</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Z-отчёт мапится в чеки и сразу списывает склад по техкартам. Импорт — на экране продаж, при открытой
                смене.
              </p>
            </div>
            <Badge tone="success">работает</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="URL терминала">
              <Input defaultValue={defaultKeeperConfig.baseUrl} readOnly />
            </Field>
            <Field label="ID кассы">
              <Input defaultValue={defaultKeeperConfig.terminalId} readOnly />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">Сигналы</div>
              <h2 className="mt-1 text-lg font-medium">Операционный советник</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                На обзоре считаются аномалии: фудкост, списания, касса, дефицит, паттерн повара. Внешний ключ модели не
                нужен — контур уже подсказывает по фактам сети.
              </p>
            </div>
            <Badge tone="success">в работе</Badge>
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Учебная сеть</div>
            <p className="text-sm text-muted">Явная загрузка примера для приёмки. Очистка возвращает пустой контур.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void loadSample()
                  .then(() => {
                    logout();
                    toast.success("Учебная сеть загружена — войдите owner / ochag");
                  })
                  .catch(() => toast.error("Не удалось загрузить пример"))
                  .finally(() => setBusy(false));
              }}
            >
              Загрузить пример
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void resetDemo()
                  .then(() => toast.success("Сеть очищена"))
                  .catch(() => toast.error("Не удалось записать в базу"))
                  .finally(() => setBusy(false));
              }}
            >
              Очистить
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
