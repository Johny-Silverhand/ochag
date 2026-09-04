import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { advisor } from "@/lib/ai/advisor";
import {
  branchCompare,
  computeKpis,
  dailyRevenue,
  filterByBranch,
  filterPeriod,
  needToBuy,
  periodStart,
  topDishes,
} from "@/lib/domain/engine";
import type { Insight, Period } from "@/lib/domain/types";
import { TODAY } from "@/lib/domain/types";
import { pct, ruDate, rub } from "@/lib/format";
import { useOps, useSessionUser } from "@/lib/data/store";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session);
  const period = useOps((s) => s.period);
  const setPeriod = useOps((s) => s.setPeriod);
  const user = useSessionUser();
  const scope = session?.branchId ?? "all";
  const pinLowStock = usePrefs((s) => s.kitchenPinLowStock);
  const showAdvisor = usePrefs((s) => s.showAdvisor);
  const showLowStock =
    user?.role === "owner" || user?.role === "manager" || (user?.role === "cook" && pinLowStock);
  const [insights, setInsights] = useState<Insight[]>([]);

  const kpis = useMemo(() => computeKpis(snap, { period, branchId: scope }), [snap, period, scope]);
  const from = periodStart(period);
  const sales = filterPeriod(filterByBranch(snap.sales, scope), from, TODAY);
  const series = dailyRevenue(sales, from, TODAY);
  const compare = branchCompare(snap, period);
  const dishes = topDishes(sales, 5);
  const alerts = scope === "all"
    ? snap.branches.flatMap((b) => needToBuy(snap, b.id).slice(0, 2).map((n) => ({ ...n, branch: b.short })))
    : needToBuy(snap, scope).slice(0, 6).map((n) => ({ ...n, branch: snap.branches.find((b) => b.id === scope)?.short ?? "" }));

  useEffect(() => {
    void advisor.analyze(snap, scope).then(setInsights);
  }, [snap.movements.length, snap.sales.length, scope, period]);

  const greeting =
    user?.role === "owner"
      ? "Сводка по сети"
      : user?.role === "manager"
        ? "Сводка филиала"
        : user?.role === "cook"
          ? "Кухня и склад"
          : "Ваша смена";

  return (
    <div>
      <PageHeader
        eyebrow={greeting}
        title="Обзор"
        description="Выручка, себестоимость, списания, фонд оплаты и чистая прибыль — без ручных таблиц."
        actions={
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v as Period)}
            options={[
              { value: "today", label: "Сегодня" },
              { value: "7d", label: "7 дней" },
              { value: "30d", label: "30 дней" },
            ]}
          />
        }
      />

      <div className="stagger-in grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Выручка" value={rub(kpis.revenue)} hint={`${kpis.checks} чеков · ср. ${rub(kpis.avgCheck)}`} />
        <Kpi label="Фудкост" value={pct(kpis.foodCost)} hint={`себест. ${rub(kpis.cogs)}`} tone={kpis.foodCost > 32 ? "bad" : "good"} />
        <Kpi label="Списания" value={rub(kpis.writeoffs)} hint="порча, питание, недостача" tone={kpis.writeoffs > kpis.revenue * 0.02 ? "bad" : "default"} />
        <Kpi label="Чистая прибыль" value={rub(kpis.net)} hint={`ФОТ ${rub(kpis.payroll)} · opex ${rub(kpis.opex)}`} tone={kpis.net >= 0 ? "good" : "bad"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Выручка по дням</CardTitle>
            <span className="text-xs text-muted">{scope === "all" ? "Все филиалы" : snap.branches.find((b) => b.id === scope)?.short}</span>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => ruDate(d)} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}к`} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={(v: number) => rub(v)}
                  labelFormatter={(d) => ruDate(String(d), { day: "numeric", month: "long" })}
                  contentStyle={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сигналы</CardTitle>
            {user?.role === "owner" ? (
              <Link to="/integrations" className="text-xs text-muted hover:text-fg">
                подключения
              </Link>
            ) : null}
          </CardHeader>
          {!showAdvisor ? (
            <p className="text-sm text-muted">Сигналы скрыты в настройках сети.</p>
          ) : (
          <ul className="space-y-3">
            {insights.slice(0, 4).map((i) => (
              <li key={i.id} className="rounded-md bg-bg p-3">
                <div className="flex items-center gap-2">
                  <Badge tone={i.severity === "critical" ? "danger" : i.severity === "warning" ? "warning" : "primary"}>
                    {i.severity === "critical" ? "важно" : i.severity === "warning" ? "внимание" : "сигнал"}
                  </Badge>
                  <span className="text-sm font-medium">{i.title}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{i.body}</p>
              </li>
            ))}
            {insights.length === 0 ? <p className="text-sm text-muted">Аномалий нет — контур спокойный.</p> : null}
          </ul>
          )}
        </Card>
      </div>

      {user?.role === "owner" || user?.role === "manager" ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Филиалы рядом</CardTitle>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare.map((c) => ({ name: c.branch.short, revenue: c.revenue, net: c.net }))}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}к`} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={(v: number) => rub(v)}
                  contentStyle={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Филиал</th>
                  <th className="pb-2 font-medium">Выручка</th>
                  <th className="pb-2 font-medium">FC</th>
                  <th className="pb-2 font-medium">ФОТ</th>
                  <th className="pb-2 font-medium">Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((c) => (
                  <tr key={c.branch.id} className="border-t border-border">
                    <td className="py-2">{c.branch.short}</td>
                    <td className="py-2 font-mono tabular-nums">{rub(c.revenue)}</td>
                    <td className="py-2 font-mono tabular-nums">{pct(c.foodCost)}</td>
                    <td className="py-2 font-mono tabular-nums">{rub(c.payroll)}</td>
                    <td className="py-2 font-mono tabular-nums">{rub(c.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Топ блюд</CardTitle>
          </CardHeader>
          <ul className="space-y-2">
            {dishes.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span>{d.name}</span>
                <span className="font-mono text-muted tabular-nums">
                  {d.qty} · {rub(d.sum)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        {showLowStock ? (
        <Card>
          <CardHeader>
            <CardTitle>Ниже минимума</CardTitle>
            {user?.role === "owner" || user?.role === "manager" ? (
              <Link to="/procurement" className="text-xs text-muted hover:text-fg">
                к закупкам
              </Link>
            ) : null}
          </CardHeader>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">Остатки в норме.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={`${a.branch}-${a.product.id}`} className="flex items-center justify-between text-sm">
                  <span>
                    {a.product.name}
                    <span className="ml-2 text-xs text-subtle">{a.branch}</span>
                  </span>
                  <span className="font-mono text-danger tabular-nums">
                    {a.have} / {a.min} {a.product.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        ) : null}
      </div>
    </div>
  );
}
