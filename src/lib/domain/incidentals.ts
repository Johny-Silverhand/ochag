import type { Snapshot, ShiftIncidental, ShiftIncidentalPhase, MoneySource } from "./types.ts";
import { incidentalFromTill } from "./types.ts";
import { uid } from "../utils.ts";
import { AuthzError, type Actor, writeBranch } from "../authz/actor.ts";
import { canEditExpenses, canOpenShift } from "./permissions.ts";
import { appendAudit } from "./audit.ts";
import { openShiftFor } from "./engine.ts";
import { roundMoney } from "./finance.ts";
import { today } from "./types.ts";
import { assertReadableBranch } from "./tenancy.ts";

export type IncidentalDraft = {
  title: string;
  amount: number;
  paidFromTill?: boolean;
  paidFrom?: MoneySource;
  note?: string;
  phase?: ShiftIncidentalPhase;
};

function assertShiftMoney(actor: Actor) {
  if (!canEditExpenses(actor.role) && !canOpenShift(actor.role)) {
    throw new AuthzError("Побочные расходы смены недоступны");
  }
}

function resolvePaidFrom(input: IncidentalDraft): MoneySource {
  if (input.paidFrom) return input.paidFrom;
  return input.paidFromTill === false ? "card" : "cash";
}

export function incidentalCashTotal(incidentals: ShiftIncidental[] | undefined) {
  return roundMoney((incidentals ?? []).filter((i) => incidentalFromTill(i)).reduce((s, i) => s + i.amount, 0));
}

export function applyShiftIncidental(
  snap: Snapshot,
  actor: Actor,
  input: IncidentalDraft & { shiftId?: string },
): Snapshot {
  assertShiftMoney(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  const shift = input.shiftId
    ? snap.shifts.find((s) => s.id === input.shiftId)
    : openShiftFor(snap.shifts, branchId);
  if (!shift) throw new AuthzError("Нет смены для побочного расхода");
  if (shift.branchId !== branchId && actor.sessionBranchId !== "all") {
    throw new AuthzError("Смена другого филиала");
  }
  const title = input.title.trim();
  const amount = roundMoney(Number(input.amount) || 0);
  if (!title) throw new AuthzError("Укажите, на что расход (DJ, певец, декор…)", 400);
  if (amount <= 0) throw new AuthzError("Сумма должна быть больше нуля", 400);
  const paidFrom = resolvePaidFrom(input);
  const paidFromTill = paidFrom === "cash";
  const row: ShiftIncidental = {
    id: uid("inc"),
    phase: input.phase ?? (shift.status === "open" ? "during" : "close"),
    title,
    amount,
    paidFromTill,
    paidFrom,
    note: (input.note ?? "").trim(),
    at: new Date().toISOString(),
    userId: actor.userId,
  };
  const next: Snapshot = {
    ...snap,
    shifts: snap.shifts.map((s) => (s.id === shift.id ? { ...s, incidentals: [...(s.incidentals ?? []), row] } : s)),
    expenses: [
      {
        id: uid("exp"),
        branchId: shift.branchId,
        date: shift.date || today(),
        category: "Смена",
        amount,
        note: `${title}${row.note ? ` — ${row.note}` : ""}${paidFromTill ? "" : " · безнал"}`,
        kind: "variable",
      },
      ...snap.expenses,
    ],
  };
  return appendAudit(next, actor, "shift_incidental", "shift", `${title} ${amount} ₽`, shift.branchId);
}

export function attachIncidentals(
  snap: Snapshot,
  actor: Actor,
  shiftId: string,
  drafts: IncidentalDraft[] | undefined,
  phase: ShiftIncidentalPhase,
): Snapshot {
  let next = snap;
  for (const d of drafts ?? []) {
    if (!d.title?.trim() || !(Number(d.amount) > 0)) continue;
    next = applyShiftIncidental(next, actor, { ...d, shiftId, phase });
  }
  return next;
}
