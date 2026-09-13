import { filterByBranch, filterPeriod, inRange, saleCogs, salePayments } from "./engine";
import { today } from "./types";
import type { Period, Snapshot } from "./types";
import { periodStart } from "./engine";
import { addDays } from "../format";
import { foodcostPct, netProfit } from "./finance";

export function abcByRevenue(snap: Snapshot, period: Period, branchId: string) {
  const from = periodStart(period);
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, today());
  const map = new Map<string, { name: string; revenue: number; cogs: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      const cur = map.get(it.recipeId) ?? { name: it.name, revenue: 0, cogs: 0 };
      cur.revenue += it.sum;
      cur.cogs += it.costAtSale ?? 0;
      map.set(it.recipeId, cur);
    }
  }
  const rows = [...map.values()]
    .map((r) => ({ ...r, profit: r.revenue - r.cogs }))
    .sort((a, b) => b.revenue - a.revenue);
  const total = rows.reduce((s, r) => s + r.revenue, 0) || 1;
  let acc = 0;
  return rows.map((r) => {
    acc += r.revenue;
    const share = acc / total;
    const cls = share <= 0.8 ? "A" : share <= 0.95 ? "B" : "C";
    return { ...r, share: r.revenue / total, cls };
  });
}

export function planVsFact(snap: Snapshot, branchId: string, month: string) {
  const from = `${month}-01`;
  const to = today() < addDays(from, 32) ? today() : `${month}-31`;
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, to);
  const days: { date: string; fact: number; plan: number }[] = [];
  const plan = snap.revenuePlans.find((p) => p.branchId === branchId && p.month === month);
  const target = plan?.target ?? 0;
  let d = from;
  let factAcc = 0;
  const dim = Number(to.slice(8, 10)) || 30;
  const daily = target / Math.max(1, dim);
  while (d <= to && d.startsWith(month)) {
    const daySum = sales.filter((s) => s.at.slice(0, 10) === d).reduce((s, r) => s + r.total, 0);
    factAcc += daySum;
    const dayNum = Number(d.slice(8, 10));
    days.push({ date: d, fact: factAcc, plan: daily * dayNum });
    d = addDays(d, 1);
  }
  return { target, fact: factAcc, days };
}

export function stockCover(snap: Snapshot, branchId: string, period: Period) {
  const from = periodStart(period);
  const to = today();
  const days = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000 + 1);
  const used = new Map<string, number>();
  for (const m of snap.movements) {
    if (m.type !== "sale" || m.branchId !== branchId || !inRange(m.at, from, to)) continue;
    used.set(m.productId, (used.get(m.productId) ?? 0) + Math.abs(m.qty));
  }
  return snap.products
    .map((p) => {
      const pace = (used.get(p.id) ?? 0) / days;
      const have = snap.stock.find((s) => s.branchId === branchId && s.productId === p.id)?.qty ?? 0;
      return {
        productId: p.id,
        name: p.name,
        have,
        pace,
        days: pace > 0 ? have / pace : Infinity,
      };
    })
    .filter((r) => r.pace > 0 || r.have > 0)
    .sort((a, b) => a.days - b.days);
}

export function deviations(snap: Snapshot, period: Period, branchId: string) {
  const from = periodStart(period);
  const to = today();
  const rows: { kind: string; title: string; body: string; branchId: string; shiftId?: string }[] = [];

  const invoices = filterPeriod(filterByBranch(snap.invoices, branchId), from, to);
  const lastPrice = new Map<string, number>();
  for (const inv of [...invoices].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const line of inv.lines) {
      const prev = lastPrice.get(line.productId);
      if (prev && line.price > prev * 1.08) {
        const p = snap.products.find((x) => x.id === line.productId);
        rows.push({
          kind: "price",
          title: `Скачок закупки: ${p?.name ?? line.productId}`,
          body: `${prev} → ${line.price} ₽ (${inv.date}, ${inv.supplier})`,
          branchId: inv.branchId,
        });
      }
      lastPrice.set(line.productId, line.price);
    }
  }

  const wo = snap.movements.filter(
    (m) => m.type === "writeoff" && inRange(m.at, from, to) && (branchId === "all" || m.branchId === branchId),
  );
  const byReason = new Map<string, number>();
  for (const m of wo) byReason.set(m.reason ?? "error", (byReason.get(m.reason ?? "error") ?? 0) + 1);
  for (const [reason, n] of byReason) {
    if (n >= 3) {
      rows.push({
        kind: "writeoff",
        title: `Повторяющиеся списания (${reason})`,
        body: `${n} раз за период`,
        branchId: branchId === "all" ? wo[0]?.branchId ?? "" : branchId,
      });
    }
  }

  const closed = snap.shifts.filter(
    (s) => s.status === "closed" && inRange(s.date, from, to) && (branchId === "all" || s.branchId === branchId),
  );
  for (const s of closed) {
    if (typeof s.discrepancy === "number" && Math.abs(s.discrepancy) >= 300) {
      rows.push({
        kind: "cash",
        title: "Расхождение кассы",
        body: `${s.date}: ${s.discrepancy} ₽`,
        branchId: s.branchId,
        shiftId: s.id,
      });
    }
  }
  return rows;
}

