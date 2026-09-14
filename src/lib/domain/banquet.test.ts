import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyBanquetKit, autoBanquetKit, removeBanquetLine, upsertBanquetLine } from "./banquet.ts";
import type { Banquet } from "./types.ts";

function banquet(over: Partial<Banquet> = {}): Banquet {
  return {
    id: "bn_1",
    number: "БН-1",
    branchId: "br_1",
    title: "Юбилей",
    clientName: "Иванов",
    clientPhone: "+7",
    date: "2026-09-20",
    startTime: "18:00",
    endTime: "23:00",
    guests: 24,
    hall: "Основной зал",
    total: 80000,
    deposit: 20000,
    depositPaid: false,
    status: "inquiry",
    notes: "",
    waiterNotes: "",
    grillNotes: "",
    kitchenNotes: "",
    grillItems: [],
    kitchenItems: [],
    serviceItems: [],
    timeline: [],
    ...over,
  };
}

describe("banquet auto-calc and overrides", () => {
  it("scales cutlery and grill to the guest count", () => {
    const kit = autoBanquetKit({ guests: 20, startTime: "19:00" });
    const cutlery = kit.serviceItems.find((i) => i.name === "Приборы");
    const grill = kit.grillItems.find((i) => i.name === "Шашлык свинина");
    assert.equal(cutlery?.qty, 20);
    assert.equal(grill?.qty, 5);
    assert.equal(kit.timeline.some((t) => t.time === "19:00"), true);
  });

  it("keeps a manual dish edit after auto-kit is applied, then lets CRUD replace a line", () => {
    const kit = autoBanquetKit({ guests: 10, startTime: "18:00" });
    let card = applyBanquetKit(banquet({ guests: 10 }), kit);
    card = {
      ...card,
      serviceItems: upsertBanquetLine(card.serviceItems, 0, { qty: 14, notes: "запас" }),
    };
    assert.equal(card.serviceItems[0]?.qty, 14);
    assert.equal(card.serviceItems[0]?.notes, "запас");
    const trimmed = removeBanquetLine(card.serviceItems, 0);
    assert.equal(trimmed.length, kit.serviceItems.length - 1);
    const added = upsertBanquetLine(trimmed, -1, { name: "Чайный сервис", qty: 2, unit: "шт" });
    assert.equal(added.at(-1)?.name, "Чайный сервис");
  });

  it("recalc overwrites lines — caller decides when to apply", () => {
    const first = applyBanquetKit(banquet({ guests: 10 }), autoBanquetKit({ guests: 10, startTime: "18:00" }));
    first.serviceItems[0] = { ...first.serviceItems[0]!, qty: 99 };
    const recalc = applyBanquetKit(first, autoBanquetKit({ guests: 10, startTime: "18:00" }));
    assert.equal(recalc.serviceItems[0]?.qty, 10);
  });
});
