import { AuthzError } from "../authz/actor.ts";
import type { Snapshot } from "./types.ts";

export function closedPeriodFor(snap: Snapshot, branchId: string, date: string) {
  return (
    snap.closedPeriods.find(
      (p) => (p.branchId === branchId || p.branchId === "all") && date >= p.from && date <= p.to,
    ) ?? null
  );
}

export function assertPeriodOpen(snap: Snapshot, branchId: string, date: string) {
  const closed = closedPeriodFor(snap, branchId, date);
  if (closed) {
    throw new AuthzError(
      `Период ${closed.from}–${closed.to} закрыт после ревизии. Правка задним числом отклонена.`,
    );
  }
}
