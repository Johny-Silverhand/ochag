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
  | "ai"
  | "admin";

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
  admin: [],
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

export function canManageAccounts(role: Role) {
  return canInviteStaff(role);
}

export function canEditAccount(
  actor: { role: Role; userId: string },
  target: { id: string; role: Role },
) {
  if (target.id === actor.userId) return false;
  return invitableRoles(actor.role).includes(target.role);
}

export function canDeleteAccount(
  actor: { role: Role; userId: string },
  target: { id: string; role: Role },
  users: Array<{ id: string; role: Role }>,
) {
  if (!hasAbsoluteAccess(actor.role)) return false;
  if (target.id === actor.userId) return false;
  if (target.role === "tech_admin" && users.filter((u) => u.role === "tech_admin").length <= 1) {
    return false;
  }
  return true;
}

export function adminVisibleUsers<T extends { id: string; role: Role; branchId: string | null }>(
  actor: { role: Role; userId: string; homeBranchId: string | null; sessionBranchId: string },
  users: T[],
): T[] {
  if (hasAbsoluteAccess(actor.role)) return users;
  const roles = invitableRoles(actor.role);
  const allBranches = canSeeAllBranches(actor.role);
  return users.filter((u) => {
    if (u.id === actor.userId) return true;
    if (!roles.includes(u.role)) return false;
    if (allBranches) return true;
    const scope = actor.sessionBranchId;
    if (scope && scope !== "all") return u.branchId === scope;
    return !u.branchId || u.branchId === actor.homeBranchId;
  });
}
