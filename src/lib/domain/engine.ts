import type {
  Banquet,
  Branch,
  Expense,
  PayrollAccrual,
  Period,
  Product,
  Recipe,
  Sale,
  Shift,
  Snapshot,
  StockLevel,
  StockMovement,
} from "./types";
import { today } from "./types";
import { addDays } from "../format";
import {
  dishCost,
  dishFoodCostPct,
  expectedCash,
  foodcostPct,
  netProfit,
  payrollAccrual,
  roundMoney,
  roundQty,
  saleCogsFrozen,
  unitCostOf,
  weightedAvgPurchasePrice,
} from "./finance";

export function periodStart(period: Period, day = today()) {
  if (period === "today") return day;
  if (period === "7d") return addDays(day, -6);
  return addDays(day, -29);
}

export function inRange(iso: string, from: string, to: string) {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}

export function salePayments(sale: Sale) {
  const cash = sale.payments.filter((p) => p.type === "cash").reduce((s, p) => s + p.amount, 0);
  const card = sale.payments.filter((p) => p.type === "card").reduce((s, p) => s + p.amount, 0);
  const qr = sale.payments.filter((p) => p.type === "qr").reduce((s, p) => s + p.amount, 0);
  return { cash, card, qr };
}

export function recipeCost(recipe: Recipe, products: Product[], stock: StockLevel[] = [], branchId?: string) {
  return dishCost(recipe, products, stock, branchId);
}

export function recipeFoodCostPct(
  recipe: Recipe,
  products: Product[],
  stock: StockLevel[] = [],
  branchId?: string,
) {
  return dishFoodCostPct(recipe, recipeCost(recipe, products, stock, branchId));
}

export function saleCogs(sale: Sale, recipes: Recipe[], products: Product[], stock: StockLevel[] = []) {
  return saleCogsFrozen(sale, recipes, products, stock);
}

export function filterByBranch<T extends { branchId: string }>(rows: T[], branchId: string | "all") {
  return branchId === "all" ? rows : rows.filter((r) => r.branchId === branchId);
}

export function filterPeriod<T extends { date?: string; at?: string }>(rows: T[], from: string, to: string) {
  return rows.filter((r) => {
    const iso = r.at ?? r.date ?? "";
    return inRange(iso, from, to);
  });
}

export interface KpiBundle {
  revenue: number;
  cash: number;
  card: number;
  qr: number;
  checks: number;
  avgCheck: number;
  cogs: number;
  foodCost: number;
  writeoffs: number;
  opex: number;
  payroll: number;
  net: number;
  guestsBanquet: number;
  banquetRevenue: number;
}

export function computeKpis(
  snap: Snapshot,
  opts: { period: Period; branchId: string | "all" },
): KpiBundle {
  const from = periodStart(opts.period);
  const to = today();
  const sales = filterPeriod(filterByBranch(snap.sales, opts.branchId), from, to);
  const expenses = filterPeriod(filterByBranch(snap.expenses, opts.branchId), from, to);
  const payroll = filterPeriod(filterByBranch(snap.payroll, opts.branchId), from, to);
  const writeoffs = snap.movements.filter(
    (m) =>
      m.type === "writeoff" &&
      inRange(m.at, from, to) &&
      (opts.branchId === "all" || m.branchId === opts.branchId),
  );
  const banquets = filterPeriod(
    filterByBranch(snap.banquets, opts.branchId).filter((b) => b.status === "done"),
    from,
    to,
  );

  let cash = 0;
  let card = 0;
  let qr = 0;
  let revenue = 0;
  let cogs = 0;
  for (const s of sales) {
    revenue += s.total;
    cogs += saleCogs(s, snap.recipes, snap.products, snap.stock);
    const p = salePayments(s);
    cash += p.cash;
    card += p.card;
    qr += p.qr;
  }
  const writeoffSum = writeoffs.reduce((s, m) => s + Math.abs(m.cost), 0);
  const opex = expenses.reduce((s, e) => s + e.amount, 0);
  const pay = payroll.reduce((s, p) => s + p.total, 0);
  const banquetRevenue = banquets.reduce((s, b) => s + b.total, 0);
  return {
    revenue,
    cash,
    card,
    qr,
    checks: sales.length,
    avgCheck: sales.length ? revenue / sales.length : 0,
    cogs,
    foodCost: foodcostPct(cogs, revenue),
    writeoffs: writeoffSum,
    opex,
    payroll: pay,
    net: netProfit({ revenue, cogs, writeoffs: writeoffSum, opex, payroll: pay }),
    guestsBanquet: banquets.reduce((s, b) => s + b.guests, 0),
    banquetRevenue,
  };
}

export function dailyRevenue(sales: Sale[], from: string, to: string) {
  const map = new Map<string, number>();
  let d = from;
  while (d <= to) {
    map.set(d, 0);
    d = addDays(d, 1);
  }
  for (const s of sales) {
    const day = s.at.slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + s.total);
  }
  return [...map.entries()].map(([date, value]) => ({ date, value }));
}

export function branchCompare(snap: Snapshot, period: Period) {
  return snap.branches.map((b) => {
    const k = computeKpis(snap, { period, branchId: b.id });
    return { branch: b, ...k };
  });
}

export function stockOf(stock: StockLevel[], branchId: string, productId: string) {
  return stock.find((s) => s.branchId === branchId && s.productId === productId)?.qty ?? 0;
}

