import type { Role, Session, StaffUser } from "../domain/types.ts";
import { can, canCreateSale, canImportKeeper, canManageCash, canSeeAllBranches, canWriteoff } from "../domain/permissions.ts";
import { canEditExpenses, canManageStopList, canTransfer, type ModuleKey } from "../domain/permissions.ts";

export { AuthzError } from "./error.ts";
import { AuthzError } from "./error.ts";

export interface Actor {
  userId: string;
  role: Role;
  homeBranchId: string | null;
  sessionBranchId: string;
  name: string;
}

export function actorFrom(user: StaffUser, session: Session): Actor {
  return {
    userId: user.id,
    role: user.role,
    homeBranchId: user.branchId,
    sessionBranchId: session.branchId,
    name: user.name,
  };
}

export function writeBranch(actor: Actor): string {
  if (actor.sessionBranchId && actor.sessionBranchId !== "all") return actor.sessionBranchId;
  if (actor.homeBranchId && actor.sessionBranchId !== "all") return actor.homeBranchId;
  throw new AuthzError("Выберите филиал — запись по всей сети запрещена");
}

export function assertBranchScope(actor: Actor, branchId: string) {
  if (canSeeAllBranches(actor.role)) return;
  if (actor.homeBranchId && branchId === actor.homeBranchId) return;
  throw new AuthzError("Филиал недоступен");
}

export function assertModule(actor: Actor, module: ModuleKey) {
  if (!can(actor.role, module)) throw new AuthzError("Недостаточно прав");
}

export function assertWriteoff(actor: Actor) {
  if (!canWriteoff(actor.role)) throw new AuthzError("Списание недоступно");
}

export function assertCash(actor: Actor) {
  if (!canManageCash(actor.role)) throw new AuthzError("Касса только для управляющего");
}

export function assertSale(actor: Actor) {
  if (!canCreateSale(actor.role)) throw new AuthzError("Чек недоступен");
}

export function assertKeeper(actor: Actor) {
  if (!canImportKeeper(actor.role)) throw new AuthzError("Импорт кипера недоступен");
}

export function assertTransfer(actor: Actor) {
  if (!canTransfer(actor.role)) throw new AuthzError("Перемещение недоступно");
}

export function assertStopList(actor: Actor) {
  if (!canManageStopList(actor.role)) throw new AuthzError("Стоп-лист недоступен");
}

export function assertExpenses(actor: Actor) {
  if (!canEditExpenses(actor.role)) throw new AuthzError("Расходы недоступны");
}

export function publicActor(actor: Actor) {
  return {
    userId: actor.userId,
    role: actor.role,
    branchId: actor.sessionBranchId,
    name: actor.name,
  };
}
