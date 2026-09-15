import type { Snapshot } from "../domain/types.ts";

export function transferLegs(snap: Snapshot, refId: string) {
  const id = refId.trim();
  if (!id) throw new Error("Накладная не найдена");
  const legs = snap.movements.filter((m) => m.type === "transfer" && m.refId === id);
  if (!legs.length) throw new Error("Накладная не найдена");
  return legs.slice().sort((a, b) => a.qty - b.qty);
}
