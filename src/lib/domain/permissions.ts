import type { Role } from "./types";

export type ModuleKey =
  | "dashboard"
  | "sales"
  | "inventory"
  | "recipes"
  | "shifts"
  | "procurement"
  | "banquets"
  | "staff"
  | "reports"
  | "integrations"
  | "settings";

const ALL: Role[] = ["owner", "manager", "cook", "waiter"];

export const MODULE_ROLES: Record<ModuleKey, Role[]> = {
  dashboard: ALL,
  sales: ALL,
  inventory: ["owner", "manager", "cook"],
  recipes: ["owner", "manager", "cook"],
  shifts: ALL,
  procurement: ["owner", "manager"],
  banquets: ALL,
  staff: ["owner", "manager"],
  reports: ["owner", "manager"],
  integrations: ["owner"],
  settings: ALL,
};

export function can(role: Role, module: ModuleKey) {
  return MODULE_ROLES[module].includes(role);
}

export function canWriteoff(role: Role) {
  return role === "owner" || role === "manager" || role === "cook";
}

export function canEditBanquet(role: Role) {
  return role === "owner" || role === "manager";
}

export function canManageCash(role: Role) {
  return role === "owner" || role === "manager";
}

export function canSeeAllBranches(role: Role) {
  return role === "owner";
}

export function canImportKeeper(role: Role) {
  return role === "owner" || role === "manager";
}

export function canCreateSale(role: Role) {
  return role === "owner" || role === "manager" || role === "waiter";
}

export function canResetDemo(role: Role) {
  return role === "owner" || role === "manager";
}