export function compareRevisions(snap: Snapshot, branchId: string) {
  const pair = snap.revisions.filter((r) => r.branchId === branchId && r.status === "done").slice(0, 2);
  if (pair.length < 2) return { left: pair[0] ?? null, right: pair[1] ?? null, rows: [] };
  const [newer, older] = pair;
  const ids = new Set([...newer.lines.map((l) => l.productId), ...older.lines.map((l) => l.productId)]);
  const rows = [...ids].map((productId) => {
    const a = older.lines.find((l) => l.productId === productId);
    const b = newer.lines.find((l) => l.productId === productId);
    const product = snap.products.find((p) => p.id === productId);
    const delta = (b?.factQty ?? 0) - (a?.factQty ?? 0);
    const shortage = Math.min(0, (b?.factQty ?? 0) - (b?.bookQty ?? 0));
    return {
      productId,
      name: product?.name ?? productId,
      category: product?.category ?? "",
      older: a?.factQty ?? 0,
      newer: b?.factQty ?? 0,
      delta,
      shortage,
    };
  });
  return { left: older, right: newer, rows };
}

export function priceHistory(snap: Snapshot, productId: string) {
  const points: { date: string; price: number; supplier: string; branchId: string; up: boolean }[] = [];
  const invoices = [...snap.invoices].sort((a, b) => a.date.localeCompare(b.date));
  let prev = 0;
  for (const inv of invoices) {
    const line = inv.lines.find((l) => l.productId === productId);
    if (!line) continue;
    points.push({
      date: inv.date,
      price: line.price,
      supplier: inv.supplier,
      branchId: inv.branchId,
      up: prev > 0 && line.price > prev,
    });
    prev = line.price;
  }
  return points;
}

export function periodPayroll(snap: Snapshot, period: Period, branchId: string) {
  const from = periodStart(period);
  const to = today();
  const accruals = filterPeriod(filterByBranch(snap.payroll, branchId), from, to);
  const adjs = filterPeriod(filterByBranch(snap.payrollAdjustments, branchId), from, to);
  const users = snap.users.filter((u) => branchId === "all" || u.branchId === branchId || u.branchId === null);
  return users.map((u) => {
    const rows = accruals.filter((r) => r.userId === u.id);
    const extras = adjs.filter((a) => a.userId === u.id);
    const base = rows.reduce((s, r) => s + r.base, 0);
    const bonus = rows.reduce((s, r) => s + r.bonus, 0);
    const fine = extras.filter((a) => a.kind === "fine").reduce((s, a) => s + a.amount, 0);
    const advance = extras.filter((a) => a.kind === "advance").reduce((s, a) => s + a.amount, 0);
    const extra = extras.filter((a) => a.kind === "extra").reduce((s, a) => s + a.amount, 0);
    const total = base + bonus + extra - fine;
    return { user: u, shifts: rows.length, base, bonus, fine, advance, extra, payable: total, advanceOut: advance };
  });
}

export function monthKpis(snap: Snapshot, branchId: string, from: string, to: string) {
  const sales = filterPeriod(filterByBranch(snap.sales, branchId), from, to);
  let revenue = 0;
  let cogs = 0;
  let cash = 0;
  for (const s of sales) {
    revenue += s.total;
    cogs += saleCogs(s, snap.recipes, snap.products, snap.stock);
    cash += salePayments(s).cash;
  }
  const writeoffs = snap.movements
    .filter((m) => m.type === "writeoff" && inRange(m.at, from, to) && (branchId === "all" || m.branchId === branchId))
    .reduce((s, m) => s + Math.abs(m.cost), 0);
  const opex = filterPeriod(filterByBranch(snap.expenses, branchId), from, to).reduce((s, e) => s + e.amount, 0);
  const payroll = filterPeriod(filterByBranch(snap.payroll, branchId), from, to).reduce((s, p) => s + p.total, 0);
  return {
    revenue,
    cogs,
    cash,
    foodCost: foodcostPct(cogs, revenue),
    writeoffs,
    opex,
    payroll,
    net: netProfit({ revenue, cogs, writeoffs, opex, payroll }),
  };
}
