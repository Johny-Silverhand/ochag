import type { Snapshot } from "../domain/types";
import { defaultSettings, today } from "../domain/types";
import { freezeSaleCosts } from "../domain/finance";
import { emptySnapshot } from "./empty";
import { assignOwnerIds } from "../domain/tenancy";

/** Bring an older persisted blob up to the current Snapshot shape. Never invents a demo network. */
export function normalizeSnapshot(raw: Partial<Snapshot> | null | undefined): Snapshot {
  const blank = emptySnapshot();
  if (!raw) return blank;

  const stock = (raw.stock ?? []).map((row) => ({
    ...row,
    avgCost: row.avgCost ?? 0,
  }));
  const products = raw.products ?? [];
  const recipes = raw.recipes ?? [];

  const normalized: Snapshot = {
    branches: (raw.branches ?? []).map((b) => ({
      ...b,
      seats: b.seats ?? 40,
      halls: b.halls?.length ? b.halls : ["Основной зал"],
    })),
    users: (raw.users ?? []).map((u) => ({
      ...u,
      pin: u.pin || "",
      password: u.password || "",
      disabled: Boolean(u.disabled),
      lastLoginAt: u.lastLoginAt,
      monthlyPremium: u.monthlyPremium ?? 0,
    })),
    products,
    recipes,
    stock,
    movements: raw.movements ?? [],
    invoices: (raw.invoices ?? []).map((inv) => ({ ...inv, photos: inv.photos ?? [] })),
    sales: (raw.sales ?? []).map((sale) => ({
      ...sale,
      items: freezeSaleCosts(
        sale.items.map((it) => ({
          recipeId: it.recipeId,
          name: it.name,
          qty: it.qty,
          price: it.price,
          sum: it.sum,
        })),
        recipes,
        products,
        stock,
        sale.branchId,
      ).map((frozen, idx) =>
        typeof sale.items[idx]?.costAtSale === "number"
          ? { ...frozen, costAtSale: sale.items[idx]!.costAtSale }
          : frozen,
      ),
      externalKey: sale.externalKey,
      voided: Boolean(sale.voided),
      discount: sale.discount ?? 0,
    })),
    shifts: (raw.shifts ?? []).map((s) => ({
      ...s,
      startList: s.startList ?? recipes.map((r) => r.id),
      incidentals: s.incidentals ?? [],
    })),
    requests: raw.requests ?? [],
    banquets: raw.banquets ?? [],
    expenses: (raw.expenses ?? []).map((e) => ({
      ...e,
      kind: e.kind ?? (e.category === "Аренда" || e.category === "Коммунальные" ? "fixed" : "variable"),
    })),
    payroll: raw.payroll ?? [],
    revisions: (raw.revisions ?? []).map((r) => ({ ...r, photos: r.photos ?? [] })),
    stopList: raw.stopList ?? [],
    suppliers: raw.suppliers ?? [],
    closedPeriods: raw.closedPeriods ?? [],
    debts: raw.debts ?? [],
    ledgerDebts: (raw.ledgerDebts ?? []).map((d) => ({
      ...d,
      paid: d.paid ?? 0,
      payments: d.payments ?? [],
    })),
    householdItems: raw.householdItems ?? [],
    householdStock: raw.householdStock ?? [],
    householdMovements: raw.householdMovements ?? [],
    payrollAdjustments: raw.payrollAdjustments ?? [],
    revenuePlans: raw.revenuePlans ?? [],
    audit: raw.audit ?? [],
    opsLogs: raw.opsLogs ?? [],
    outbox: raw.outbox ?? [],
    pushSubs: raw.pushSubs ?? [],
    settings: {
      ...defaultSettings(),
      ...(raw.settings ?? {}),
      notifyEvents: { ...defaultSettings().notifyEvents, ...(raw.settings?.notifyEvents ?? {}) },
    },
    deviceSessions: raw.deviceSessions ?? [],
  };
  return assignOwnerIds(normalized);
}

export function dayOf(iso: string) {
  return iso.slice(0, 10) || today();
}
