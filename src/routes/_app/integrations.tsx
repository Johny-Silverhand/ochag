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
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    source: "neon" | "pglite";
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
  const dbLive = source === "neon" ? "Neon Postgres" : "Postgres (локальный контур)";

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
                Склад, чеки, смены и банкеты пишутся в Postgres. На проде это Neon; в превью — тот же движок, чтобы
                ничего не расходилось.
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
            <div className="text-sm font-medium">Стартовый срез</div>
            <p className="text-sm text-muted">Вернуть сеть «Очаг» к срезу 2 сентября 2026. Текущие правки в базе заменятся.</p>
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void resetDemo()
                .then(() => toast.success("Срез восстановлен"))
                .catch(() => toast.error("Не удалось записать в базу"))
                .finally(() => setBusy(false));
            }}
          >
            Восстановить срез
          </Button>
        </Card>
      </div>
    </div>
  );
}
