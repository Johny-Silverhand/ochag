export const TODAY = "2026-09-02";

export type Role = "owner" | "manager" | "cook" | "waiter";
export type Unit = "kg" | "l" | "шт" | "порц";
export type PaymentType = "cash" | "card" | "qr";
export type MovementType = "receipt" | "sale" | "writeoff" | "revision" | "prep";
export type ShiftStatus = "open" | "closed";
export type BanquetStatus = "inquiry" | "confirmed" | "deposit_paid" | "done" | "cancelled";
export type RequestStatus = "draft" | "sent" | "received";
export type WriteoffReason = "spoilage" | "staff_meal" | "error" | "theft" | "revision";

export type Period = "today" | "7d" | "30d";

export interface Branch {
  id: string;
  name: string;
  short: string;
  city: string;
  address: string;
  seats: number;
  phone: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  position: string;
  branchId: string | null;
  shiftPay: number;
  salesPercent: number;
  phone: string;
}

export interface Session {
  userId: string;
  branchId: string;
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
}

export interface SaleItem {
  recipeId: string;
  name: string;
  qty: number;
  price: number;
  sum: number;
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
  note?: string;
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
}

export interface Insight {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  branchId?: string;
  module: string;
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
}

export const ROLE_LABEL: Record<Role, string> = {
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
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receipt: "Приход",
  sale: "Продажа",
  writeoff: "Списание",
  revision: "Ревизия",
  prep: "Производство",
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
