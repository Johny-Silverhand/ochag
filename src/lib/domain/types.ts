/** Live civil day in the server/browser locale (YYYY-MM-DD). */
export function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @deprecated prefer today() — kept so older imports compile; value is the day this module first loaded. */
export const TODAY = today();

export type Role = "tech_admin" | "owner" | "manager" | "cook" | "waiter";
export type Unit = "kg" | "l" | "шт" | "порц";
export type PaymentType = "cash" | "card" | "qr" | "transfer";
export type MovementType = "receipt" | "sale" | "writeoff" | "revision" | "prep" | "transfer";
export type ShiftStatus = "open" | "closed";
export type BanquetStatus = "inquiry" | "confirmed" | "deposit_paid" | "done" | "cancelled";
export type RequestStatus = "draft" | "sent" | "received";
export type NotifyChannel = "telegram" | "webpush" | "email";
export type NotifyEvent =
  | "shift_open"
  | "stop_list"
  | "purchase_sent"
  | "writeoff"
  | "revision"
  | "cash_mismatch"
  | "debt";
export type PayrollAdjKind = "fine" | "advance" | "extra" | "premium";
export type DebtStatus = "open" | "topped";
export type LedgerDebtKind = "client" | "staff_wage" | "supplier";
export type LedgerDebtStatus = "open" | "partial" | "paid";
export type HouseholdMoveType = "receive" | "consume" | "revision";
export type ShiftIncidentalPhase = "open" | "close" | "during";
export type OutboxStatus = "queued" | "sent" | "failed";
export type SupplierChannel = "telegram" | "email";
export type WriteoffReason = "spoilage" | "staff_meal" | "error" | "theft" | "revision";
export type ExpenseKind = "fixed" | "variable";
export type StopListReason = "no_stock" | "quality" | "manual" | "shift_start";

export type Period = "today" | "7d" | "30d";

export interface Branch {
  id: string;
  name: string;
  short: string;
  city: string;
  address: string;
  seats: number;
  phone: string;
  /** Hall names for banquet seating. Empty → «Основной зал». */
  halls?: string[];
  /** Owner who owns this branch. Missing on old snapshots until normalize. */
  ownerId?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  password: string;
  /** 4-digit PIN for hall/kitchen terminals. Compared only on the server. */
  pin: string;
  role: Role;
  position: string;
  branchId: string | null;
  shiftPay: number;
  salesPercent: number;
  /** Fixed monthly premium; accrued on demand, not per shift. */
  monthlyPremium?: number;
  phone: string;
  /** Blocked flag: password and PIN login fail with «Аккаунт заблокирован». */
  disabled?: boolean;
  /** ISO timestamp of the last successful password or PIN login. */
  lastLoginAt?: string;
  /** Owner network this staff belongs to. Owners: self. Technicians: unset. */
  ownerId?: string | null;
  /** Temporary lock after repeated failed logins. */
  authLockedUntil?: string;
}

export interface Session {
  userId: string;
  branchId: string;
  actingOwnerId?: string | null;
  sessionId?: string;
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceLabel: string;
  ip: string;
  createdAt: string;
  lastActivityAt: string;
  revokedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  minQty: number;
  avgCost: number;
}

export interface RecipeItem {
  productId: string;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  price: number;
  yieldPortions: number;
  items: RecipeItem[];
}

export interface StockLevel {
  branchId: string;
  productId: string;
  qty: number;
  /** Weighted-average purchase price at this warehouse (TZ §5). */
  avgCost: number;
}

export interface StockMovement {
  id: string;
  at: string;
  branchId: string;
  productId: string;
  type: MovementType;
  qty: number;
  cost: number;
  reason?: WriteoffReason;
  note?: string;
  refId?: string;
  userId: string;
  /** Opposite warehouse on an inter-branch transfer. */
  counterpartBranchId?: string;
}

export interface InvoiceLine {
  productId: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  number: string;
  branchId: string;
  supplier: string;
  date: string;
  lines: InvoiceLine[];
  total: number;
  userId: string;
  photos?: DocumentPhoto[];
}

export interface SaleItem {
  recipeId: string;
  name: string;
  qty: number;
  price: number;
  sum: number;
  /** Dish cost frozen at the moment of sale (TZ §5 cost_at_sale). */
  costAtSale: number;
}

export interface Sale {
  id: string;
  number: string;
  branchId: string;
  shiftId: string;
  at: string;
  items: SaleItem[];
  payments: { type: PaymentType; amount: number }[];
  total: number;
  waiterId: string;
  source: "keeper" | "manual";
  /** Keeper cheque number + time + branch — skipped on restore. */
  externalKey?: string;
  voided?: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  discount?: number;
  discountReason?: string;
}

export interface Shift {
  id: string;
  branchId: string;
  date: string;
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  openCash: number;
  closeCash?: number;
  expectedCash?: number;
  discrepancy?: number;
  cashTotal: number;
  cardTotal: number;
  qrTotal: number;
  staffIds: string[];
  /** Recipe ids confirmed as the start-list at open. */
  startList: string[];
  note?: string;
  /** Free-form side costs (DJ, singer, décor) counted in shift money. */
  incidentals?: ShiftIncidental[];
}

