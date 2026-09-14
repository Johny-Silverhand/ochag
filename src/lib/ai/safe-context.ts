import type { Period, Snapshot } from "../domain/types.ts";
import { computeKpis, filterByBranch, filterPeriod, needToBuy, periodStart, topDishes, writeoffByReason } from "../domain/engine.ts";
import { today } from "../domain/types.ts";
import { activeStopList } from "../domain/stoplist.ts";
import { averageCheque, revenueByHour } from "../domain/reports-extra.ts";
import { roundMoney } from "../domain/finance.ts";

export interface SafeMetrics {
  period: Period;
  branch: string;
  revenue: number;
  cogs: number;
  foodCost: number;
  writeoffs: number;
  opex: number;
  payroll: number;
  net: number;
  checks: number;
  avgCheck: number;
  itemsPerCheck: number;
  cash: number;
  contribution: number;
  grossMarginPct: number;
  writeoffSharePct: number;
  topDishes: { name: string; qty: number; sum: number }[];
  writeoffReasons: { reason: string; value: number }[];
  stopList: string[];
  openShifts: number;
  peakHour: number | null;
  peakLabel: string | null;
  peakRevenue: number;
  peakChecks: number;
  busyHours: { hour: number; label: string; revenue: number; checks: number }[];
  voidCount: number;
  discountSum: number;
  lowCover: { name: string; days: number }[];
  month: string;
  monthFact: number;
  planTarget: number;
  daysElapsed: number;
  daysInMonth: number;
  runRateMonth: number;
}

function monthBounds(day = today()) {
  const month = day.slice(0, 7);
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysElapsed = Math.min(daysInMonth, Math.max(1, Number(day.slice(8, 10)) || 1));
  return { month, daysInMonth, daysElapsed };
}

function monthFactAndPlan(snap: Snapshot, branchId: string | "all", month: string) {
  const from = `${month}-01`;
  const to = today();
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, to).filter((s) => !s.voided);
  const monthFact = roundMoney(sales.reduce((s, r) => s + r.total, 0));
  const planTarget = roundMoney(
    branchId === "all"
      ? snap.revenuePlans.filter((p) => p.month === month).reduce((s, p) => s + p.target, 0)
      : (snap.revenuePlans.find((p) => p.branchId === branchId && p.month === month)?.target ?? 0),
  );
  return { monthFact, planTarget };
}

function lowCoverOf(snap: Snapshot, branchId: string | "all") {
  const branches = branchId === "all" ? snap.branches : snap.branches.filter((b) => b.id === branchId);
  const rows: { name: string; days: number }[] = [];
  for (const b of branches) {
    for (const n of needToBuy(snap, b.id).slice(0, 3)) {
      const label = branchId === "all" ? `${n.product.name} · ${b.short}` : n.product.name;
      rows.push({ name: label, days: n.min > 0 ? roundMoney((n.have / n.min) * 7, 1) : 0 });
    }
  }
  return rows.slice(0, 6);
}

/** Aggregates only — no phones, PINs, or cheque payloads. */
export function safeMetrics(snap: Snapshot, period: Period, branchId: string | "all"): SafeMetrics {
  const k = computeKpis(snap, { period, branchId });
  const from = periodStart(period);
  const to = today();
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, to);
  const live = sales.filter((s) => !s.voided);
  const recipes = new Map(snap.recipes.map((r) => [r.id, r.name]));
  const avg = averageCheque(snap, period, branchId);
  const hourly = revenueByHour(snap, period, branchId);
  const busyHours = hourly.rows
    .filter((r) => r.checks > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);
  const peak = hourly.rows.find((r) => r.hour === hourly.peakHour);
  const { month, daysInMonth, daysElapsed } = monthBounds();
  const { monthFact, planTarget } = monthFactAndPlan(snap, branchId, month);
  const contribution = roundMoney(k.revenue - k.cogs);
  const writeoffSharePct = k.revenue > 0 ? roundMoney((k.writeoffs / k.revenue) * 100, 1) : 0;
  return {
    period,
    branch: branchId === "all" ? "network" : (snap.branches.find((b) => b.id === branchId)?.short ?? branchId),
    revenue: Math.round(k.revenue),
    cogs: Math.round(k.cogs),
    foodCost: Math.round(k.foodCost * 10) / 10,
    writeoffs: Math.round(k.writeoffs),
    opex: Math.round(k.opex),
    payroll: Math.round(k.payroll),
    net: Math.round(k.net),
    checks: k.checks,
    avgCheck: Math.round(avg.avgCheck),
    itemsPerCheck: avg.itemsPerCheck,
    cash: Math.round(k.cash),
    contribution,
    grossMarginPct: k.revenue > 0 ? roundMoney((contribution / k.revenue) * 100, 1) : 0,
    writeoffSharePct,
    topDishes: topDishes(live, 5),
    writeoffReasons: writeoffByReason(snap.movements, from, to, branchId),
    stopList: activeStopList(snap.stopList, branchId).map((e) => recipes.get(e.recipeId) ?? e.recipeId),
    openShifts: snap.shifts.filter((s) => s.status === "open" && (branchId === "all" || s.branchId === branchId)).length,
    peakHour: hourly.peakHour,
    peakLabel: hourly.peakLabel,
    peakRevenue: hourly.peakRevenue,
    peakChecks: peak?.checks ?? 0,
    busyHours,
    voidCount: sales.filter((s) => s.voided).length,
    discountSum: roundMoney(live.reduce((s, r) => s + (r.discount ?? 0), 0)),
    lowCover: lowCoverOf(snap, branchId),
    month,
    monthFact,
    planTarget,
    daysElapsed,
    daysInMonth,
    runRateMonth: roundMoney((monthFact / daysElapsed) * daysInMonth),
  };
}

export function sampleMetrics(partial: Partial<SafeMetrics> = {}): SafeMetrics {
  return {
    period: "7d",
    branch: "network",
    revenue: 100000,
    cogs: 30000,
    foodCost: 30,
    writeoffs: 500,
    opex: 10000,
    payroll: 20000,
    net: 39500,
    checks: 80,
    avgCheck: 1250,
    itemsPerCheck: 2.4,
    cash: 40000,
    contribution: 70000,
    grossMarginPct: 70,
    writeoffSharePct: 0.5,
    topDishes: [{ name: "Шашлык", qty: 40, sum: 28000 }],
    writeoffReasons: [],
    stopList: [],
    openShifts: 1,
    peakHour: 19,
    peakLabel: "19:00",
    peakRevenue: 22000,
    peakChecks: 18,
    busyHours: [{ hour: 19, label: "19:00", revenue: 22000, checks: 18 }],
    voidCount: 0,
    discountSum: 0,
    lowCover: [],
    month: "2026-09",
    monthFact: 420000,
    planTarget: 720000,
    daysElapsed: 14,
    daysInMonth: 30,
    runRateMonth: 900000,
    ...partial,
  };
}
