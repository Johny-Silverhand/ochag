import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps } from "@/lib/data/store";
import { abcByRevenue, deviations, planVsFact, stockCover } from "@/lib/domain/analytics";
import { today } from "@/lib/domain/types";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";
import { pct, ruDate, rub } from "@/lib/format";

export const Route = createFileRoute("/_app/planning")({ component: PlanningPage });

function PlanningPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const setPlan = useOps((s) => s.setPlan);
  const branchId = session.branchId;
  const canWrite = isWriteScope(branchId);
  const month = today().slice(0, 7);
  const [tab, setTab] = useState("abc");
  const [target, setTarget] = useState(() => {
    const existing = snap.revenuePlans.find((p) => p.branchId === branchId && p.month === month);
    return String(existing?.target ?? 720000);
  });

  const abc = useMemo(() => abcByRevenue(snap, period === "today" ? "30d" : period, branchId), [snap, period, branchId]);
  const plan = useMemo(
    () => (branchId === "all" ? { target: 0, fact: 0, days: [] as { date: string; fact: number; plan: number }[] } : planVsFact(snap, branchId, month)),
    [snap, branchId, month],
  );
  const cover = useMemo(() => (branchId === "all" ? [] : stockCover(snap, branchId, "7d")), [snap, branchId]);
  const offs = useMemo(() => deviations(snap, "30d", branchId), [snap, branchId]);

  return (
    <div>
      <PageHeader
        eyebrow="Этап 3"
        title="Аналитика"
        description="ABC, план-факт месяца, дни покрытия склада и отклонения. Только цифры контура, без внешних источников."
      />
      {!canWrite ? <p className="mb-3 text-xs text-muted">{WRITE_SCOPE_HINT} ABC и отклонения считаются по выбранному срезу.</p> : null}
      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "abc", label: "ABC" },
          { value: "plan", label: "План-факт" },
          { value: "cover", label: "Покрытие" },
          { value: "dev", label: "Отклонения" },
        ]}
      />

      {tab === "abc" ? (
        <Card className="overflow-hidden p-0">
          {abc.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">Нет продаж за период — ABC пуст.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-xs text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Класс</th>
                    <th className="px-3 py-2 font-medium">Блюдо</th>
                    <th className="px-3 py-2 font-medium">Выручка</th>
                    <th className="px-5 py-2 text-right font-medium">Доля</th>
                  </tr>
                </thead>
                <tbody>
                  {abc.map((r) => (
                    <tr key={r.name} className="border-t border-border">
                      <td className="px-5 py-2.5">
                        <Badge tone={r.cls === "A" ? "success" : r.cls === "B" ? "warning" : "muted"}>{r.cls}</Badge>
                      </td>
                      <td className="px-3 py-2.5">{r.name}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{rub(r.revenue)}</td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums">{pct(r.share * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === "plan" ? (
        <div className="space-y-4">
          {branchId === "all" ? (
            <p className="text-sm text-muted">План задаётся на филиал. Выберите точку в шапке.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Kpi label="План месяца" value={rub(plan.target)} />
                <Kpi label="Факт" value={rub(plan.fact)} tone={plan.fact >= plan.target && plan.target > 0 ? "good" : "default"} />
                <Kpi
                  label="Отставание"
                  value={rub(plan.fact - plan.target)}
                  tone={plan.fact >= plan.target ? "good" : "bad"}
                />
              </div>
              {canWrite ? (
                <Card>
                  <div className="text-sm font-medium">Цель выручки · {month}</div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Field label="План, ₽" className="max-w-xs">
                      <Input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" />
                    </Field>
                    <Button
                      onClick={() => {
                        setPlan({ branchId, month, target: Number(target) || 0 });
                        toast.success("План сохранён");
                      }}
                    >
                      Записать план
                    </Button>
                  </div>
                </Card>
              ) : null}
              <Card className="overflow-hidden p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg text-xs text-muted">
                    <tr>
                      <th className="px-5 py-2 font-medium">День</th>
                      <th className="px-3 py-2 font-medium">Накоплено факт</th>
                      <th className="px-5 py-2 text-right font-medium">Накоплено план</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.days.slice(-14).map((d) => (
                      <tr key={d.date} className="border-t border-border">
                        <td className="px-5 py-2.5">{ruDate(d.date)}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums">{rub(d.fact)}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">{rub(d.plan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      ) : null}

      {tab === "cover" ? (
        <Card className="overflow-hidden p-0">
          {branchId === "all" ? (
            <p className="px-5 py-8 text-sm text-muted">Покрытие склада — по филиалу. Выберите точку.</p>
          ) : cover.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">Нет расхода или остатков.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Продукт</th>
                  <th className="px-3 py-2 font-medium">Остаток</th>
                  <th className="px-5 py-2 text-right font-medium">Дней хватит</th>
                </tr>
              </thead>
              <tbody>
                {cover.slice(0, 24).map((r) => (
                  <tr key={r.productId} className="border-t border-border">
                    <td className="px-5 py-2.5">{r.name}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{r.have.toFixed(1)}</td>
                    <td className={`px-5 py-2.5 text-right font-mono tabular-nums ${r.days < 3 ? "text-danger" : ""}`}>
                      {Number.isFinite(r.days) ? r.days.toFixed(1) : "∞"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : null}

      {tab === "dev" ? (
        <div className="space-y-3">
          {offs.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Отклонений нет: цены стабильны, списания редкие, касса без крупных расхождений.</p>
            </Card>
          ) : (
            offs.map((row, i) => (
              <Card key={`${row.kind}-${i}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{row.title}</div>
                  <Badge>{row.kind}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{row.body}</p>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