export interface PurchaseLine {
  productId: string;
  qty: number;
}

export interface PurchaseRequest {
  id: string;
  number: string;
  branchId: string;
  date: string;
  status: RequestStatus;
  lines: PurchaseLine[];
  note?: string;
  userId: string;
  supplierId?: string;
  sentAt?: string;
  sentChannel?: SupplierChannel;
}

export interface BanquetLine {
  name: string;
  qty: number;
  unit: string;
  readyBy?: string;
  notes?: string;
}

export interface Banquet {
  id: string;
  number: string;
  branchId: string;
  title: string;
  clientName: string;
  clientPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  hall: string;
  total: number;
  deposit: number;
  depositPaid: boolean;
  status: BanquetStatus;
  notes: string;
  waiterNotes: string;
  grillNotes?: string;
  kitchenNotes?: string;
  grillItems: BanquetLine[];
  kitchenItems: BanquetLine[];
  serviceItems: BanquetLine[];
  timeline: { time: string; action: string }[];
}

export interface Expense {
  id: string;
  branchId: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  kind: ExpenseKind;
}

export interface StopListEntry {
  id: string;
  branchId: string;
  recipeId: string;
  reason: StopListReason;
  note?: string;
  createdAt: string;
  createdBy: string;
  clearedAt?: string;
  clearedBy?: string;
}

export interface PayrollAccrual {
  id: string;
  userId: string;
  branchId: string;
  date: string;
  shiftId: string;
  hours: number;
  base: number;
  bonus: number;
  total: number;
}

export interface RevisionLine {
  productId: string;
  bookQty: number;
  factQty: number;
}

export interface Revision {
  id: string;
  branchId: string;
  date: string;
  status: "draft" | "done";
  lines: RevisionLine[];
  userId: string;
  note?: string;
  photos?: DocumentPhoto[];
}

export interface Insight {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  branchId?: string;
  module: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  telegram: string;
  channel: SupplierChannel;
}

export interface ClosedPeriod {
  id: string;
  branchId: string;
  from: string;
  to: string;
  closedAt: string;
  closedBy: string;
  revisionId: string;
}

export interface DocumentPhoto {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
  at: string;
}

export interface ShiftIncidental {
  id: string;
  phase: ShiftIncidentalPhase;
  title: string;
  amount: number;
  paidFromTill: boolean;
  note: string;
  at: string;
  userId: string;
}

export interface LedgerPayment {
  id: string;
  at: string;
  amount: number;
  note: string;
  userId: string;
}

export interface LedgerDebt {
  id: string;
  kind: LedgerDebtKind;
  status: LedgerDebtStatus;
  partyName: string;
  partyId?: string;
  branchId: string;
  amount: number;
  paid: number;
  note: string;
  createdAt: string;
  createdBy: string;
  payments: LedgerPayment[];
}

export interface HouseholdItem {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  minQty: number;
}

export interface HouseholdStock {
  branchId: string;
  itemId: string;
  qty: number;
  avgCost: number;
}

export interface HouseholdMovement {
  id: string;
  at: string;
  branchId: string;
  itemId: string;
  type: HouseholdMoveType;
  qty: number;
  cost: number;
  note?: string;
  userId: string;
  photos?: DocumentPhoto[];
}

export interface CashDebt {
  id: string;
  branchId: string;
  fromShiftId: string;
  date: string;
  amount: number;
  status: DebtStatus;
  toppedAt?: string;
  toppedShiftId?: string;
  note?: string;
}

export interface PayrollAdjustment {
  id: string;
  userId: string;
  branchId: string;
  date: string;
  kind: PayrollAdjKind;
  amount: number;
  note: string;
  createdBy: string;
}

export interface RevenuePlan {
  id: string;
  branchId: string;
  month: string;
  target: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  action: string;
  entity: string;
  branchId?: string;
  detail: string;
}

export type OpsLogLevel = "info" | "warn" | "error";
export type OpsLogEvent =
  | "login"
  | "login_fail"
  | "account_create"
  | "account_edit"
  | "account_block"
  | "account_unblock"
  | "account_delete"
  | "settings"
  | "bootstrap"
  | "sample"
  | "api"
  | "outbox";

export interface OpsLogEntry {
  id: string;
  at: string;
  level: OpsLogLevel;
  event: OpsLogEvent;
  detail: string;
  userId?: string;
  login?: string;
  path?: string;
}

