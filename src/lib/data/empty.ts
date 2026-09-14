import { defaultSettings, type Snapshot } from "../domain/types";

export function emptySnapshot(): Snapshot {
  return {
    branches: [],
    users: [],
    products: [],
    recipes: [],
    stock: [],
    movements: [],
    invoices: [],
    sales: [],
    shifts: [],
    requests: [],
    banquets: [],
    expenses: [],
    payroll: [],
    revisions: [],
    stopList: [],
    suppliers: [],
    closedPeriods: [],
    debts: [],
    payrollAdjustments: [],
    revenuePlans: [],
    audit: [],
    opsLogs: [],
    outbox: [],
    pushSubs: [],
    settings: defaultSettings(),
  };
}

export function isOnboarded(snap: Snapshot) {
  return snap.users.length > 0 && snap.branches.length > 0;
}
