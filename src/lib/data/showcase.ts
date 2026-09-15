import { createSeed } from "./seed.ts";
import { emptySnapshot } from "./empty.ts";
import type { Snapshot } from "../domain/types.ts";
import { uid } from "../utils.ts";
import { addDays } from "../format.ts";

const SHOWCASE_LOGIN = "showcase";

function rewriteIds(raw: string, token: string) {
  return raw
    .replaceAll("u-tech", `${token}-skip-tech`)
    .replaceAll("u-owner", `${token}-owner`)
    .replaceAll("u-mgr", `${token}-mgr`)
    .replaceAll("u-cook", `${token}-cook`)
    .replaceAll("u-wait", `${token}-wait`)
    .replaceAll("br-pushkin", `${token}-br-a`)
    .replaceAll("br-south", `${token}-br-b`)
    .replaceAll("br-embank", `${token}-br-c`)
    .replaceAll("prd-", `${token}-prd-`)
    .replaceAll("rcp-", `${token}-rcp-`)
    .replaceAll("hz-", `${token}-hz-`)
    .replaceAll("sup-", `${token}-sup-`)
    .replaceAll("rev-", `${token}-rev-`)
    .replaceAll("debt-", `${token}-debt-`)
    .replaceAll("plan-", `${token}-plan-`)
    .replaceAll("adj-", `${token}-adj-`)
    .replaceAll("sl-", `${token}-sl-`)
    .replaceAll("pr-1", `${token}-pr-1`);
}

function shiftStamp(iso: string | undefined, days: number) {
  if (!iso) return iso;
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const next = addDays(day, days);
  return iso.length > 10 ? `${next}${iso.slice(10)}` : next;
}

function retagId(id: string, tag: string) {
  return `${id}_${tag}`;
}

/** Copy a week of ops back 1–3 months so the sales demo is not a 7-day stub. */
function stretchHistory(cloned: Snapshot): Snapshot {
  const offsets = [
    { days: -30, tag: "m1" },
    { days: -60, tag: "m2" },
    { days: -90, tag: "m3" },
  ];
  const extraSales = offsets.flatMap(({ days, tag }) =>
    cloned.sales.map((s) => ({
      ...s,
      id: retagId(s.id, tag),
      number: `${s.number}-${tag}`,
      at: shiftStamp(s.at, days) ?? s.at,
      shiftId: s.shiftId ? retagId(s.shiftId, tag) : s.shiftId,
    })),
  );
  const extraShifts = offsets.flatMap(({ days, tag }) =>
    cloned.shifts.map((s) => ({
      ...s,
      id: retagId(s.id, tag),
      date: shiftStamp(s.date, days) ?? s.date,
      openedAt: shiftStamp(s.openedAt, days) ?? s.openedAt,
      closedAt: s.closedAt ? shiftStamp(s.closedAt, days) : s.closedAt,
      status: "closed" as const,
    })),
  );
  const extraPayroll = offsets.flatMap(({ days, tag }) =>
    cloned.payroll.map((p) => ({
      ...p,
      id: retagId(p.id, tag),
      date: shiftStamp(p.date, days) ?? p.date,
      shiftId: p.shiftId ? retagId(p.shiftId, tag) : p.shiftId,
    })),
  );
  const extraExpenses = offsets.flatMap(({ days, tag }) =>
    cloned.expenses.map((e) => ({
      ...e,
      id: retagId(e.id, tag),
      date: shiftStamp(e.date, days) ?? e.date,
    })),
  );
  const extraInvoices = offsets.flatMap(({ days, tag }) =>
    cloned.invoices.map((inv) => ({
      ...inv,
      id: retagId(inv.id, tag),
      number: `${inv.number}-${tag}`,
      date: shiftStamp(inv.date, days) ?? inv.date,
    })),
  );
  const extraBanquets = offsets.flatMap(({ days, tag }) =>
    cloned.banquets.map((b) => ({
      ...b,
      id: retagId(b.id, tag),
      number: `${b.number}-${tag}`,
      date: shiftStamp(b.date, days) ?? b.date,
      title: `${b.title} (${tag})`,
    })),
  );
  const extraPlans = offsets.flatMap(({ days, tag }) =>
    (cloned.revenuePlans ?? []).map((p) => ({
      ...p,
      id: retagId(p.id, tag),
      month: (shiftStamp(`${p.month}-01`, days) ?? `${p.month}-01`).slice(0, 7),
    })),
  );
  return {
    ...cloned,
    sales: [...extraSales, ...cloned.sales],
    shifts: [...extraShifts, ...cloned.shifts],
    payroll: [...extraPayroll, ...cloned.payroll],
    expenses: [...extraExpenses, ...cloned.expenses],
    invoices: [...extraInvoices, ...cloned.invoices],
    banquets: [...extraBanquets, ...cloned.banquets],
    revenuePlans: [...extraPlans, ...(cloned.revenuePlans ?? [])],
  };
}

