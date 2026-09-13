import { createFileRoute } from "@tanstack/react-router";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useOps, useSessionUser } from "@/lib/data/store";
import { canEditExpenses } from "@/lib/domain/permissions";
import { EXPENSE_KIND_LABEL, type ExpenseKind } from "@/lib/domain/types";
import { api } from "@/lib/api/client";
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
  const user = useSessionUser()!;
  const addExpense = useOps((s) => s.addExpense);
  const expenses = filterPeriod(filterByBranch(snap.expenses, scope), from, TODAY);
  const [pdfNote, setPdfNote] = useState("");

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
          <div className="flex flex-wrap gap-2">
            {canEditExpenses(user.role) ? <ExpenseDialog onSave={addExpense} /> : null}
            <Button variant="secondary" onClick={csv}>
              Выгрузка CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void api<{ note?: string }>(`reports/pdf?period=${period}`, { method: "GET" })
                  .then((r) => {
                    setPdfNote(r.note ?? "PDF-заглушка");
                    toast.message(r.note ?? "Серверный PDF пока заглушка");
                  })
                  .catch(() => toast.message("Серверный PDF пока заглушка"));
              }}
            >
              PDF
            </Button>
          </div>
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
          ТЗ §5: фудкост = COGS / выручка, COGS = сумма cost_at_sale. Средняя цена закупки —
          средневзвешенная по складу филиала. Ожидаемая касса = размен + нал. ФОТ = ставка + % с выручки смены.
          Чистыми = выручка − COGS − списания − постоянные − ФОТ. Банкеты — отдельный контур.
        </p>
        {pdfNote ? <p className="mt-2 text-xs text-subtle">{pdfNote}</p> : null}
      </Card>
      <Card className="mt-4 overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">Постоянные и переменные</div>
        <ul>
          {expenses.slice(0, 10).map((e) => (
            <li key={e.id} className="flex justify-between border-t border-border px-5 py-2 text-sm">
              <span>
                {e.category}
                <span className="ml-2 text-xs text-muted">{EXPENSE_KIND_LABEL[e.kind]}</span>
              </span>
              <span className="font-mono tabular-nums">{rub(e.amount)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ExpenseDialog({
  onSave,
}: {
  onSave: (input: { category: string; amount: number; note?: string; kind: ExpenseKind }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Аренда");
  const [amount, setAmount] = useState("6500");
  const [kind, setKind] = useState<ExpenseKind>("fixed");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Расход</Button>
      </DialogTrigger>
      <DialogContent title="Постоянный расход">
        <div className="space-y-3">
          <Field label="Статья">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Сумма, ₽">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Тип">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as ExpenseKind)}>
              <option value="fixed">Постоянные</option>
              <option value="variable">Переменные</option>
            </NativeSelect>
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              onSave({ category, amount: Number(amount) || 0, kind });
              setOpen(false);
              toast.success("Расход записан");
            }}
          >
            Записать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
