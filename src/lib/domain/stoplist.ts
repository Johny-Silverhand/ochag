import type { Recipe, Snapshot, StopListEntry, StopListReason } from "./types.ts";
import { stockOf } from "./engine.ts";

export function activeStopList(entries: StopListEntry[], branchId: string | "all") {
  return entries.filter(
    (e) => !e.clearedAt && (branchId === "all" || e.branchId === branchId),
  );
}

export function isStopped(entries: StopListEntry[], branchId: string, recipeId: string) {
  return activeStopList(entries, branchId).some((e) => e.recipeId === recipeId);
}

/** Dishes that cannot be cooked from current warehouse qty. */
export function autoStopCandidates(snap: Snapshot, branchId: string): { recipe: Recipe; missing: string[] }[] {
  return snap.recipes
    .map((recipe) => {
      const missing = recipe.items
        .filter((item) => stockOf(snap.stock, branchId, item.productId) < item.qty)
        .map((item) => snap.products.find((p) => p.id === item.productId)?.name ?? item.productId);
      return { recipe, missing };
    })
    .filter((row) => row.missing.length > 0);
}

export function startList(snap: Snapshot, branchId: string) {
  const stopped = new Set(activeStopList(snap.stopList, branchId).map((e) => e.recipeId));
  return snap.recipes.filter((r) => !stopped.has(r.id));
}

export function stopReasonLabel(reason: StopListReason) {
  return reason;
}
