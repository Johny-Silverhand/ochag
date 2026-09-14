import type {
  Banquet,
  BanquetStatus,
  DocumentPhoto,
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
} from "./types.ts";
import { today } from "./types.ts";
import type {
  NotifyEvent,
  OutboxItem,
  PayrollAdjKind,
  Recipe,
  Product,
  Role,
  SupplierChannel,
} from "./types.ts";
import {
  applyMovement,
  deductSaleFromStock,
  needToBuy,
  openShiftFor,
  payrollForShift,
  shiftTotals,
} from "./engine.ts";
import { catalogAvgFromStock, freezeSaleCosts } from "./finance.ts";
import { uid } from "../utils.ts";
import { actorFrom, AuthzError, assertCash, assertExpenses, assertKeeper, assertSale, assertStopList, assertTransfer, assertWriteoff, type Actor, writeBranch } from "../authz/actor.ts";
import {
  canEditBanquet,
  canInviteStaff,
  canManageBranches,
  canOpenShift,
  canClosePeriod,
  canEditNomenclature,
  canSeeAllBranches,
  hasAbsoluteAccess,
  isNetworkAdmin,
  isOpsLead,
  invitableRoles,
} from "./permissions.ts";
import { sanitizePhotos } from "./photos.ts";
import { attachIncidentals } from "./incidentals.ts";
import { appendAudit } from "./audit.ts";
import { appendOpsLog } from "./ops-log.ts";
import { assertPeriodOpen } from "./period.ts";
import { assertReadableBranch, resolveOwnerForWrite } from "./tenancy.ts";

function queueEvent(snap: Snapshot, event: NotifyEvent, title: string, body: string, to?: string): Snapshot {
  if (snap.settings.notifyEvents[event] === false) return snap;
  const channels =
    snap.settings.notifyChannel === "both"
      ? (["telegram", "webpush"] as const)
      : ([snap.settings.notifyChannel] as const);
  const rows: OutboxItem[] = channels.map((channel) => ({
    id: uid("ob"),
    at: new Date().toISOString(),
    channel,
    event,
    title,
    body,
    status: "queued" as const,
    to,
  }));
  return { ...snap, outbox: [...rows, ...snap.outbox].slice(0, 500) };
}

export function applyWriteoff(
  snap: Snapshot,
  actor: Actor,
  input: { productId: string; qty: number; reason: WriteoffReason; note?: string },
): Snapshot {
  assertWriteoff(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, today());
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
  let next = { ...snap, movements: [mov, ...snap.movements], stock: applyMovement(snap.stock, mov) };
  next = appendAudit(next, actor, "writeoff", "stock", `${input.reason} ${input.qty}`, branchId);
  return queueEvent(next, "writeoff", "Списание", `${product?.name ?? input.productId}: ${input.qty} (${input.reason})`);
}

export function applyInvoice(
  snap: Snapshot,
  actor: Actor,
  input: { supplier: string; number: string; date: string; lines: InvoiceLine[]; photos?: DocumentPhoto[] },
): Snapshot {
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, input.date);
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
    photos: sanitizePhotos(input.photos),
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
  return appendAudit(
    {
      ...snap,
      invoices: [inv, ...snap.invoices],
      movements: [...movs, ...snap.movements],
      stock,
      products,
    },
    actor,
    "receipt",
    "invoice",
    `${input.number} ${input.supplier}`,
    branchId,
  );
}

export function applyRequestFromNeed(snap: Snapshot, actor: Actor): Snapshot {
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
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
        date: today(),
        status: "draft",
        lines,
        userId: actor.userId,
      },
      ...snap.requests,
    ],
  };
}

export function applyRequestStatus(
  snap: Snapshot,
  actor: Actor,
  id: string,
  status: RequestStatus,
  supplierId?: string,
): Snapshot {
  const row = snap.requests.find((r) => r.id === id);
  if (!row) return snap;
  assertReadableBranch(snap, actor, row.branchId);
  const supplier =
    snap.suppliers.find((s) => s.id === (supplierId || row.supplierId)) ??
    snap.suppliers.find((s) => s.channel === snap.settings.supplierChannel) ??
    snap.suppliers[0];
  const channel = supplier?.channel ?? snap.settings.supplierChannel;
  let next: Snapshot = {
    ...snap,
    requests: snap.requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            supplierId: supplier?.id ?? r.supplierId,
            sentAt: status === "sent" ? new Date().toISOString() : r.sentAt,
            sentChannel: status === "sent" ? channel : r.sentChannel,
          }
        : r,
    ),
  };
  if (status === "sent") {
    const lines = row.lines
      .map((l) => `${snap.products.find((p) => p.id === l.productId)?.name ?? l.productId} × ${l.qty}`)
      .join(", ");
    next = queueEvent(
      next,
      "purchase_sent",
      `Заявка ${row.number} отправлена`,
      lines,
      channel === "email" ? supplier?.email : supplier?.telegram,
    );
    next = appendAudit(next, actor, "purchase_sent", "request", `${row.number} → ${supplier?.name ?? channel}`, row.branchId);
  }
  return next;
}

