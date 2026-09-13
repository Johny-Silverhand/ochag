/**
 * TZ §5 — profit and food-cost formulas.
 *
 * These are the only numbers the dashboards and payroll may use.
 * Do not blend prices (the old 0.6/0.4 trick) and do not recompute
 * a sold dish from today's purchase price.
 *
 *   weighted avg  P' = (Q·P + q·p) / (Q + q)
 *   dish cost     C  = Σ(qty_i · P_i) / yield
 *   foodcost      FC = COGS / revenue · 100
 *   expected cash E  = open_cash + cash_sales
 *   payroll       W  = shift_rate + sales_% · shift_revenue
 *   net profit    N  = revenue − COGS − writeoffs − opex − payroll
 *
 * cost_at_sale is frozen on the cheque line at sale time.
 */
import type { Product, Recipe, Sale, SaleItem, Snapshot, StockLevel } from "./types";

export function roundMoney(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function roundQty(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** P' = (Q·P + q·p) / (Q + q). Incoming qty ≤ 0 leaves the old price. */
export function weightedAvgPurchasePrice(
  onHandQty: number,
  onHandAvg: number,
  incomingQty: number,
  incomingPrice: number,
): number {
  if (incomingQty <= 0) return onHandAvg;
  if (onHandQty <= 0) return incomingPrice;
  const total = onHandQty + incomingQty;
  if (total <= 0) return incomingPrice;
  return roundMoney((onHandQty * onHandAvg + incomingQty * incomingPrice) / total, 4);
}

export function unitCostOf(movement: { qty: number; cost: number }) {
  const q = Math.abs(movement.qty);
  return q > 0 ? movement.cost / q : 0;
}

export function stockAvgCost(
  stock: StockLevel[],
  products: Product[],
  branchId: string,
  productId: string,
): number {
  const row = stock.find((s) => s.branchId === branchId && s.productId === productId);
  if (row && row.avgCost > 0) return row.avgCost;
  return products.find((p) => p.id === productId)?.avgCost ?? 0;
}

/**
 * Dish cost for one sale portion at a warehouse.
 * C = Σ(ingredient_qty · avg_cost) / max(yield, 1)
 */
export function dishCost(
  recipe: Recipe,
  products: Product[],
  stock: StockLevel[] = [],
  branchId?: string,
): number {
  const yieldPortions = recipe.yieldPortions > 0 ? recipe.yieldPortions : 1;
  const raw = recipe.items.reduce((sum, item) => {
    const price = branchId
      ? stockAvgCost(stock, products, branchId, item.productId)
      : (products.find((p) => p.id === item.productId)?.avgCost ?? 0);
    return sum + price * item.qty;
  }, 0);
  return roundMoney(raw / yieldPortions, 4);
}

export function dishFoodCostPct(recipe: Recipe, cost: number) {
  return recipe.price <= 0 ? 0 : (cost / recipe.price) * 100;
}

export function freezeSaleCosts(
  items: Omit<SaleItem, "costAtSale">[],
  recipes: Recipe[],
  products: Product[],
  stock: StockLevel[],
  branchId: string,
): SaleItem[] {
  return items.map((item) => {
    const recipe = recipes.find((r) => r.id === item.recipeId);
    const unit = recipe ? dishCost(recipe, products, stock, branchId) : 0;
    return { ...item, costAtSale: roundMoney(unit * item.qty, 4) };
  });
}

/** COGS uses frozen cost_at_sale. Missing (legacy) lines fall back once. */
export function saleCogsFrozen(sale: Sale, recipes: Recipe[], products: Product[], stock: StockLevel[] = []) {
  return sale.items.reduce((sum, item) => {
    if (typeof item.costAtSale === "number") return sum + item.costAtSale;
    const recipe = recipes.find((r) => r.id === item.recipeId);
    if (!recipe) return sum;
    return sum + dishCost(recipe, products, stock, sale.branchId) * item.qty;
  }, 0);
}

export function foodcostPct(cogs: number, revenue: number) {
  return revenue > 0 ? (cogs / revenue) * 100 : 0;
}

/** E = open_cash + cash_sales. Refunds / cash-out are not in the TZ excerpt. */
export function expectedCash(openCash: number, cashSales: number) {
  return roundMoney(openCash + cashSales);
}

/** W = shift_rate + sales_% · shift_revenue (per person on the shift). */
export function payrollAccrual(shiftPay: number, salesPercent: number, shiftRevenue: number) {
  const bonus = roundMoney((salesPercent / 100) * shiftRevenue);
  return {
    base: roundMoney(shiftPay),
    bonus,
    total: roundMoney(shiftPay + bonus),
  };
}

/** N = revenue − COGS − writeoffs − opex − payroll */
export function netProfit(input: {
  revenue: number;
  cogs: number;
  writeoffs: number;
  opex: number;
  payroll: number;
}) {
  return roundMoney(input.revenue - input.cogs - input.writeoffs - input.opex - input.payroll);
}

export function catalogAvgFromStock(stock: StockLevel[], productId: string, fallback: number) {
  const rows = stock.filter((s) => s.productId === productId && s.qty > 0);
  const qty = rows.reduce((s, r) => s + r.qty, 0);
  if (qty <= 0) return fallback;
  return roundMoney(
    rows.reduce((s, r) => s + r.qty * r.avgCost, 0) / qty,
    4,
  );
}

export function publicUser<T extends { password: string; pin: string }>(user: T) {
  const { password: _p, pin: _pin, ...rest } = user;
  return rest;
}

export function publicSnapshot(snap: Snapshot): Snapshot {
  return {
    ...snap,
    users: snap.users.map((u) => ({ ...u, password: "", pin: "" })),
  };
}
