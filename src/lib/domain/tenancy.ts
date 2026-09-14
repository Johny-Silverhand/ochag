import { AuthzError } from "../authz/error.ts";
import { hasAbsoluteAccess } from "./permissions.ts";
import type { Role, Snapshot, StaffUser } from "./types.ts";

export type TenantActor = {
  userId: string;
  role: Role;
  homeBranchId?: string | null;
  sessionBranchId?: string;
  ownerId?: string | null;
  actingOwnerId?: string | null;
};

export function ownersOf(snap: Snapshot): StaffUser[] {
  return snap.users.filter((u) => u.role === "owner" && !u.disabled);
}

export function effectiveOwnerId(actor: TenantActor, snap?: Snapshot): string | null {
  if (hasAbsoluteAccess(actor.role)) return actor.actingOwnerId?.trim() || null;
  if (actor.role === "owner") return actor.userId;
  if (actor.ownerId) return actor.ownerId;
  if (!snap) return null;
  const user = snap.users.find((u) => u.id === actor.userId);
  if (user?.ownerId) return user.ownerId;
  if (user?.role === "owner") return user.id;
  const home = user?.branchId ?? actor.homeBranchId;
  if (home) {
    const branch = snap.branches.find((b) => b.id === home);
    if (branch?.ownerId) return branch.ownerId;
  }
  const sole = ownersOf(snap);
  return sole.length === 1 ? sole[0]!.id : null;
}

export function ownerBranchIds(snap: Snapshot, ownerId: string): Set<string> {
  return new Set(snap.branches.filter((b) => b.ownerId === ownerId).map((b) => b.id));
}

export function branchOwnerId(snap: Snapshot, branchId: string): string | null {
  return snap.branches.find((b) => b.id === branchId)?.ownerId ?? null;
}

export function assignOwnerIds(snap: Snapshot): Snapshot {
  const owners = snap.users.filter((u) => u.role === "owner");
  const sole = owners.length === 1 ? owners[0] : undefined;
  const branches = snap.branches.map((b) => {
    if (b.ownerId && owners.some((o) => o.id === b.ownerId)) return b;
    const homeOwner = owners.find((o) => o.branchId === b.id);
    if (homeOwner) return { ...b, ownerId: homeOwner.id };
    if (sole) return { ...b, ownerId: sole.id };
    return b;
  });
  const users = snap.users.map((u) => {
    if (u.role === "tech_admin") return { ...u, ownerId: null };
    if (u.role === "owner") return { ...u, ownerId: u.id };
    if (u.ownerId) return u;
    const br = u.branchId ? branches.find((b) => b.id === u.branchId) : undefined;
    if (br?.ownerId) return { ...u, ownerId: br.ownerId };
    if (sole) return { ...u, ownerId: sole.id };
    return u;
  });
  return { ...snap, branches, users };
}

export function scopeSnapshot(snap: Snapshot, ownerId: string): Snapshot {
  const ids = ownerBranchIds(snap, ownerId);
  const inBranch = <T extends { branchId?: string }>(row: T) => !row.branchId || ids.has(row.branchId);
  return {
    ...snap,
    branches: snap.branches.filter((b) => b.ownerId === ownerId),
    users: snap.users.filter(
      (u) => u.role === "tech_admin" || u.id === ownerId || u.ownerId === ownerId,
    ),
    stock: snap.stock.filter((s) => ids.has(s.branchId)),
    movements: snap.movements.filter((m) => ids.has(m.branchId)),
    invoices: snap.invoices.filter((r) => ids.has(r.branchId)),
    sales: snap.sales.filter((s) => ids.has(s.branchId)),
    shifts: snap.shifts.filter((s) => ids.has(s.branchId)),
    requests: snap.requests.filter((r) => ids.has(r.branchId)),
    banquets: snap.banquets.filter((b) => ids.has(b.branchId)),
    expenses: snap.expenses.filter((e) => ids.has(e.branchId)),
    payroll: snap.payroll.filter((p) => ids.has(p.branchId)),
    revisions: snap.revisions.filter((r) => ids.has(r.branchId)),
    stopList: snap.stopList.filter((s) => ids.has(s.branchId)),
    debts: snap.debts.filter((d) => ids.has(d.branchId)),
    ledgerDebts: (snap.ledgerDebts ?? []).filter((d) => ids.has(d.branchId)),
    householdStock: (snap.householdStock ?? []).filter((s) => ids.has(s.branchId)),
    householdMovements: (snap.householdMovements ?? []).filter((m) => ids.has(m.branchId)),
    payrollAdjustments: (snap.payrollAdjustments ?? []).filter(inBranch),
    revenuePlans: (snap.revenuePlans ?? []).filter((p) => ids.has(p.branchId)),
    suppliers: snap.suppliers ?? [],
    deviceSessions: (snap.deviceSessions ?? []).filter((s) => {
      const user = snap.users.find((u) => u.id === s.userId);
      return user?.id === ownerId || user?.ownerId === ownerId || user?.role === "tech_admin";
    }),
  };
}

export function snapshotForActor(snap: Snapshot, actor: TenantActor): Snapshot {
  const ownerId = effectiveOwnerId(actor, snap);
  if (!ownerId) return snap;
  return scopeSnapshot(snap, ownerId);
}

export function assertReadableBranch(snap: Snapshot, actor: TenantActor, branchId: string) {
  if (!branchId || branchId === "all") {
    if (hasAbsoluteAccess(actor.role) || actor.role === "owner" || actor.sessionBranchId === "all") return;
    throw new AuthzError("Филиал недоступен");
  }
  const branch = snap.branches.find((b) => b.id === branchId);
  if (!branch) throw new AuthzError("Филиал недоступен");
  const ownerId = effectiveOwnerId(actor, snap);
  if (hasAbsoluteAccess(actor.role) && !ownerId) return;
  if (ownerId && branch.ownerId && branch.ownerId !== ownerId) {
    throw new AuthzError("Филиал другого контура");
  }
  if (!hasAbsoluteAccess(actor.role) && actor.role !== "owner") {
    const home = actor.homeBranchId;
    if (home && branchId !== home && actor.sessionBranchId !== "all") {
      throw new AuthzError("Филиал недоступен");
    }
  }
}

export function resolveOwnerForWrite(actor: TenantActor, snap: Snapshot): string {
  const ownerId = effectiveOwnerId(actor, snap);
  if (ownerId) return ownerId;
  if (hasAbsoluteAccess(actor.role)) {
    throw new AuthzError("Сначала выберите контур владельца");
  }
  throw new AuthzError("Контур владельца не определён");
}

export function canSwitchOwner(role: Role) {
  return hasAbsoluteAccess(role);
}