export function needToBuy(snap: Snapshot, branchId: string) {
  return snap.products
    .map((p) => {
      const have = stockOf(snap.stock, branchId, p.id);
      const deficit = Math.max(0, p.minQty - have);
      return { product: p, have, deficit, min: p.minQty };
    })
    .filter((x) => x.deficit > 0)
    .sort((a, b) => b.deficit * b.product.avgCost - a.deficit * a.product.avgCost);
}

export function applyMovement(stock: StockLevel[], mov: StockMovement): StockLevel[] {
  const i = stock.findIndex((s) => s.branchId === mov.branchId && s.productId === mov.productId);
  const incoming = unitCostOf(mov);
  if (i < 0) {
    return [
      ...stock,
      {
        branchId: mov.branchId,
        productId: mov.productId,
        qty: roundQty(mov.qty),
        avgCost: mov.qty > 0 ? incoming : 0,
      },
    ];
  }
  const row = stock[i];
  const next = stock.slice();
  const qty = roundQty(row.qty + mov.qty);
  const avgCost =
    mov.qty > 0 ? weightedAvgPurchasePrice(row.qty, row.avgCost, mov.qty, incoming) : row.avgCost;
  next[i] = { ...row, qty, avgCost };
  return next;
}

export function deductSaleFromStock(
  stock: StockLevel[],
  sale: Sale,
  recipes: Recipe[],
  products: Product[],
  userId: string,
): { stock: StockLevel[]; movements: StockMovement[] } {
  let next = stock;
  const movements: StockMovement[] = [];
  for (const item of sale.items) {
    const recipe = recipes.find((r) => r.id === item.recipeId);
    if (!recipe) continue;
    for (const ing of recipe.items) {
      const onHand = stock.find((s) => s.branchId === sale.branchId && s.productId === ing.productId);
      const product = products.find((p) => p.id === ing.productId);
      const unit = onHand?.avgCost || product?.avgCost || 0;
      const qty = -(ing.qty * item.qty);
      const cost = unit * Math.abs(qty);
      const mov: StockMovement = {
        id: `m_${sale.id}_${ing.productId}`,
        at: sale.at,
        branchId: sale.branchId,
        productId: ing.productId,
        type: "sale",
        qty,
        cost,
        refId: sale.id,
        userId,
      };
      movements.push(mov);
      next = applyMovement(next, mov);
    }
  }
  return { stock: next, movements };
}

export function shiftTotals(shift: Shift, sales: Sale[]) {
  const rows = sales.filter((s) => s.shiftId === shift.id);
  let cash = 0;
  let card = 0;
  let qr = 0;
  for (const s of rows) {
    const p = salePayments(s);
    cash += p.cash;
    card += p.card;
    qr += p.qr;
  }
  const expected = expectedCash(shift.openCash, cash);
  return { cash, card, qr, expected, checks: rows.length, revenue: cash + card + qr };
}

export function shiftHours(shift: Shift) {
  if (!shift.closedAt) return 11;
  const ms = new Date(shift.closedAt).getTime() - new Date(shift.openedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 11;
  return Math.max(1, Math.round(ms / 3_600_000));
}

export function payrollForShift(shift: Shift, sales: Sale[], users: Snapshot["users"]) {
  const { revenue } = shiftTotals(shift, sales);
  const hours = shiftHours(shift);
  return shift.staffIds.map((userId) => {
    const u = users.find((x) => x.id === userId);
    const pay = payrollAccrual(u?.shiftPay ?? 0, u?.salesPercent ?? 0, revenue);
    return {
      userId,
      hours,
      base: pay.base,
      bonus: pay.bonus,
      total: pay.total,
    };
  });
}

export function openShiftFor(shifts: Shift[], branchId: string) {
  return shifts.find((s) => s.branchId === branchId && s.status === "open") ?? null;
}

export function banquetBalance(b: Banquet) {
  return Math.max(0, b.total - (b.depositPaid ? b.deposit : 0));
}

export function topDishes(sales: Sale[], limit = 6) {
  const map = new Map<string, { name: string; qty: number; sum: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      const cur = map.get(it.recipeId) ?? { name: it.name, qty: 0, sum: 0 };
      cur.qty += it.qty;
      cur.sum += it.sum;
      map.set(it.recipeId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.sum - a.sum).slice(0, limit);
}

export function writeoffByReason(movements: StockMovement[], from: string, to: string, branchId: string | "all") {
  const map = new Map<string, number>();
  for (const m of movements) {
    if (m.type !== "writeoff" || !inRange(m.at, from, to)) continue;
    if (branchId !== "all" && m.branchId !== branchId) continue;
    const key = m.reason ?? "error";
    map.set(key, (map.get(key) ?? 0) + Math.abs(m.cost));
  }
  return [...map.entries()].map(([reason, value]) => ({ reason, value }));
}

export function findBranch(branches: Branch[], id: string) {
  return branches.find((b) => b.id === id);
}

export function findProduct(products: Product[], id: string) {
  return products.find((p) => p.id === id);
}

export function staffName(users: Snapshot["users"], id: string) {
  return users.find((u) => u.id === id)?.name ?? "—";
}

export function expenseTotal(expenses: Expense[]) {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function payrollTotal(rows: PayrollAccrual[]) {
  return rows.reduce((s, p) => s + p.total, 0);
}
