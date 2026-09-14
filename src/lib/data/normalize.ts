import type { Snapshot } from "../domain/types";
import { defaultSettings, today } from "../domain/types";
import { freezeSaleCosts } from "../domain/finance";
import { emptySnapshot } from "./empty";

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

  return {
    branches: raw.branches ?? [],
    users: (raw.users ?? []).map((u) => ({
      ...u,
      pin: u.pin || "",
      password: u.password || "",
      disabled: Boolean(u.disabled),
    })),
    products,
    recipes,
    stock,
    movements: raw.movements ?? [],
    invoices: raw.invoices ?? [],
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
    })),
    shifts: (raw.shifts ?? []).map((s) => ({
      ...s,
      startList: s.startList ?? recipes.map((r) => r.id),
    })),
    requests: raw.requests ?? [],
    banquets: raw.banquets ?? [],
    expenses: (raw.expenses ?? []).map((e) => ({
      ...e,
      kind: e.kind ?? (e.category === "Аренда" || e.category === "Коммунальные" ? "fixed" : "variable"),
    })),
    payroll: raw.payroll ?? [],
    revisions: raw.revisions ?? [],
    stopList: raw.stopList ?? [],
    suppliers: raw.suppliers ?? [],
    closedPeriods: raw.closedPeriods ?? [],
    debts: raw.debts ?? [],
    payrollAdjustments: raw.payrollAdjustments ?? [],
    revenuePlans: raw.revenuePlans ?? [],
    audit: raw.audit ?? [],
    outbox: raw.outbox ?? [],
    pushSubs: raw.pushSubs ?? [],
    settings: {
      ...defaultSettings(),
      ...(raw.settings ?? {}),
      notifyEvents: { ...defaultSettings().notifyEvents, ...(raw.settings?.notifyEvents ?? {}) },
    },
  };
}

export function dayOf(iso: string) {
  return iso.slice(0, 10) || today();
}
