import { createFileRoute } from "@tanstack/react-router";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOps } from "@/lib/data/store";
import {
  computeKpis,
  filterByBranch,
  filterPeriod,
  periodStart,
  writeoffByReason,
} from "@/lib/domain/engine";
import { TODAY, WRITEOFF_LABEL, type WriteoffReason } from "@/lib/domain/types";
import { pct, ruDate, rub } from "@/lib/format";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const scope = session.branchId;
  const k = computeKpis(snap, { period, branchId: scope });
  const from = periodStart(period);
  const reasons = writeoffByReason(snap.movements, from, TODAY, scope);
  const invoices = filterPeriod(filterByBranch(snap.invoices, scope), from, TODAY);

  function csv() {
    const lines = [
      "metric,value",
      `revenue,${k.revenue}`,
      `cogs,${k.cogs}`,
      `food_cost,${k.foodCost.toFixed(2)}`,
      `writeoffs,${k.writeoffs}`,
      `payroll,${k.payroll}`,
      `opex,${k.opex}`,
      `net,${k.net}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ochag-${scope}-${from}-${TODAY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Срез"
        title="Отчёты"
        description="Любой срез в реальном времени: продажи, приход, списания, ФОТ и чистая прибыль владельца."
        actions={
          <Button variant="secondary" onClick={csv}>
            Выгрузка CSV
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Выручка" value={rub(k.revenue)} />
        <Kpi label="Себестоимость" value={rub(k.cogs)} hint={pct(k.foodCost)} />
        <Kpi label="Расходы + ФОТ" value={rub(k.opex + k.payroll)} />
        <Kpi label="Чистыми" value={rub(k.net)} tone={k.net >= 0 ? "good" : "bad"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-medium">Списания по причинам</div>
          <ul className="mt-3 space-y-2">
            {reasons.map((r) => (
              <li key={r.reason} className="flex justify-between text-sm">
                <span>{WRITEOFF_LABEL[r.reason as WriteoffReason] ?? r.reason}</span>
                <span className="font-mono tabular-nums">{rub(r.value)}</span>
              </li>
            ))}
            {reasons.length === 0 ? <p className="text-sm text-muted">Списаний нет.</p> : null}
          </ul>
        </Card>
        <Card>
          <div className="text-sm font-medium">Приход за период</div>
          <ul className="mt-3 space-y-2">
            {invoices.slice(0, 8).map((inv) => (
              <li key={inv.id} className="flex justify-between text-sm">
                <span>
                  {inv.number}
                  <span className="ml-2 text-xs text-muted">{ruDate(inv.date)}</span>
                </span>
                <span className="font-mono tabular-nums">{rub(inv.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="text-sm font-medium">Как считается прибыль</div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Банкеты ведутся отдельным контуром. Прибыль: выручка чеков − себестоимость по техкартам − списания − аренда и
          коммуналка − начисленный фонд оплаты.
        </p>
      </Card>
    </div>
  );
}
