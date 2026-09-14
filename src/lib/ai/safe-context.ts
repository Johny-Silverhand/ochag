import type { Period, Snapshot } from "../domain/types.ts";
import { computeKpis, topDishes, writeoffByReason, periodStart } from "../domain/engine.ts";
import { TODAY } from "../domain/types.ts";
import { activeStopList } from "../domain/stoplist.ts";

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
  cash: number;
  topDishes: { name: string; qty: number; sum: number }[];
  writeoffReasons: { reason: string; value: number }[];
  stopList: string[];
  openShifts: number;
}

/** Aggregates only — no names, phones, PINs, or cheque payloads. */
export function safeMetrics(snap: Snapshot, period: Period, branchId: string | "all"): SafeMetrics {
  const k = computeKpis(snap, { period, branchId });
  const from = periodStart(period);
  const sales = snap.sales.filter(
    (s) => s.at.slice(0, 10) >= from && s.at.slice(0, 10) <= TODAY && (branchId === "all" || s.branchId === branchId),
  );
  const recipes = new Map(snap.recipes.map((r) => [r.id, r.name]));
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
    avgCheck: Math.round(k.avgCheck),
    cash: Math.round(k.cash),
    topDishes: topDishes(sales, 5),
    writeoffReasons: writeoffByReason(snap.movements, from, TODAY, branchId),
    stopList: activeStopList(snap.stopList, branchId).map((e) => recipes.get(e.recipeId) ?? e.recipeId),
    openShifts: snap.shifts.filter((s) => s.status === "open" && (branchId === "all" || s.branchId === branchId)).length,
  };
}