export function applyOpenShift(
  snap: Snapshot,
  actor: Actor,
  input: {
    openCash: number;
    staffIds: string[];
    startList: string[];
    topUpDebtId?: string;
    topUpAmount?: number;
    incidentals?: Array<{ title: string; amount: number; paidFromTill?: boolean; note?: string }>;
  },
): Snapshot {
  if (!canOpenShift(actor.role)) throw new AuthzError("Открытие смены недоступно");
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, today());
  if (openShiftFor(snap.shifts, branchId)) return snap;
  if (!input.startList?.length) throw new AuthzError("Подтвердите старт-лист перед открытием смены");
  const shiftId = uid("sh");
  let next: Snapshot = {
    ...snap,
    shifts: [
      {
        id: shiftId,
        branchId,
        date: today(),
        status: "open",
        openedAt: new Date().toISOString(),
        openedBy: actor.userId,
        openCash: input.openCash,
        cashTotal: 0,
        cardTotal: 0,
        qrTotal: 0,
        staffIds: input.staffIds,
        startList: input.startList,
        incidentals: [],
      },
      ...snap.shifts,
    ],
  };
  if (input.topUpDebtId && (input.topUpAmount ?? 0) > 0) {
    next = {
      ...next,
      debts: next.debts.map((d) =>
        d.id === input.topUpDebtId
          ? { ...d, status: "topped" as const, toppedAt: new Date().toISOString(), toppedShiftId: shiftId }
          : d,
      ),
    };
  }
  next = appendAudit(next, actor, "shift_open", "shift", `старт-лист ${input.startList.length} блюд`, branchId);
  next = queueEvent(next, "shift_open", "Смена открыта", `${actor.name} открыл смену. Старт-лист: ${input.startList.length} позиций.`);
  return attachIncidentals(next, actor, shiftId, input.incidentals, "open");
}

export function applyCloseShift(
  snap: Snapshot,
  actor: Actor,
  input: {
    closeCash: number;
    note?: string;
    incidentals?: Array<{ title: string; amount: number; paidFromTill?: boolean; note?: string }>;
  },
): Snapshot {
  assertCash(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  const open = openShiftFor(snap.shifts, branchId);
  if (!open) return snap;
  const withInc = attachIncidentals(snap, actor, open.id, input.incidentals, "close");
  const shift = withInc.shifts.find((s) => s.id === open.id) ?? open;
  const totals = shiftTotals(shift, withInc.sales);
  const discrepancy = Math.round(input.closeCash - totals.expected);
  const pays = payrollForShift(shift, withInc.sales, withInc.users);
  let next: Snapshot = {
    ...withInc,
    shifts: withInc.shifts.map((sh) =>
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
        date: today(),
        shiftId: shift.id,
        hours: p.hours,
        base: p.base,
        bonus: p.bonus,
        total: p.total,
      })),
      ...withInc.payroll,
    ],
  };
  if (discrepancy < 0) {
    next = {
      ...next,
      debts: [
        {
          id: uid("debt"),
          branchId,
          fromShiftId: shift.id,
          date: today(),
          amount: Math.abs(discrepancy),
          status: "open",
          note: "Недостача к утреннему довнесению",
        },
        ...next.debts,
      ],
    };
    next = queueEvent(next, "debt", "Вечерний долг", `Недостача ${Math.abs(discrepancy)} ₽. Довнести на следующей смене.`);
  }
  if (discrepancy !== 0) {
    next = queueEvent(next, "cash_mismatch", "Расхождение кассы", `Ожидалось ${totals.expected} ₽, факт ${input.closeCash} ₽.`);
  }
  return appendAudit(next, actor, "shift_close", "shift", `факт ${input.closeCash}, ожид. ${totals.expected}`, branchId);
}

