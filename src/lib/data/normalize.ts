import type { Snapshot } from "../domain/types";
import { freezeSaleCosts } from "../domain/finance";
import { createSeed } from "./seed";

/** Bring an older persisted blob up to the current Snapshot shape. */
export function normalizeSnapshot(raw: Partial<Snapshot> | null | undefined): Snapshot {
  const seed = createSeed();
  if (!raw || !raw.branches?.length) return seed;

  const stock = (raw.stock ?? []).map((row) => ({
    ...row,
    avgCost: row.avgCost ?? seed.products.find((p) => p.id === row.productId)?.avgCost ?? 0,
  }));
  const products = raw.products ?? seed.products;
  const recipes = raw.recipes ?? seed.recipes;

  return {
    branches: raw.branches ?? seed.branches,
    users: (raw.users ?? seed.users).map((u, i) => ({
      ...u,
      pin: u.pin || seed.users[i]?.pin || "0000",
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
    })),
    shifts: raw.shifts ?? [],
    requests: raw.requests ?? [],
    banquets: raw.banquets ?? [],
    expenses: (raw.expenses ?? []).map((e) => ({
      ...e,
      kind: e.kind ?? (e.category === "Аренда" || e.category === "Коммунальные" ? "fixed" : "variable"),
    })),
    payroll: raw.payroll ?? [],
    revisions: raw.revisions ?? [],
    stopList: raw.stopList ?? [],
  };
}
