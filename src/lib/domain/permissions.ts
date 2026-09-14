import type { Role } from "./types.ts";

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
  | "admin"
  | "debts";

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
  debts: ["owner"],
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

/** Повар и официант видят только свой филиал — без сводки по сети. */
export function canSeeNetworkStats(role: Role) {
  return isOpsLead(role);
}

export function scopedBranchId(
  role: Role,
  sessionBranchId: string | undefined,
  homeBranchId: string | null | undefined,
): string {
  if (role === "cook" || role === "waiter") {
    return homeBranchId || (sessionBranchId && sessionBranchId !== "all" ? sessionBranchId : "");
  }
  return sessionBranchId || "all";
}

export function canImportKeeper(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canCreateSale(role: Role) {
  return grants(role, ["owner", "manager", "waiter"]);
}

/** Учебный срез и полный сброс — только техник, никогда управляющий и ниже. */
export function canResetDemo(role: Role) {
  return hasAbsoluteAccess(role);
}

export function canLoadSample(role: Role) {
  return hasAbsoluteAccess(role);
}

/** Филиалы: создать / изменить / удалить — только владелец и техник. */
export function canManageBranches(role: Role) {
  return isNetworkAdmin(role);
}

/** Учёт долгов (клиенты / зарплата / поставщики) — только владелец. Техник видит как абсолютный доступ. */
export function canSeeDebts(role: Role) {
  return grants(role, ["owner"]);
}

/** Журнал операций (консоль) — только администратор-техник. */
export function canSeeOpsLog(role: Role) {
  return hasAbsoluteAccess(role);
}

export function canManageDebts(role: Role) {
  return canSeeDebts(role);
}

export function canVoidSale(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canDiscountSale(role: Role) {
  return grants(role, ["owner", "manager"]);
}

export function canManageHousehold(role: Role) {
  return grants(role, ["owner", "manager", "cook"]);
}

export function canEditOllama(role: Role) {
  return isNetworkAdmin(role);
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

/** Place label for Админка → Пользователи. Technicians are network-wide; others show their branch. */
export function accountPlaceLabel(
  user: { role: Role; branchId: string | null },
  branches: Array<{ id: string; short: string; name: string; city?: string }>,
) {
  if (user.role === "tech_admin") return "вся сеть";
  const branch = user.branchId ? branches.find((b) => b.id === user.branchId) : undefined;
  if (branch) {
    const title = branch.name || branch.short;
    const city = branch.city && branch.city !== "—" ? branch.city : "";
    return city ? `${title} · ${city}` : title;
  }
  if (user.role === "owner") return "вся сеть";
  return "без филиала";
}

export function adminVisibleUsers<T extends { id: string; role: Role; branchId: string | null; ownerId?: string | null }>(
  actor: { role: Role; userId: string; homeBranchId: string | null; sessionBranchId: string; actingOwnerId?: string | null },
  users: T[],
): T[] {
  if (hasAbsoluteAccess(actor.role)) {
    if (!actor.actingOwnerId) return users;
    return users.filter(
      (u) => u.role === "tech_admin" || u.id === actor.actingOwnerId || u.ownerId === actor.actingOwnerId,
    );
  }
  const roles = invitableRoles(actor.role);
  if (actor.role === "owner") {
    const ownerCount = users.filter((u) => u.role === "owner").length;
    return users.filter((u) => {
      if (u.id === actor.userId) return true;
      if (u.role === "tech_admin" || u.role === "owner") return false;
      if (u.ownerId) return u.ownerId === actor.userId;
      if (ownerCount <= 1) return roles.includes(u.role);
      return Boolean(u.branchId && u.branchId === actor.homeBranchId);
    });
  }
  const allBranches = canSeeAllBranches(actor.role);
  return users.filter((u) => {
    if (u.id === actor.userId) return true;
    if (u.role === "tech_admin") return false;
    if (!roles.includes(u.role)) return false;
    if (allBranches) return true;
    const scope = actor.sessionBranchId;
    if (scope && scope !== "all") return u.branchId === scope;
    return !u.branchId || u.branchId === actor.homeBranchId;
  });
}