export interface OutboxItem {
  id: string;
  at: string;
  channel: NotifyChannel;
  event: NotifyEvent | "manual";
  title: string;
  body: string;
  status: OutboxStatus;
  error?: string;
  to?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

export interface NetworkSettings {
  keeperCashLink: boolean;
  notifyChannel: "telegram" | "webpush" | "both";
  supplierChannel: SupplierChannel;
  notifyEvents: Record<NotifyEvent, boolean>;
  sampleLoaded: boolean;
  tariff: "trial" | "basic" | "mid" | "pro" | null;
  paymentSimulatedAt: string | null;
  /** When true, AI calls the configured Ollama first. Empty URL = env / unset. */
  ollamaEnabled?: boolean;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export const DEFAULT_NOTIFY_EVENTS: Record<NotifyEvent, boolean> = {
  shift_open: true,
  stop_list: true,
  purchase_sent: true,
  writeoff: false,
  revision: true,
  cash_mismatch: true,
  debt: true,
};

export function defaultSettings(): NetworkSettings {
  return {
    keeperCashLink: true,
    notifyChannel: "both",
    supplierChannel: "telegram",
    notifyEvents: { ...DEFAULT_NOTIFY_EVENTS },
    sampleLoaded: false,
    tariff: null,
    paymentSimulatedAt: null,
    ollamaEnabled: false,
    ollamaBaseUrl: "",
    ollamaModel: "llama3.2",
  };
}

export interface Snapshot {
  branches: Branch[];
  users: StaffUser[];
  products: Product[];
  recipes: Recipe[];
  stock: StockLevel[];
  movements: StockMovement[];
  invoices: Invoice[];
  sales: Sale[];
  shifts: Shift[];
  requests: PurchaseRequest[];
  banquets: Banquet[];
  expenses: Expense[];
  payroll: PayrollAccrual[];
  revisions: Revision[];
  stopList: StopListEntry[];
  suppliers: Supplier[];
  closedPeriods: ClosedPeriod[];
  debts: CashDebt[];
  ledgerDebts: LedgerDebt[];
  householdItems: HouseholdItem[];
  householdStock: HouseholdStock[];
  householdMovements: HouseholdMovement[];
  payrollAdjustments: PayrollAdjustment[];
  revenuePlans: RevenuePlan[];
  audit: AuditEntry[];
  opsLogs: OpsLogEntry[];
  outbox: OutboxItem[];
  pushSubs: PushSubscriptionRecord[];
  deviceSessions?: DeviceSession[];
  settings: NetworkSettings;
}

export const ROLE_LABEL: Record<Role, string> = {
  tech_admin: "Администратор-техник",
  owner: "Владелец",
  manager: "Управляющий",
  cook: "Повар",
  waiter: "Официант",
};

export const UNIT_LABEL: Record<Unit, string> = {
  kg: "кг",
  l: "л",
  шт: "шт",
  порц: "порц.",
};

export const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: "Наличные",
  card: "Карта",
  qr: "QR",
  transfer: "Перевод",
};

export const DEFAULT_HALL = "Основной зал";

export function branchHalls(branch: Pick<Branch, "halls" | "name"> | undefined | null): string[] {
  const named = branch?.halls?.map((h) => h.trim()).filter(Boolean) ?? [];
  return named.length ? named : [DEFAULT_HALL];
}

export function parseHalls(raw: string): string[] {
  const items = raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : [DEFAULT_HALL];
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receipt: "Приход",
  sale: "Продажа",
  writeoff: "Списание",
  revision: "Ревизия",
  prep: "Производство",
  transfer: "Перемещение",
};

export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = {
  fixed: "Постоянные",
  variable: "Переменные",
};

export const STOP_REASON_LABEL: Record<StopListReason, string> = {
  no_stock: "Нет продукта",
  quality: "Качество",
  manual: "Стоп-лист",
  shift_start: "Старт-лист",
};

export const WRITEOFF_LABEL: Record<WriteoffReason, string> = {
  spoilage: "Порча",
  staff_meal: "Питание персонала",
  error: "Ошибка",
  theft: "Недостача",
  revision: "Ревизия",
};

export const BANQUET_LABEL: Record<BanquetStatus, string> = {
  inquiry: "Заявка",
  confirmed: "Подтверждён",
  deposit_paid: "Залог внесён",
  done: "Проведён",
  cancelled: "Отмена",
};

export const REQUEST_LABEL: Record<RequestStatus, string> = {
  draft: "Черновик",
  sent: "Отправлена",
  received: "Оприходована",
};

export const PAYROLL_ADJ_LABEL: Record<PayrollAdjKind, string> = {
  fine: "Штраф",
  advance: "Аванс",
  extra: "Доплата",
  premium: "Премия",
};

export const LEDGER_DEBT_KIND_LABEL: Record<LedgerDebtKind, string> = {
  client: "Клиенты",
  staff_wage: "Зарплата сотрудникам",
  supplier: "Поставщики",
};

export const LEDGER_DEBT_STATUS_LABEL: Record<LedgerDebtStatus, string> = {
  open: "Открыт",
  partial: "Частично",
  paid: "Закрыт",
};

export const HOUSEHOLD_MOVE_LABEL: Record<HouseholdMoveType, string> = {
  receive: "Приход",
  consume: "Расход",
  revision: "Ревизия",
};

export const NOTIFY_EVENT_LABEL: Record<NotifyEvent, string> = {
  shift_open: "Открытие смены",
  stop_list: "Стоп-лист",
  purchase_sent: "Заявка поставщику",
  writeoff: "Списание",
  revision: "Ревизия",
  cash_mismatch: "Расхождение кассы",
  debt: "Вечерний долг",
};
