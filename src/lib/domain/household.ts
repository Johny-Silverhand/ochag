import type { DocumentPhoto, HouseholdItem, HouseholdMoveType, Snapshot, Unit } from "./types.ts";
import { uid } from "../utils.ts";
import { AuthzError, type Actor, writeBranch } from "../authz/actor.ts";
import { canManageHousehold } from "./permissions.ts";
import { appendAudit } from "./audit.ts";
import { roundMoney, roundQty, weightedAvgPurchasePrice } from "./finance.ts";
import { sanitizePhotos } from "./photos.ts";
import { assertReadableBranch } from "./tenancy.ts";

function assertHousehold(actor: Actor) {
  if (!canManageHousehold(actor.role)) throw new AuthzError("Хозы недоступны");
}

export function applyUpsertHouseholdItem(
  snap: Snapshot,
  actor: Actor,
  input: { id?: string; name: string; category?: string; unit?: Unit; minQty?: number },
): Snapshot {
  assertHousehold(actor);
  const name = input.name.trim();
  if (!name) throw new AuthzError("Название хозтовара обязательно", 400);
  const items = snap.householdItems ?? [];
  const existing = input.id ? items.find((i) => i.id === input.id) : items.find((i) => i.name.toLowerCase() === name.toLowerCase());
  const row: HouseholdItem = {
    id: existing?.id ?? uid("hz"),
    name,
    category: (input.category ?? existing?.category ?? "Хозы").trim() || "Хозы",
    unit: input.unit ?? existing?.unit ?? "шт",
    minQty: input.minQty ?? existing?.minQty ?? 0,
  };
  const householdItems = existing
    ? items.map((i) => (i.id === existing.id ? row : i))
    : [row, ...items];
  return appendAudit({ ...snap, householdItems }, actor, "household_item", "household", row.name);
}

export function applyHouseholdMove(
  snap: Snapshot,
  actor: Actor,
  input: {
    itemId: string;
    type: HouseholdMoveType;
    qty: number;
    cost?: number;
    note?: string;
    photos?: DocumentPhoto[];
  },
): Snapshot {
  assertHousehold(actor);
  const branchId = writeBranch(actor);
  assertReadableBranch(snap, actor, branchId);
  const item = (snap.householdItems ?? []).find((i) => i.id === input.itemId);
  if (!item) throw new AuthzError("Хозтовар не найден", 404);
  const qtyAbs = Math.abs(Number(input.qty) || 0);
  if (qtyAbs <= 0) throw new AuthzError("Количество должно быть больше нуля", 400);
  const signed = input.type === "receive" ? qtyAbs : input.type === "consume" ? -qtyAbs : Number(input.qty);
  const unitCost = Number(input.cost) || 0;
  const photos = sanitizePhotos(input.photos);
  const mov = {
    id: uid("hm"),
    at: new Date().toISOString(),
    branchId,
    itemId: item.id,
    type: input.type,
    qty: roundQty(signed),
    cost: roundMoney(Math.abs(signed) * (unitCost || 0)),
    note: input.note,
    userId: actor.userId,
    photos,
  };
  const stock = applyHouseholdStock(snap.householdStock ?? [], mov, unitCost);
  return appendAudit(
    {
      ...snap,
      householdStock: stock,
      householdMovements: [mov, ...(snap.householdMovements ?? [])],
    },
    actor,
    "household_move",
    "household",
    `${item.name} ${mov.qty}`,
    branchId,
  );
}

export function applyHouseholdStock(
  stock: Snapshot["householdStock"],
  mov: { branchId: string; itemId: string; qty: number; cost: number },
  incomingUnit = 0,
) {
  const i = stock.findIndex((s) => s.branchId === mov.branchId && s.itemId === mov.itemId);
  const incoming = incomingUnit || (Math.abs(mov.qty) > 0 ? mov.cost / Math.abs(mov.qty) : 0);
  if (i < 0) {
    return [
      ...stock,
      {
        branchId: mov.branchId,
        itemId: mov.itemId,
        qty: roundQty(mov.qty),
        avgCost: mov.qty > 0 ? incoming : 0,
      },
    ];
  }
  const row = stock[i]!;
  const next = stock.slice();
  const qty = roundQty(row.qty + mov.qty);
  const avgCost = mov.qty > 0 ? weightedAvgPurchasePrice(row.qty, row.avgCost, mov.qty, incoming) : row.avgCost;
  next[i] = { ...row, qty, avgCost };
  return next;
}
