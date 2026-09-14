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
  | "settings"
  | "planning"
  | "schedule"
  | "quality"
  | "ai";

const ALL: Role[] = ["tech_admin", "owner", "manager", "cook", "waiter"];

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
  planning: ["owner", "manager"],
  schedule: ["owner", "manager"],
  quality: ["owner", "manager", "cook"],
  ai: ["owner", "manager"],
};

/** Администратор-техник — полный доступ, выше владельца на проверках прав. */
export function hasAbsoluteAccess(role: Role) {
  return role === "tech_admin";
}

/** Сеть целиком: техник или владелец. */
export function isNetworkAdmin(role: Role) {
  return role === "tech_admin" || role === "owner";
}

/** Операционный контур филиала: техник, владелец, управляющий. */
export function isOpsLead(role: Role) {
  return role === "tech_admin" || role === "owner" || role === "manager";
}

function grants(role: Role, allowed: readonly Role[]) {
  return hasAbsoluteAccess(role) || allowed.includes(role);
}

export function canTransfer(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canManageStopList(role: Role) {
  return grants(role, ["owner", "manager", "cook"]);
}

export function canEditExpenses(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function can(role: Role, module: ModuleKey) {
  return grants(role, MODULE_ROLES[module]);
}

export function canWriteoff(role: Role) {
  return grants(role, ["owner", "manager", "cook"]);
}

export function canEditBanquet(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canManageCash(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canOpenShift(role: Role) {
  return grants(role, ["owner", "manager", "cook"]);
}

export function canInviteStaff(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canClosePeriod(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canEditNomenclature(role: Role) {
  return grants(role, ["owner", "manager", "cook"]);
}

export function canSeeAllBranches(role: Role) {
  return grants(role, ["owner"]);
}

export function canImportKeeper(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canCreateSale(role: Role) {
  return grants(role, ["owner", "manager", "waiter"]);
}

export function canResetDemo(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function invitableRoles(actorRole: Role): Role[] {
  if (hasAbsoluteAccess(actorRole)) return ["tech_admin", "owner", "manager", "cook", "waiter"];
  if (actorRole === "owner" || actorRole === "manager") return ["manager", "cook", "waiter"];
  return [];
}
