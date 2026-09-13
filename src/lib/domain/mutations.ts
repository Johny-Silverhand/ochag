import type {
  Banquet,
  BanquetStatus,
  ExpenseKind,
  InvoiceLine,
  PaymentType,
  PurchaseLine,
  RequestStatus,
  RevisionLine,
  Sale,
  SaleItem,
  Snapshot,
  StopListReason,
  WriteoffReason,
} from "./types";
import { TODAY } from "./types";
import {
  applyMovement,
  deductSaleFromStock,
  needToBuy,
  openShiftFor,
  payrollForShift,
  shiftTotals,
} from "./engine";
import { catalogAvgFromStock, freezeSaleCosts } from "./finance";
import { uid } from "../utils";
import { assertBranchScope, assertCash, assertExpenses, assertKeeper, assertSale, assertStopList, assertTransfer, assertWriteoff, type Actor, writeBranch } from "../authz/actor";

export function applyWriteoff(
  snap: Snapshot,
  actor: Actor,
  input: { productId: string; qty: number; reason: WriteoffReason; note?: string },
): Snapshot {
  assertWriteoff(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const product = snap.products.find((p) => p.id === input.productId);
  const unit =
    snap.stock.find((s) => s.branchId === branchId && s.productId === input.productId)?.avgCost ??
    product?.avgCost ??
    0;
  const q = -Math.abs(input.qty);
  const mov = {
    id: uid("wo"),
    at: new Date().toISOString(),
    branchId,
    productId: input.productId,
    type: "writeoff" as const,
    qty: q,
    cost: Math.abs(q) * unit,
    reason: input.reason,
    note: input.note,
    userId: actor.userId,
  };
  return { ...snap, movements: [mov, ...snap.movements], stock: applyMovement(snap.stock, mov) };
}

export function applyInvoice(
  snap: Snapshot,
  actor: Actor,
  input: { supplier: string; number: string; date: string; lines: InvoiceLine[] },
): Snapshot {
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const total = input.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const inv = {
    id: uid("inv"),
    number: input.number,
    branchId,
    supplier: input.supplier,
    date: input.date,
    lines: input.lines,
    total,
    userId: actor.userId,
  };
  const movs = input.lines.map((l) => ({
    id: uid("m"),
    at: `${input.date}T10:00:00.000Z`,
    branchId,
    productId: l.productId,
    type: "receipt" as const,
    qty: l.qty,
    cost: l.qty * l.price,
    refId: inv.id,
    userId: actor.userId,
    note: input.supplier,
  }));
  let stock = snap.stock;
  for (const m of movs) stock = applyMovement(stock, m);
  const products = snap.products.map((p) => {
    const line = input.lines.find((l) => l.productId === p.id);
    if (!line) return p;
    return { ...p, avgCost: catalogAvgFromStock(stock, p.id, line.price) };
  });
  return {
    ...snap,
    invoices: [inv, ...snap.invoices],
    movements: [...movs, ...snap.movements],
    stock,
    products,
  };
}

export function applyRequestFromNeed(snap: Snapshot, actor: Actor): Snapshot {
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const need = needToBuy(snap, branchId);
  if (need.length === 0) return snap;
  const lines: PurchaseLine[] = need.map((n) => ({
    productId: n.product.id,
    qty: Math.ceil(n.deficit * 10) / 10,
  }));
  return {
    ...snap,
    requests: [
      {
        id: uid("pr"),
        number: `ЗК-${100 + snap.requests.length + 1}`,
        branchId,
        date: TODAY,
        status: "draft",
        lines,
        userId: actor.userId,
      },
      ...snap.requests,
    ],
  };
}

export function applyRequestStatus(snap: Snapshot, id: string, status: RequestStatus): Snapshot {
  return { ...snap, requests: snap.requests.map((r) => (r.id === id ? { ...r, status } : r)) };
}

export function applyOpenShift(snap: Snapshot, actor: Actor, input: { openCash: number; staffIds: string[] }): Snapshot {
  assertCash(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  if (openShiftFor(snap.shifts, branchId)) return snap;
  return {
    ...snap,
    shifts: [
      {
        id: uid("sh"),
        branchId,
        date: TODAY,
        status: "open",
        openedAt: new Date().toISOString(),
        openedBy: actor.userId,
        openCash: input.openCash,
        cashTotal: 0,
        cardTotal: 0,
        qrTotal: 0,
        staffIds: input.staffIds,
      },
      ...snap.shifts,
    ],
  };
}

export function applyCloseShift(snap: Snapshot, actor: Actor, input: { closeCash: number; note?: string }): Snapshot {
  assertCash(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const shift = openShiftFor(snap.shifts, branchId);
  if (!shift) return snap;
  const totals = shiftTotals(shift, snap.sales);
  const discrepancy = Math.round(input.closeCash - totals.expected);
  const pays = payrollForShift(shift, snap.sales, snap.users);
  return {
    ...snap,
    shifts: snap.shifts.map((sh) =>
      sh.id === shift.id
        ? {
            ...sh,
            status: "closed" as const,
            closedAt: new Date().toISOString(),
            closedBy: actor.userId,
            closeCash: input.closeCash,
            expectedCash: totals.expected,
            discrepancy,
            cashTotal: totals.cash,
            cardTotal: totals.card,
            qrTotal: totals.qr,
            note: input.note,
          }
        : sh,
    ),
    payroll: [
      ...pays.map((p) => ({
        id: uid("pay"),
        userId: p.userId,
        branchId,
        date: TODAY,
        shiftId: shift.id,
        hours: p.hours,
        base: p.base,
        bonus: p.bonus,
        total: p.total,
      })),
      ...snap.payroll,
    ],
  };
}

export function applyManualSale(
  snap: Snapshot,
  actor: Actor,
  items: Omit<SaleItem, "costAtSale">[],
  payment: PaymentType,
): Snapshot {
  assertSale(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const shift = openShiftFor(snap.shifts, branchId);
  if (!shift) return snap;
  const total = items.reduce((sum, i) => sum + i.sum, 0);
  const frozen = freezeSaleCosts(items, snap.recipes, snap.products, snap.stock, branchId);
  const sale: Sale = {
    id: uid("sale"),
    number: `ЧК-${String(10000 + snap.sales.length + 1).padStart(4, "0")}`,
    branchId,
    shiftId: shift.id,
    at: new Date().toISOString(),
    items: frozen,
    payments: [{ type: payment, amount: total }],
    total,
    waiterId: actor.userId,
    source: "manual",
  };
  const deducted = deductSaleFromStock(snap.stock, sale, snap.recipes, snap.products, actor.userId);
  return {
    ...snap,
    sales: [sale, ...snap.sales],
    stock: deducted.stock,
    movements: [...deducted.movements, ...snap.movements],
  };
}

export function applyKeeperSales(
  snap: Snapshot,
  actor: Actor,
  incoming: Omit<Sale, "shiftId" | "id" | "number" | "branchId">[],
): { snap: Snapshot; added: number } {
  assertKeeper(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const shift = openShiftFor(snap.shifts, branchId);
  if (!shift) return { snap, added: 0 };
  let stock = snap.stock;
  const movs = [];
  const newSales: Sale[] = [];
  let added = 0;
  for (const row of incoming) {
    const sale: Sale = {
      ...row,
      id: uid("sale"),
      number: `КПР-${String(snap.sales.length + added + 1).padStart(4, "0")}`,
      shiftId: shift.id,
      branchId,
      source: "keeper",
      items: freezeSaleCosts(row.items, snap.recipes, snap.products, stock, branchId),
    };
    const d = deductSaleFromStock(stock, sale, snap.recipes, snap.products, actor.userId);
    stock = d.stock;
    movs.push(...d.movements);
    newSales.push(sale);
    added += 1;
  }
  return {
    added,
    snap: {
      ...snap,
      sales: [...newSales, ...snap.sales],
      stock,
      movements: [...movs, ...snap.movements],
    },
  };
}

export function applyBanquet(snap: Snapshot, actor: Actor, banquet: Banquet): Snapshot {
  assertBranchScope(actor, banquet.branchId);
  const i = snap.banquets.findIndex((x) => x.id === banquet.id);
  if (i < 0) return { ...snap, banquets: [banquet, ...snap.banquets] };
  const next = snap.banquets.slice();
  next[i] = banquet;
  return { ...snap, banquets: next };
}

export function applyBanquetStatus(snap: Snapshot, actor: Actor, id: string, status: BanquetStatus): Snapshot {
  const row = snap.banquets.find((b) => b.id === id);
  if (row) assertBranchScope(actor, row.branchId);
  return { ...snap, banquets: snap.banquets.map((b) => (b.id === id ? { ...b, status } : b)) };
}

export function applyRevision(snap: Snapshot, actor: Actor, lines: RevisionLine[], note?: string): Snapshot {
  assertWriteoff(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const movs = lines
    .filter((l) => l.factQty !== l.bookQty)
    .map((l) => {
      const p = snap.products.find((x) => x.id === l.productId);
      const unit =
        snap.stock.find((s) => s.branchId === branchId && s.productId === l.productId)?.avgCost ?? p?.avgCost ?? 0;
      const qty = l.factQty - l.bookQty;
      return {
        id: uid("rev"),
        at: new Date().toISOString(),
        branchId,
        productId: l.productId,
        type: "revision" as const,
        qty,
        cost: Math.abs(qty) * unit,
        reason: "revision" as const,
        note,
        userId: actor.userId,
      };
    });
  let stock = snap.stock;
  for (const m of movs) stock = applyMovement(stock, m);
  return {
    ...snap,
    stock,
    movements: [...movs, ...snap.movements],
    revisions: [
      { id: uid("r"), branchId, date: TODAY, status: "done", lines, userId: actor.userId, note },
      ...snap.revisions,
    ],
  };
}

export function applyTransfer(
  snap: Snapshot,
  actor: Actor,
  input: { fromBranchId: string; toBranchId: string; productId: string; qty: number; note?: string },
): Snapshot {
  assertTransfer(actor);
  assertBranchScope(actor, input.fromBranchId);
  if (input.fromBranchId === input.toBranchId || input.qty <= 0) return snap;
  const unit =
    snap.stock.find((s) => s.branchId === input.fromBranchId && s.productId === input.productId)?.avgCost ??
    snap.products.find((p) => p.id === input.productId)?.avgCost ??
    0;
  const refId = uid("tr");
  const at = new Date().toISOString();
  const out = {
    id: uid("m"),
    at,
    branchId: input.fromBranchId,
    productId: input.productId,
    type: "transfer" as const,
    qty: -Math.abs(input.qty),
    cost: Math.abs(input.qty) * unit,
    note: input.note,
    refId,
    userId: actor.userId,
    counterpartBranchId: input.toBranchId,
  };
  const inn = { ...out, id: uid("m"), branchId: input.toBranchId, qty: Math.abs(input.qty), counterpartBranchId: input.fromBranchId };
  let stock = applyMovement(snap.stock, out);
  stock = applyMovement(stock, inn);
  return { ...snap, stock, movements: [inn, out, ...snap.movements] };
}

export function applyStopList(
  snap: Snapshot,
  actor: Actor,
  input: { recipeId: string; reason: StopListReason; note?: string; clear?: boolean },
): Snapshot {
  assertStopList(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  const now = new Date().toISOString();
  if (input.clear) {
    return {
      ...snap,
      stopList: snap.stopList.map((e) =>
        e.recipeId === input.recipeId && e.branchId === branchId && !e.clearedAt
          ? { ...e, clearedAt: now, clearedBy: actor.userId }
          : e,
      ),
    };
  }
  if (snap.stopList.some((e) => e.recipeId === input.recipeId && e.branchId === branchId && !e.clearedAt)) return snap;
  return {
    ...snap,
    stopList: [
      {
        id: uid("sl"),
        branchId,
        recipeId: input.recipeId,
        reason: input.reason,
        note: input.note,
        createdAt: now,
        createdBy: actor.userId,
      },
      ...snap.stopList,
    ],
  };
}

export function applyExpense(
  snap: Snapshot,
  actor: Actor,
  input: { category: string; amount: number; note?: string; kind: ExpenseKind; date?: string },
): Snapshot {
  assertExpenses(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
  return {
    ...snap,
    expenses: [
      {
        id: uid("exp"),
        branchId,
        date: input.date ?? TODAY,
        category: input.category,
        amount: input.amount,
        note: input.note ?? "",
        kind: input.kind,
      },
      ...snap.expenses,
    ],
  };
}

export function applyProfile(
  snap: Snapshot,
  actor: Actor,
  patch: { name?: string; phone?: string; password?: string; pin?: string },
): Snapshot {
  return {
    ...snap,
    users: snap.users.map((u) => (u.id === actor.userId ? { ...u, ...patch } : u)),
  };
}

export function applySessionBranch(actor: Actor, branchId: string): Actor {
  if (!canSeeAllBranchesSafe(actor) && actor.homeBranchId && branchId !== actor.homeBranchId && branchId !== "all") {
    return actor;
  }
  return { ...actor, sessionBranchId: canSeeAllBranchesSafe(actor) ? branchId : (actor.homeBranchId ?? branchId) };
}

function canSeeAllBranchesSafe(actor: Actor) {
  return actor.role === "owner";
}
