import type { AuditEntry, Role } from "./types.ts";
import { hasAbsoluteAccess } from "./permissions.ts";

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  writeoff: "Списание",
  receipt: "Приёмка",
  purchase_sent: "Заявка отправлена",
  shift_open: "Открытие смены",
  shift_close: "Закрытие смены",
  revision: "Ревизия",
  transfer: "Перемещение",
  invite: "Создана учётка",
  staff: "Изменена учётка",
  disable: "Учётка заблокирована",
  block: "Учётка заблокирована",
  unblock: "Учётка разблокирована",
  delete: "Учётка удалена",
  recipe: "Техкарта",
  import: "Импорт номенклатуры",
  period_close: "Закрытие периода",
  debt_topup: "Долг кассы",
  ledger_debt: "Долг учёта",
  ledger_pay: "Погашение долга",
  ledger_edit: "Правка долга",
  payroll_adj: "Корректировка ФОТ",
  household_item: "Хозтовар",
  household_move: "Движение хозов",
  shift_incidental: "Побочный расход смены",
  sale_void: "Отмена чека",
  sale_discount: "Скидка по чеку",
  bootstrap: "Первый администратор",
  settings: "Настройки сети",
  branch: "Филиал",
  stop_list: "Стоп-лист",
};

export type AuditGroup = "all" | "users" | "stock" | "ops" | "other";

export function auditGroup(action: string): Exclude<AuditGroup, "all"> {
  if (
    action === "invite" ||
    action === "staff" ||
    action === "disable" ||
    action === "block" ||
    action === "unblock" ||
    action === "delete" ||
    action === "bootstrap"
  ) {
    return "users";
  }
  if (action === "writeoff" || action === "receipt" || action === "transfer" || action === "revision" || action === "import" || action === "household_item" || action === "household_move") {
    return "stock";
  }
  if (
    action === "shift_open" ||
    action === "shift_close" ||
    action === "payroll_adj" ||
    action === "period_close" ||
    action === "debt_topup" ||
    action === "ledger_debt" ||
    action === "ledger_pay" ||
    action === "shift_incidental" ||
    action === "sale_void" ||
    action === "sale_discount"
  ) {
    return "ops";
  }
  return "other";
}

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

/** Tech admin sees every branch. Others keep the session-branch filter. */
export function scopedAudit(
  entries: AuditEntry[],
  actor: { role: Role; sessionBranchId: string },
): AuditEntry[] {
  if (hasAbsoluteAccess(actor.role)) return entries;
  const branchId = actor.sessionBranchId;
  return entries.filter((e) => branchId === "all" || !e.branchId || e.branchId === branchId);
}