export function applyManualSale(
  snap: Snapshot,
  actor: Actor,
  items: Omit<SaleItem, "costAtSale">[],
  payment: PaymentType,
): Snapshot {
  assertSale(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, today());
  if (snap.settings.keeperCashLink) {
    throw new AuthzError("Ручной чек выключен: включена кассовая связь с кипером. Отключите её в настройках сети.");
  }
  const shift = openShiftFor(snap.shifts, branchId);
  if (!shift) throw new AuthzError("Откройте смену перед чеком");
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
  incoming: Array<
    Omit<Sale, "shiftId" | "id" | "number" | "branchId" | "items"> & {
      items: Omit<SaleItem, "costAtSale">[];
    }
  >,
): { snap: Snapshot; added: number } {
  assertKeeper(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, today());
  const shift = openShiftFor(snap.shifts, branchId);
  if (!shift) throw new AuthzError("Откройте смену, затем импортируйте отчёт кипера");
  let stock = snap.stock;
  const movs = [];
  const newSales: Sale[] = [];
  let added = 0;
  for (const row of incoming) {
    const externalKey = `${branchId}:${row.at}:${(row as { number?: string }).number ?? row.items.map((i) => i.name).join(",")}`;
    if (snap.sales.some((s) => s.externalKey === externalKey) || newSales.some((s) => s.externalKey === externalKey)) {
      continue;
    }
    const sale: Sale = {
      ...row,
      id: uid("sale"),
      number: `КПР-${String(snap.sales.length + added + 1).padStart(4, "0")}`,
      shiftId: shift.id,
      branchId,
      source: "keeper",
      externalKey,
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
  if (!canEditBanquet(actor.role)) throw new AuthzError("Банкет недоступен");
  assertReadableBranch(snap, actor, banquet.branchId);
  const i = snap.banquets.findIndex((x) => x.id === banquet.id);
  if (i < 0) return { ...snap, banquets: [banquet, ...snap.banquets] };
  const next = snap.banquets.slice();
  next[i] = banquet;
  return { ...snap, banquets: next };
}

export function applyBanquetStatus(snap: Snapshot, actor: Actor, id: string, status: BanquetStatus): Snapshot {
  if (!canEditBanquet(actor.role)) throw new AuthzError("Банкет недоступен");
  const row = snap.banquets.find((b) => b.id === id);
  if (row) assertReadableBranch(snap, actor, row.branchId);
  return { ...snap, banquets: snap.banquets.map((b) => (b.id === id ? { ...b, status } : b)) };
}

export function applyRevision(
  snap: Snapshot,
  actor: Actor,
  lines: RevisionLine[],
  note?: string,
  photos?: DocumentPhoto[],
): Snapshot {
  assertWriteoff(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, today());
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
  let nextRev: Snapshot = {
    ...snap,
    stock,
    movements: [...movs, ...snap.movements],
    revisions: [
      { id: uid("r"), branchId, date: today(), status: "done", lines, userId: actor.userId, note, photos: sanitizePhotos(photos) },
      ...snap.revisions,
    ],
  };
  nextRev = appendAudit(nextRev, actor, "revision", "revision", note ?? "ревизия", branchId);
  return queueEvent(nextRev, "revision", "Ревизия закрыта", note ?? `Расхождений: ${movs.length}`);
}

export function applyTransfer(
  snap: Snapshot,
  actor: Actor,
  input: { fromBranchId: string; toBranchId: string; productId: string; qty: number; note?: string },
): Snapshot {
  assertTransfer(actor);
  assertReadableBranch(snap, actor, input.fromBranchId);
  assertReadableBranch(snap, actor, input.toBranchId);
  assertPeriodOpen(snap, input.fromBranchId, today());
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
  return appendAudit(
    { ...snap, stock, movements: [inn, out, ...snap.movements] },
    actor,
    "transfer",
    "stock",
    `${input.qty} ${input.fromBranchId}→${input.toBranchId}`,
    input.fromBranchId,
  );
}

export function applyStopList(
  snap: Snapshot,
  actor: Actor,
  input: { recipeId: string; reason: StopListReason; note?: string; clear?: boolean },
): Snapshot {
  assertStopList(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
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
  const recipeName = snap.recipes.find((r) => r.id === input.recipeId)?.name ?? input.recipeId;
  return appendAudit(
    queueEvent(
      {
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
      },
      "stop_list",
      "Стоп-лист",
      `${recipeName}: ${input.reason}`,
    ),
    actor,
    "stop_list",
    "recipe",
    `${recipeName}: ${input.reason}`,
    branchId,
  );
}

export function applyExpense(
  snap: Snapshot,
  actor: Actor,
  input: { category: string; amount: number; note?: string; kind: ExpenseKind; date?: string },
): Snapshot {
  assertExpenses(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  assertPeriodOpen(snap, branchId, input.date ?? today());
  return {
    ...snap,
    expenses: [
      {
        id: uid("exp"),
        branchId,
        date: input.date ?? today(),
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

export function applySessionBranch(actor: Actor, branchId: string, snap?: Snapshot): Actor {
  if (snap && branchId !== "all") assertReadableBranch(snap, actor, branchId);
  if (!canSeeAllBranchesSafe(actor) && actor.homeBranchId && branchId !== actor.homeBranchId && branchId !== "all") {
    return actor;
  }
  return { ...actor, sessionBranchId: canSeeAllBranchesSafe(actor) ? branchId : (actor.homeBranchId ?? branchId) };
}

export function applySessionOwner(actor: Actor, ownerId: string | null, snap: Snapshot): Actor {
  if (!hasAbsoluteAccess(actor.role)) {
    throw new AuthzError("Контур владельца переключает только администратор-техник");
  }
  const id = ownerId?.trim() || null;
  if (!id) return { ...actor, actingOwnerId: null, sessionBranchId: "all" };
  const owner = snap.users.find((u) => u.id === id && u.role === "owner");
  if (!owner) throw new AuthzError("Владелец не найден", 404);
  return { ...actor, actingOwnerId: owner.id, sessionBranchId: "all" };
}

function canSeeAllBranchesSafe(actor: Actor) {
  return canSeeAllBranches(actor.role);
}

export { applyCreateLedgerDebt, applyPayLedgerDebt, applyUpdateLedgerDebt } from "./debts.ts";
export { applyUpsertHouseholdItem, applyHouseholdMove } from "./household.ts";
export { applyShiftIncidental } from "./incidentals.ts";
export { applyVoidSale, applyDiscountSale } from "./sales-adjust.ts";
export { applyOnboard } from "./onboard.ts";

export function applyBootstrap(
  snap: Snapshot,
  input: {
    name: string;
    login: string;
    password: string;
    pin: string;
    branchName: string;
    city?: string;
    address?: string;
  },
): Snapshot {
  if (snap.users.length > 0) throw new AuthzError("Сеть уже создана", 400);
  const login = input.login.trim().toLowerCase();
  if (!login || input.password.length < 4 || !/^\d{4}$/.test(input.pin)) {
    throw new AuthzError("Логин, пароль (от 4 знаков) и PIN из 4 цифр обязательны", 400);
  }
  const branchId = uid("br");
  const userId = uid("u");
  const admin = {
    id: userId,
    name: input.name.trim() || "Администратор-техник",
    email: login,
    password: input.password,
    pin: input.pin,
    role: "tech_admin" as const,
    position: "Администратор-техник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "",
    disabled: false,
  };
  const next = {
    ...snap,
    branches: [
      {
        id: branchId,
        name: input.branchName.trim() || "Филиал 1",
        short: (input.branchName.trim() || "Филиал").slice(0, 16),
        city: (input.city ?? "").trim() || "—",
        address: (input.address ?? "").trim() || "—",
        seats: 40,
        phone: "",
      },
    ],
    users: [admin],
  };
  const actor = actorFrom(admin, { userId: admin.id, branchId: "all" });
  return appendOpsLog(
    appendAudit(next, actor, "bootstrap", "network", `техник ${login} / ${next.branches[0]!.short}`),
    { level: "info", event: "bootstrap", detail: `создан ${login}`, userId: admin.id, login },
  );
}

export function applyInviteStaff(
  snap: Snapshot,
  actor: Actor,
  input: {
    name: string;
    login: string;
    password: string;
    pin: string;
    role: Role;
    branchId: string;
    shiftPay: number;
    salesPercent: number;
    monthlyPremium?: number;
    position?: string;
    phone?: string;
  },
): Snapshot {
  if (!canInviteStaff(actor.role)) throw new AuthzError("Приглашение недоступно");
  if (!invitableRoles(actor.role).includes(input.role)) throw new AuthzError("Роль недоступна");
  if (!input.name.trim()) throw new AuthzError("Имя обязательно", 400);
  const login = input.login.trim().toLowerCase();
  if (!login || input.password.length < 4) throw new AuthzError("Логин и пароль (от 4 знаков) обязательны", 400);
  if (snap.users.some((u) => u.email.toLowerCase() === login)) throw new AuthzError("Такой логин уже есть");
  if (!/^\d{4}$/.test(input.pin)) throw new AuthzError("PIN — 4 цифры");
  if (!isNetworkAdmin(input.role) && !input.branchId) throw new AuthzError("Выберите филиал");
  if (!isNetworkAdmin(input.role) && !snap.branches.some((b) => b.id === input.branchId)) {
    throw new AuthzError("Выберите филиал", 400);
  }
  if (!isNetworkAdmin(input.role) && input.branchId) {
    assertReadableBranch(snap, actor, input.branchId);
  }
  const userId = uid("u");
  const ownerId =
    input.role === "tech_admin" ? null : input.role === "owner" ? userId : resolveOwnerForWrite(actor, snap);
  const user = {
    id: userId,
    name: input.name.trim(),
    email: login,
    password: input.password,
    pin: input.pin,
    role: input.role,
    position: input.position ?? input.role,
    branchId: isNetworkAdmin(input.role) ? null : input.branchId,
    ownerId,
    shiftPay: input.shiftPay,
    salesPercent: input.salesPercent,
    monthlyPremium: input.monthlyPremium ?? 0,
    phone: input.phone ?? "",
    disabled: false,
  };
  return appendOpsLog(
    appendAudit({ ...snap, users: [...snap.users, user] }, actor, "invite", "user", `${user.name} / ${user.role}`),
    {
      level: "info",
      event: "account_create",
      detail: `${user.name} · ${user.email} · ${user.role}`,
      userId: actor.userId,
      login: user.email,
    },
  );
}

function enabledTechAdmins(snap: Snapshot) {
  return snap.users.filter((u) => u.role === "tech_admin" && !u.disabled);
}

export function applyUpdateStaff(
  snap: Snapshot,
  actor: Actor,
  input: {
    userId: string;
    name?: string;
    login?: string;
    password?: string;
    pin?: string;
    role?: Role;
    branchId?: string | null;
    shiftPay?: number;
    salesPercent?: number;
    monthlyPremium?: number;
    position?: string;
    phone?: string;
    disabled?: boolean;
  },
): Snapshot {
  if (!canInviteStaff(actor.role)) throw new AuthzError("Управление учёткой недоступно");
  const target = snap.users.find((u) => u.id === input.userId);
  if (!target) throw new AuthzError("Сотрудник не найден", 404);
  if (target.id === actor.userId) throw new AuthzError("Свою учётку меняют в профиле");
  const nextRole = input.role ?? target.role;
  if (!invitableRoles(actor.role).includes(target.role) || !invitableRoles(actor.role).includes(nextRole)) {
    throw new AuthzError("Роль недоступна");
  }
  const login = input.login != null ? input.login.trim().toLowerCase() : target.email;
  if (!login) throw new AuthzError("Логин обязателен", 400);
  if (snap.users.some((u) => u.id !== target.id && u.email.toLowerCase() === login)) {
    throw new AuthzError("Такой логин уже есть");
  }
  if (input.password != null && input.password.length > 0 && input.password.length < 4) {
    throw new AuthzError("Пароль от 4 знаков", 400);
  }
  if (input.pin != null && input.pin.length > 0 && !/^\d{4}$/.test(input.pin)) {
    throw new AuthzError("PIN — 4 цифры");
  }
  const nextDisabled = input.disabled ?? Boolean(target.disabled);
  if (target.role === "tech_admin" && (nextDisabled || nextRole !== "tech_admin") && enabledTechAdmins(snap).length <= 1) {
    throw new AuthzError("Нельзя заблокировать последнего администратора-техника");
  }
  const nextBranch = isNetworkAdmin(nextRole) ? null : (input.branchId !== undefined ? input.branchId : target.branchId);
  if (!isNetworkAdmin(nextRole) && !nextBranch) throw new AuthzError("Выберите филиал");
  if (!isNetworkAdmin(nextRole) && nextBranch && !snap.branches.some((b) => b.id === nextBranch)) {
    throw new AuthzError("Выберите филиал", 400);
  }
  const next = {
    ...target,
    name: input.name?.trim() || target.name,
    email: login,
    password: input.password && input.password.length >= 4 ? input.password : target.password,
    pin: input.pin && /^\d{4}$/.test(input.pin) ? input.pin : target.pin,
    role: nextRole,
    position: input.position ?? target.position,
    branchId: nextBranch,
    shiftPay: input.shiftPay ?? target.shiftPay,
    salesPercent: input.salesPercent ?? target.salesPercent,
    monthlyPremium: input.monthlyPremium ?? target.monthlyPremium ?? 0,
    phone: input.phone ?? target.phone,
    disabled: nextDisabled,
  };
  const blockedNow = nextDisabled && !target.disabled;
  const unblockedNow = !nextDisabled && target.disabled;
  const action = blockedNow ? "block" : unblockedNow ? "unblock" : "staff";
  const opsEvent = blockedNow ? "account_block" : unblockedNow ? "account_unblock" : "account_edit";
  const opsDetail = blockedNow
    ? `${next.email} заблокирована`
    : unblockedNow
      ? `${next.email} разблокирована`
      : `${next.name} · ${next.email} · ${next.role}`;
  return appendOpsLog(
    appendAudit(
      { ...snap, users: snap.users.map((u) => (u.id === target.id ? next : u)) },
      actor,
      action,
      "user",
      `${next.name} / ${next.role}`,
    ),
    {
      level: blockedNow ? "warn" : "info",
      event: opsEvent,
      detail: opsDetail,
      userId: actor.userId,
      login: next.email,
    },
  );
}

function remainingTechAdmins(snap: Snapshot) {
  return snap.users.filter((u) => u.role === "tech_admin");
}

export function applyDeleteStaff(snap: Snapshot, actor: Actor, input: { userId: string }): Snapshot {
  if (!hasAbsoluteAccess(actor.role)) throw new AuthzError("Удаление учётки недоступно");
  const target = snap.users.find((u) => u.id === input.userId);
  if (!target) throw new AuthzError("Сотрудник не найден", 404);
  if (target.id === actor.userId) throw new AuthzError("Нельзя удалить свою учётку");
  if (target.role === "tech_admin" && remainingTechAdmins(snap).length <= 1) {
    throw new AuthzError("Нельзя удалить последнего администратора-техника");
  }
  return appendOpsLog(
    appendAudit(
      { ...snap, users: snap.users.filter((u) => u.id !== target.id) },
      actor,
      "delete",
      "user",
      `${target.name} / ${target.email} / ${target.role}`,
    ),
    {
      level: "warn",
      event: "account_delete",
      detail: `${target.email} удалена`,
      userId: actor.userId,
      login: target.email,
    },
  );
}

export function applyUpsertRecipe(snap: Snapshot, actor: Actor, recipe: Recipe): Snapshot {
  if (!canEditNomenclature(actor.role)) throw new AuthzError("Техкарты недоступны");
  const i = snap.recipes.findIndex((r) => r.id === recipe.id);
  const recipes = i < 0 ? [recipe, ...snap.recipes] : snap.recipes.map((r) => (r.id === recipe.id ? recipe : r));
  return appendAudit({ ...snap, recipes }, actor, "recipe", "recipe", recipe.name);
}

export function applyDeleteRecipe(snap: Snapshot, actor: Actor, id: string): Snapshot {
  if (!canEditNomenclature(actor.role)) throw new AuthzError("Техкарты недоступны");
  return { ...snap, recipes: snap.recipes.filter((r) => r.id !== id) };
}

export function applyImportProducts(
  snap: Snapshot,
  actor: Actor,
  rows: Array<{ name: string; category: string; unit: Product["unit"]; minQty: number; avgCost: number }>,
): Snapshot {
  if (!canEditNomenclature(actor.role)) throw new AuthzError("Номенклатура недоступна");
  const products = [...snap.products];
  for (const row of rows) {
    const existing = products.find((p) => p.name.toLowerCase() === row.name.toLowerCase());
    if (existing) {
      Object.assign(existing, row);
    } else {
      products.push({ id: uid("prd"), ...row });
    }
  }
  return appendAudit({ ...snap, products }, actor, "import", "product", `${rows.length} позиций`);
}

export function applyClosePeriod(
  snap: Snapshot,
  actor: Actor,
  input: { from: string; to: string; revisionId: string },
): Snapshot {
  if (!canClosePeriod(actor.role)) throw new AuthzError("Закрытие периода недоступно");
  const branchId = writeBranch(actor);
  const rev = snap.revisions.find((r) => r.id === input.revisionId);
  if (!rev || rev.status !== "done") {
    throw new AuthzError("Закрытие периода — только после закрытой ревизии филиала.");
  }
  if (rev.branchId !== branchId) {
    throw new AuthzError("Ревизия принадлежит другому филиалу.");
  }
  if (rev.date < input.from || rev.date > input.to) {
    throw new AuthzError(`Ревизия ${rev.date} вне периода ${input.from}–${input.to}.`);
  }
  if (snap.closedPeriods.some((p) => p.branchId === branchId && p.from === input.from && p.to === input.to)) {
    throw new AuthzError("Этот период уже закрыт.");
  }
  return appendAudit(
    {
      ...snap,
      closedPeriods: [
        {
          id: uid("cp"),
          branchId,
          from: input.from,
          to: input.to,
          closedAt: new Date().toISOString(),
          closedBy: actor.userId,
          revisionId: input.revisionId,
        },
        ...snap.closedPeriods,
      ],
    },
    actor,
    "period_close",
    "period",
    `${input.from}–${input.to}`,
    branchId,
  );
}

export function applyTopUpDebt(snap: Snapshot, actor: Actor, input: { debtId: string }): Snapshot {
  const branchId = writeBranch(actor);
  const debt = snap.debts.find((d) => d.id === input.debtId);
  if (!debt || debt.status !== "open") throw new AuthzError("Долг не найден или уже закрыт");
  if (debt.branchId !== branchId) throw new AuthzError("Долг другого филиала");
  const open = openShiftFor(snap.shifts, branchId);
  let next: Snapshot = {
    ...snap,
    debts: snap.debts.map((d) =>
      d.id === debt.id
        ? {
            ...d,
            status: "topped" as const,
            toppedAt: new Date().toISOString(),
            toppedShiftId: open?.id,
          }
        : d,
    ),
  };
  if (open) {
    next = {
      ...next,
      shifts: next.shifts.map((s) => (s.id === open.id ? { ...s, openCash: s.openCash + debt.amount } : s)),
    };
  }
  return appendAudit(next, actor, "debt_topup", "debt", `${debt.amount} ₽`, branchId);
}

export function applyPayrollAdjustment(
  snap: Snapshot,
  actor: Actor,
  input: { userId: string; kind: PayrollAdjKind; amount: number; note: string; date?: string },
): Snapshot {
  if (!canInviteStaff(actor.role)) throw new AuthzError("Корректировка ФОТ недоступна");
  const branchId = writeBranch(actor);
  assertPeriodOpen(snap, branchId, input.date ?? today());
  const row = {
    id: uid("adj"),
    userId: input.userId,
    branchId,
    date: input.date ?? today(),
    kind: input.kind,
    amount: input.amount,
    note: input.note,
    createdBy: actor.userId,
  };
  return appendAudit({ ...snap, payrollAdjustments: [row, ...snap.payrollAdjustments] }, actor, "payroll_adj", "payroll", `${input.kind} ${input.amount}`, branchId);
}

export function applyAccrueMonthlyPremiums(
  snap: Snapshot,
  actor: Actor,
  input: { month?: string } = {},
): Snapshot {
  if (!canInviteStaff(actor.role)) throw new AuthzError("Начисление премий недоступно");
  const month = (input.month ?? today()).slice(0, 7);
  const branchId = writeBranch(actor);
  let next = snap;
  for (const u of snap.users) {
    const premium = u.monthlyPremium ?? 0;
    if (premium <= 0) continue;
    if (isNetworkAdmin(u.role)) continue;
    if (u.branchId && u.branchId !== branchId) continue;
    const already = next.payrollAdjustments.some(
      (a) => a.userId === u.id && a.kind === "premium" && a.date.startsWith(month) && a.note.includes("месячная"),
    );
    if (already) continue;
    next = applyPayrollAdjustment(next, actor, {
      userId: u.id,
      kind: "premium",
      amount: premium,
      note: `месячная премия ${month}`,
      date: `${month}-01`,
    });
  }
  return next;
}

export function applyRevenuePlan(snap: Snapshot, actor: Actor, input: { branchId: string; month: string; target: number }): Snapshot {
  if (!isOpsLead(actor.role)) throw new AuthzError("План недоступен");
  const existing = snap.revenuePlans.find((p) => p.branchId === input.branchId && p.month === input.month);
  const row = existing
    ? { ...existing, target: input.target }
    : { id: uid("plan"), ...input };
  return {
    ...snap,
    revenuePlans: existing
      ? snap.revenuePlans.map((p) => (p.id === existing.id ? row : p))
      : [row, ...snap.revenuePlans],
  };
}

export function applySettings(snap: Snapshot, actor: Actor, patch: Partial<Snapshot["settings"]>): Snapshot {
  if (!isOpsLead(actor.role)) throw new AuthzError("Настройки сети недоступны");
  const nextPatch = { ...patch };
  if (
    nextPatch.ollamaEnabled !== undefined ||
    nextPatch.ollamaBaseUrl !== undefined ||
    nextPatch.ollamaModel !== undefined
  ) {
    if (!isNetworkAdmin(actor.role)) throw new AuthzError("Ollama настраивает владелец");
  }
  if (typeof nextPatch.ollamaBaseUrl === "string") {
    nextPatch.ollamaBaseUrl = nextPatch.ollamaBaseUrl.trim().replace(/\/$/, "");
  }
  if (typeof nextPatch.ollamaModel === "string") {
    nextPatch.ollamaModel = nextPatch.ollamaModel.trim();
  }
  const keys = Object.keys(nextPatch).join(", ") || "без полей";
  const next = {
    ...snap,
    settings: { ...snap.settings, ...nextPatch, notifyEvents: { ...snap.settings.notifyEvents, ...(nextPatch.notifyEvents ?? {}) } },
  };
  return appendOpsLog(appendAudit(next, actor, "settings", "network", keys), {
    level: "info",
    event: "settings",
    detail: keys,
    userId: actor.userId,
  });
}

export function applyPushSub(
  snap: Snapshot,
  actor: Actor,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
): Snapshot {
  if (snap.pushSubs.some((s) => s.endpoint === sub.endpoint)) return snap;
  return {
    ...snap,
    pushSubs: [
      { id: uid("ps"), userId: actor.userId, endpoint: sub.endpoint, keys: sub.keys, createdAt: new Date().toISOString() },
      ...snap.pushSubs,
    ],
  };
}

function normalizeBranchInput(input: {
  name: string;
  city?: string;
  address?: string;
  short?: string;
  seats?: number;
  phone?: string;
  halls?: string[];
}) {
  const name = input.name.trim();
  if (!name) throw new AuthzError("Название филиала обязательно", 400);
  const seats = Math.max(0, Math.round(Number(input.seats) || 0)) || 40;
  const halls = (input.halls ?? []).map((h) => h.trim()).filter(Boolean);
  return {
    name,
    short: (input.short || name).trim().slice(0, 16) || name.slice(0, 16),
    city: (input.city ?? "").trim() || "—",
    address: (input.address ?? "").trim() || "—",
    seats,
    phone: (input.phone ?? "").trim(),
    halls: halls.length ? halls : ["Основной зал"],
  };
}

export function applyAddBranch(
  snap: Snapshot,
  actor: Actor,
  input: {
    name: string;
    city: string;
    address: string;
    short?: string;
    seats?: number;
    phone?: string;
    halls?: string[];
  },
): Snapshot {
  if (!canManageBranches(actor.role)) throw new AuthzError("Филиал добавляет владелец или администратор-техник");
  const fields = normalizeBranchInput(input);
  const ownerId = resolveOwnerForWrite(actor, snap);
  const row = { id: uid("br"), ...fields, ownerId };
  return appendAudit({ ...snap, branches: [...snap.branches, row] }, actor, "branch", "network", row.name);
}

export function applyUpdateBranch(
  snap: Snapshot,
  actor: Actor,
  input: {
    branchId: string;
    name?: string;
    city?: string;
    address?: string;
    short?: string;
    seats?: number;
    phone?: string;
    halls?: string[];
  },
): Snapshot {
  if (!canManageBranches(actor.role)) throw new AuthzError("Филиал меняет владелец или администратор-техник");
  const current = snap.branches.find((b) => b.id === input.branchId);
  if (!current) throw new AuthzError("Филиал не найден", 404);
  const fields = normalizeBranchInput({
    name: input.name ?? current.name,
    city: input.city ?? current.city,
    address: input.address ?? current.address,
    short: input.short ?? current.short,
    seats: input.seats ?? current.seats,
    phone: input.phone ?? current.phone,
    halls: input.halls ?? current.halls,
  });
  return appendAudit(
    {
      ...snap,
      branches: snap.branches.map((b) => (b.id === current.id ? { ...b, ...fields } : b)),
    },
    actor,
    "branch",
    "network",
    fields.name,
  );
}

export function applyDeleteBranch(snap: Snapshot, actor: Actor, input: { branchId: string }): Snapshot {
  if (!canManageBranches(actor.role)) throw new AuthzError("Филиал удаляет владелец или администратор-техник");
  const current = snap.branches.find((b) => b.id === input.branchId);
  if (!current) throw new AuthzError("Филиал не найден", 404);
  if (snap.branches.length <= 1) throw new AuthzError("Нельзя удалить последний филиал");
  if (snap.users.some((u) => u.branchId === current.id)) {
    throw new AuthzError("Сначала переведите сотрудников с этого филиала");
  }
  return appendAudit(
    { ...snap, branches: snap.branches.filter((b) => b.id !== current.id) },
    actor,
    "branch",
    "network",
    `удалён ${current.name}`,
  );
}

export function applyAddSupplier(
  snap: Snapshot,
  actor: Actor,
  input: { name: string; email: string; telegram: string; channel: SupplierChannel },
): Snapshot {
  if (!isOpsLead(actor.role)) throw new AuthzError("Поставщики недоступны");
  return { ...snap, suppliers: [{ id: uid("sup"), ...input }, ...snap.suppliers] };
}

export function markOutbox(snap: Snapshot, id: string, status: OutboxItem["status"], error?: string): Snapshot {
  const item = snap.outbox.find((o) => o.id === id);
  const next = {
    ...snap,
    outbox: snap.outbox.map((o) => (o.id === id ? { ...o, status, error } : o)),
  };
  if (status !== "failed") return next;
  return appendOpsLog(next, {
    level: "error",
    event: "outbox",
    detail: `${item?.channel ?? "канал"}: ${error || "ошибка отправки"}`,
  });
}
