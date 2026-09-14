import type { LedgerDebt, LedgerDebtKind, Snapshot } from "./types.ts";
import { uid } from "../utils.ts";
import { actorFrom, AuthzError, type Actor, writeBranch } from "../authz/actor.ts";
import { canManageDebts, canSeeDebts } from "./permissions.ts";
import { appendAudit } from "./audit.ts";
import { roundMoney } from "./finance.ts";
import { assertReadableBranch } from "./tenancy.ts";

export { actorFrom };

function remaining(d: Pick<LedgerDebt, "amount" | "paid">) {
  return roundMoney(Math.max(0, d.amount - d.paid));
}

function statusOf(amount: number, paid: number): LedgerDebt["status"] {
  if (paid <= 0) return "open";
  if (paid + 0.009 >= amount) return "paid";
  return "partial";
}

export function assertDebts(actor: Actor) {
  if (!canManageDebts(actor.role)) throw new AuthzError("Учёт долгов доступен только владельцу");
}

export function visibleLedgerDebts(snap: Snapshot, role: Actor["role"]): LedgerDebt[] {
  if (!canSeeDebts(role)) return [];
  return snap.ledgerDebts ?? [];
}

export function applyCreateLedgerDebt(
  snap: Snapshot,
  actor: Actor,
  input: {
    kind: LedgerDebtKind;
    partyName: string;
    partyId?: string;
    amount: number;
    note?: string;
    branchId?: string;
  },
): Snapshot {
  assertDebts(actor);
  const branchId = input.branchId && input.branchId !== "all" ? input.branchId : writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  const name = input.partyName.trim();
  const amount = roundMoney(Number(input.amount) || 0);
  if (!name) throw new AuthzError("Укажите контрагента", 400);
  if (amount <= 0) throw new AuthzError("Сумма долга должна быть больше нуля", 400);
  if (!["client", "staff_wage", "supplier"].includes(input.kind)) {
    throw new AuthzError("Тип долга: клиент, зарплата или поставщик", 400);
  }
  const row: LedgerDebt = {
    id: uid("ld"),
    kind: input.kind,
    status: "open",
    partyName: name,
    partyId: input.partyId,
    branchId,
    amount,
    paid: 0,
    note: (input.note ?? "").trim(),
    createdAt: new Date().toISOString(),
    createdBy: actor.userId,
    payments: [],
  };
  return appendAudit({ ...snap, ledgerDebts: [row, ...(snap.ledgerDebts ?? [])] }, actor, "ledger_debt", "debt", `${input.kind} ${name} ${amount}`, branchId);
}

export function applyPayLedgerDebt(
  snap: Snapshot,
  actor: Actor,
  input: { debtId: string; amount: number; note?: string },
): Snapshot {
  assertDebts(actor);
  const debt = (snap.ledgerDebts ?? []).find((d) => d.id === input.debtId);
  if (!debt) throw new AuthzError("Долг не найден", 404);
  assertReadableBranch(snap, actor, debt.branchId);
  const amount = roundMoney(Number(input.amount) || 0);
  if (amount <= 0) throw new AuthzError("Сумма погашения должна быть больше нуля", 400);
  const left = remaining(debt);
  if (amount > left + 0.01) throw new AuthzError(`Нельзя закрыть больше остатка (${left} ₽)`, 400);
  const paid = roundMoney(debt.paid + amount);
  const next: LedgerDebt = {
    ...debt,
    paid,
    status: statusOf(debt.amount, paid),
    payments: [
      {
        id: uid("lp"),
        at: new Date().toISOString(),
        amount,
        note: (input.note ?? "").trim(),
        userId: actor.userId,
      },
      ...debt.payments,
    ],
  };
  return appendAudit(
    { ...snap, ledgerDebts: (snap.ledgerDebts ?? []).map((d) => (d.id === debt.id ? next : d)) },
    actor,
    "ledger_pay",
    "debt",
    `${amount} ₽ · ${debt.partyName}`,
    debt.branchId,
  );
}

export function applyUpdateLedgerDebt(
  snap: Snapshot,
  actor: Actor,
  input: { debtId: string; partyName?: string; amount?: number; note?: string },
): Snapshot {
  assertDebts(actor);
  const debt = (snap.ledgerDebts ?? []).find((d) => d.id === input.debtId);
  if (!debt) throw new AuthzError("Долг не найден", 404);
  assertReadableBranch(snap, actor, debt.branchId);
  const amount = input.amount != null ? roundMoney(Number(input.amount) || 0) : debt.amount;
  if (amount < debt.paid) throw new AuthzError("Сумма не может быть меньше уже погашенного", 400);
  const next: LedgerDebt = {
    ...debt,
    partyName: input.partyName?.trim() || debt.partyName,
    amount,
    note: input.note !== undefined ? input.note.trim() : debt.note,
    status: statusOf(amount, debt.paid),
  };
  return appendAudit(
    { ...snap, ledgerDebts: (snap.ledgerDebts ?? []).map((d) => (d.id === debt.id ? next : d)) },
    actor,
    "ledger_edit",
    "debt",
    next.partyName,
    debt.branchId,
  );
}

export function ledgerTotals(debts: LedgerDebt[]) {
  const open = debts.filter((d) => d.status !== "paid");
  const byKind = (kind: LedgerDebt["kind"]) =>
    open.filter((d) => d.kind === kind).reduce((s, d) => s + remaining(d), 0);
  return {
    client: byKind("client"),
    staff_wage: byKind("staff_wage"),
    supplier: byKind("supplier"),
    total: open.reduce((s, d) => s + remaining(d), 0),
  };
}