/** Merge a filled sales-demo owner into a live store. Never wipes existing clients. */
export function applyEnsureShowcase(snap: Snapshot): Snapshot {
  if (snap.users.some((u) => u.email.trim().toLowerCase() === SHOWCASE_LOGIN)) return snap;
  const token = `show_${uid("x").slice(-6)}`;
  const seed = createSeed();
  const json = rewriteIds(JSON.stringify(seed), token);
  const cloned = stretchHistory(JSON.parse(json) as Snapshot);
  cloned.users = cloned.users
    .filter((u) => u.role !== "tech_admin")
    .map((u) => {
      if (u.role === "owner") {
        return {
          ...u,
          email: SHOWCASE_LOGIN,
          name: "Витрина показа",
          password: "restopro",
          pin: "1515",
          phone: "+7 900 000-15-15",
        };
      }
      return {
        ...u,
        email: `${token}-${u.email}`,
        password: "restopro",
      };
    });
  cloned.settings = {
    ...snap.settings,
    keeperCashLink: false,
  };
  return {
    ...snap,
    branches: [...snap.branches, ...cloned.branches],
    users: [...snap.users, ...cloned.users],
    products: snap.products.length ? snap.products : cloned.products,
    recipes: snap.recipes.length ? snap.recipes : cloned.recipes,
    stock: [...snap.stock, ...cloned.stock],
    movements: [...cloned.movements, ...snap.movements],
    invoices: [...cloned.invoices, ...snap.invoices],
    sales: [...cloned.sales, ...snap.sales],
    shifts: [...cloned.shifts, ...snap.shifts],
    requests: [...cloned.requests, ...snap.requests],
    banquets: [...cloned.banquets, ...snap.banquets],
    expenses: [...cloned.expenses, ...snap.expenses],
    payroll: [...cloned.payroll, ...snap.payroll],
    revisions: [...cloned.revisions, ...snap.revisions],
    stopList: [...cloned.stopList, ...snap.stopList],
    suppliers: snap.suppliers.length ? snap.suppliers : cloned.suppliers,
    debts: [...cloned.debts, ...snap.debts],
    ledgerDebts: [...(cloned.ledgerDebts ?? []), ...(snap.ledgerDebts ?? [])],
    householdItems: snap.householdItems.length ? snap.householdItems : cloned.householdItems,
    householdStock: [...(cloned.householdStock ?? []), ...(snap.householdStock ?? [])],
    householdMovements: [...(cloned.householdMovements ?? []), ...(snap.householdMovements ?? [])],
    payrollAdjustments: [...(cloned.payrollAdjustments ?? []), ...(snap.payrollAdjustments ?? [])],
    revenuePlans: [...(cloned.revenuePlans ?? []), ...(snap.revenuePlans ?? [])],
    closedPeriods: snap.closedPeriods ?? [],
    settings: cloned.settings,
  };
}

export function showcaseExists(snap: Snapshot) {
  return snap.users.some((u) => u.email.trim().toLowerCase() === SHOWCASE_LOGIN);
}

export const SHOWCASE_OWNER_LOGIN = SHOWCASE_LOGIN;

export function emptyWithPending(): Snapshot {
  return emptySnapshot();
}
