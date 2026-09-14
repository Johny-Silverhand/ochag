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
import { today } from "./types";
import type {
  NotifyEvent,
  OutboxItem,
  PayrollAdjKind,
  Recipe,
  Product,
  Role,
  SupplierChannel,
} from "./types";
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
import {
  AuthzError,
  assertBranchScope,
  assertCash,
  assertExpenses,
  assertKeeper,
  assertSale,
  assertStopList,
  assertTransfer,
  assertWriteoff,
  type Actor,
  writeBranch,
} from "../authz/actor";
import {
  canInviteStaff,
  canOpenShift,
  canClosePeriod,
  canEditNomenclature,
  canSeeAllBranches,
  isNetworkAdmin,
  isOpsLead,
  invitableRoles,
} from "./permissions";
import { assertPeriodOpen } from "./period";
import { appendAudit } from "./audit";

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
  assertBranchScope(actor, branchId);
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
  input: { supplier: string; number: string; date: string; lines: InvoiceLine[] },
): Snapshot {
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
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
  assertBranchScope(actor, row.branchId);
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
  input: { openCash: number; staffIds: string[]; startList: string[]; topUpDebtId?: string; topUpAmount?: number },
): Snapshot {
  if (!canOpenShift(actor.role)) throw new AuthzError("Открытие смены недоступно");
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
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
  return queueEvent(next, "shift_open", "Смена открыта", `${actor.name} открыл смену. Старт-лист: ${input.startList.length} позиций.`);
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
  let next: Snapshot = {
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
        date: today(),
        shiftId: shift.id,
        hours: p.hours,
        base: p.base,
        bonus: p.bonus,
        total: p.total,
      })),
      ...snap.payroll,
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
  assertBranchScope(actor, branchId);
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
  assertBranchScope(actor, branchId);
  assertPeriodOpen(snap, branchId, today());
  const shift = openShiftFor(snap.shifts, branchId);
  if (!shift) return { snap, added: 0 };
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
      { id: uid("r"), branchId, date: today(), status: "done", lines, userId: actor.userId, note },
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
  assertBranchScope(actor, input.fromBranchId);
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
  const recipeName = snap.recipes.find((r) => r.id === input.recipeId)?.name ?? input.recipeId;
  return queueEvent(
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
  );
}

export function applyExpense(
  snap: Snapshot,
  actor: Actor,
  input: { category: string; amount: number; note?: string; kind: ExpenseKind; date?: string },
): Snapshot {
  assertExpenses(actor);
  const branchId = writeBranch(actor);
  assertBranchScope(actor, branchId);
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

export function applySessionBranch(actor: Actor, branchId: string): Actor {
  if (!canSeeAllBranchesSafe(actor) && actor.homeBranchId && branchId !== actor.homeBranchId && branchId !== "all") {
    return actor;
  }
  return { ...actor, sessionBranchId: canSeeAllBranchesSafe(actor) ? branchId : (actor.homeBranchId ?? branchId) };
}

function canSeeAllBranchesSafe(actor: Actor) {
  return canSeeAllBranches(actor.role);
}

export function applyOnboard(
  snap: Snapshot,
  input: {
    ownerName: string;
    login: string;
    password: string;
    pin: string;
    branchName: string;
    city: string;
    address: string;
  },
): Snapshot {
  if (snap.users.length > 0) throw new AuthzError("Сеть уже создана", 400);
  const login = input.login.trim().toLowerCase();
  if (!login || input.password.length < 4 || !/^\d{4}$/.test(input.pin)) {
    throw new AuthzError("Логин, пароль (от 4 знаков) и PIN из 4 цифр обязательны", 400);
  }
  const branchId = uid("br");
  const userId = uid("u");
  return {
    ...snap,
    branches: [
      {
        id: branchId,
        name: input.branchName.trim() || "Филиал 1",
        short: (input.branchName.trim() || "Филиал").slice(0, 16),
        city: input.city.trim() || "—",
        address: input.address.trim() || "—",
        seats: 40,
        phone: "",
      },
    ],
    users: [
      {
        id: userId,
        name: input.ownerName.trim() || "Владелец",
        email: login,
        password: input.password,
        pin: input.pin,
        role: "owner",
        position: "Собственник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ],
  };
}

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
  return {
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
    users: [
      {
        id: userId,
        name: input.name.trim() || "Администратор-техник",
        email: login,
        password: input.password,
        pin: input.pin,
        role: "tech_admin",
        position: "Администратор-техник",
        branchId: null,
        shiftPay: 0,
        salesPercent: 0,
        phone: "",
      },
    ],
  };
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
    position?: string;
    phone?: string;
  },
): Snapshot {
  if (!canInviteStaff(actor.role)) throw new AuthzError("Приглашение недоступно");
  if (!invitableRoles(actor.role).includes(input.role)) throw new AuthzError("Роль недоступна");
  const login = input.login.trim().toLowerCase();
  if (snap.users.some((u) => u.email.toLowerCase() === login)) throw new AuthzError("Такой логин уже есть");
  if (!/^\d{4}$/.test(input.pin)) throw new AuthzError("PIN — 4 цифры");
  const user = {
    id: uid("u"),
    name: input.name.trim(),
    email: login,
    password: input.password,
    pin: input.pin,
    role: input.role,
    position: input.position ?? input.role,
    branchId: isNetworkAdmin(input.role) ? null : input.branchId,
    shiftPay: input.shiftPay,
    salesPercent: input.salesPercent,
    phone: input.phone ?? "",
  };
  return appendAudit({ ...snap, users: [...snap.users, user] }, actor, "invite", "user", `${user.name} / ${user.role}`);
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
  return { ...snap, settings: { ...snap.settings, ...patch, notifyEvents: { ...snap.settings.notifyEvents, ...(patch.notifyEvents ?? {}) } } };
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

export function applyAddBranch(
  snap: Snapshot,
  actor: Actor,
  input: { name: string; city: string; address: string; short?: string },
): Snapshot {
  if (!isNetworkAdmin(actor.role)) throw new AuthzError("Филиал добавляет владелец");
  const row = {
    id: uid("br"),
    name: input.name,
    short: input.short || input.name.slice(0, 16),
    city: input.city,
    address: input.address,
    seats: 40,
    phone: "",
  };
  return { ...snap, branches: [...snap.branches, row] };
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
  return {
    ...snap,
    outbox: snap.outbox.map((o) => (o.id === id ? { ...o, status, error } : o)),
  };
}
