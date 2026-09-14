import type { Snapshot } from "./types.ts";
import { AuthzError, type Actor } from "../authz/actor.ts";
import { assertReadableBranch } from "./tenancy.ts";
import { canDiscountSale, canVoidSale } from "./permissions.ts";
import { appendAudit } from "./audit.ts";
import { applyMovement } from "./engine.ts";
import { roundMoney } from "./finance.ts";

export function applyVoidSale(snap: Snapshot, actor: Actor, input: { saleId: string; reason?: string }): Snapshot {
  if (!canVoidSale(actor.role)) throw new AuthzError("Отмену чека делает управляющий или владелец");
  const sale = snap.sales.find((s) => s.id === input.saleId);
  if (!sale) throw new AuthzError("Чек не найден", 404);
  assertReadableBranch(snap, actor, sale.branchId);
  if (sale.voided) throw new AuthzError("Чек уже отменён");
  const reason = (input.reason ?? "").trim() || "отмена";
  const reversals = snap.movements
    .filter((m) => m.refId === sale.id && m.type === "sale")
    .map((m) => ({
      ...m,
      id: `${m.id}_void`,
      at: new Date().toISOString(),
      qty: -m.qty,
      type: "sale" as const,
      note: `отмена ${sale.number}`,
      userId: actor.userId,
    }));
  let stock = snap.stock;
  for (const m of reversals) stock = applyMovement(stock, m);
  const next: Snapshot = {
    ...snap,
    stock,
    movements: [...reversals, ...snap.movements],
    sales: snap.sales.map((s) =>
      s.id === sale.id
        ? {
            ...s,
            voided: true,
            voidedAt: new Date().toISOString(),
            voidedBy: actor.userId,
            voidReason: reason,
          }
        : s,
    ),
  };
  return appendAudit(next, actor, "sale_void", "sale", `${sale.number} · ${reason}`, sale.branchId);
}

export function applyDiscountSale(
  snap: Snapshot,
  actor: Actor,
  input: { saleId: string; amount: number; reason?: string },
): Snapshot {
  if (!canDiscountSale(actor.role)) throw new AuthzError("Скидку ставит управляющий или владелец");
  const sale = snap.sales.find((s) => s.id === input.saleId);
  if (!sale) throw new AuthzError("Чек не найден", 404);
  assertReadableBranch(snap, actor, sale.branchId);
  if (sale.voided) throw new AuthzError("Нельзя скидку на отменённый чек");
  const amount = roundMoney(Number(input.amount) || 0);
  if (amount <= 0) throw new AuthzError("Сумма скидки должна быть больше нуля", 400);
  if (amount > sale.total) throw new AuthzError("Скидка больше суммы чека", 400);
  const reason = (input.reason ?? "").trim() || "скидка";
  const total = roundMoney(sale.total - amount);
  const payments = sale.payments.map((p, i) => (i === 0 ? { ...p, amount: roundMoney(Math.max(0, p.amount - amount)) } : p));
  const next: Snapshot = {
    ...snap,
    sales: snap.sales.map((s) =>
      s.id === sale.id
        ? {
            ...s,
            total,
            payments,
            discount: roundMoney((s.discount ?? 0) + amount),
            discountReason: reason,
          }
        : s,
    ),
  };
  return appendAudit(next, actor, "sale_discount", "sale", `${sale.number} −${amount} ₽`, sale.branchId);
}
