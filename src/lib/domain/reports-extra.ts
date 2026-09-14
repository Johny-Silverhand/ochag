import { filterByBranch, filterPeriod, periodStart } from "./engine.ts";
import { today } from "./types.ts";
import type { Period, Snapshot } from "./types.ts";
import { roundMoney } from "./finance.ts";

/** Cafe civil hour. Vercel is UTC; peak planning must follow Moscow, not the function region. */
export const CAFE_TZ = "Europe/Moscow";

export function hourInCafeZone(iso: string, timeZone = CAFE_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 0;
}

export function averageCheque(snap: Snapshot, period: Period, branchId: string) {
  const from = periodStart(period);
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, today()).filter((s) => !s.voided);
  const revenue = sales.reduce((s, r) => s + r.total, 0);
  const checks = sales.length;
  const guestsProxy = sales.reduce((s, r) => s + r.items.reduce((n, it) => n + it.qty, 0), 0);
  return {
    checks,
    revenue: roundMoney(revenue),
    avgCheck: checks ? roundMoney(revenue / checks) : 0,
    itemsPerCheck: checks ? roundMoney(guestsProxy / checks, 2) : 0,
  };
}

export function revenueByHour(snap: Snapshot, period: Period, branchId: string) {
  const from = periodStart(period);
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, today()).filter((s) => !s.voided);
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    revenue: 0,
    checks: 0,
  }));
  for (const s of sales) {
    const hour = hourInCafeZone(s.at);
    hours[hour]!.revenue += s.total;
    hours[hour]!.checks += 1;
  }
  const rows = hours.map((h) => ({ ...h, revenue: roundMoney(h.revenue) }));
  const peak = [...rows].sort((a, b) => b.revenue - a.revenue || b.checks - a.checks)[0];
  return {
    rows,
    peakHour: peak && peak.revenue > 0 ? peak.hour : null,
    peakLabel: peak && peak.revenue > 0 ? peak.label : null,
    peakRevenue: peak && peak.revenue > 0 ? peak.revenue : 0,
  };
}

export function waiterVoidsAndDiscounts(snap: Snapshot, period: Period, branchId: string) {
  const from = periodStart(period);
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, today());
  const map = new Map<
    string,
    { waiterId: string; name: string; checks: number; voids: number; voidSum: number; discounts: number; discountSum: number }
  >();
  for (const s of sales) {
    const waiter = snap.users.find((u) => u.id === s.waiterId);
    const cur = map.get(s.waiterId) ?? {
      waiterId: s.waiterId,
      name: waiter?.name ?? s.waiterId,
      checks: 0,
      voids: 0,
      voidSum: 0,
      discounts: 0,
      discountSum: 0,
    };
    cur.checks += 1;
    if (s.voided) {
      cur.voids += 1;
      cur.voidSum += s.total;
    }
    if ((s.discount ?? 0) > 0) {
      cur.discounts += 1;
      cur.discountSum += s.discount ?? 0;
    }
    map.set(s.waiterId, cur);
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      voidSum: roundMoney(r.voidSum),
      discountSum: roundMoney(r.discountSum),
    }))
    .sort((a, b) => b.voids + b.discounts - (a.voids + a.discounts) || b.voidSum - a.voidSum);
}
