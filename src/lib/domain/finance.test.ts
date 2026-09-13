import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dishCost,
  expectedCash,
  foodcostPct,
  netProfit,
  payrollAccrual,
  saleCogsFrozen,
  weightedAvgPurchasePrice,
} from "./finance.ts";
import type { Product, Recipe, Sale, StockLevel } from "./types.ts";

const products: Product[] = [
  { id: "pork", name: "Свинина", category: "Мясо", unit: "kg", minQty: 10, avgCost: 400 },
  { id: "onion", name: "Лук", category: "Овощи", unit: "kg", minQty: 2, avgCost: 50 },
];

const recipe: Recipe = {
  id: "skewer",
  name: "Шашлык",
  category: "Мангал",
  price: 690,
  yieldPortions: 1,
  items: [
    { productId: "pork", qty: 0.3 },
    { productId: "onion", qty: 0.05 },
  ],
};

describe("TZ §5 weighted average", () => {
  it("mixes on-hand and incoming lots", () => {
    assert.equal(weightedAvgPurchasePrice(10, 100, 5, 200), 133.3333);
  });

  it("uses the incoming price when the shelf is empty", () => {
    assert.equal(weightedAvgPurchasePrice(0, 100, 4, 220), 220);
  });

  it("keeps the old price when qty does not increase", () => {
    assert.equal(weightedAvgPurchasePrice(8, 150, 0, 999), 150);
    assert.equal(weightedAvgPurchasePrice(8, 150, -2, 999), 150);
  });
});

describe("TZ §5 dish cost and foodcost", () => {
  it("costs a dish from warehouse averages", () => {
    const stock: StockLevel[] = [
      { branchId: "br-a", productId: "pork", qty: 20, avgCost: 420 },
      { branchId: "br-a", productId: "onion", qty: 5, avgCost: 40 },
    ];
    // 0.3*420 + 0.05*40 = 126 + 2 = 128
    assert.equal(dishCost(recipe, products, stock, "br-a"), 128);
  });

  it("divides by yield portions", () => {
    const batch = { ...recipe, yieldPortions: 2 };
    const cost = dishCost(batch, products);
    // (0.3*400 + 0.05*50) / 2 = 122.5 / 2 = 61.25
    assert.equal(cost, 61.25);
  });

  it("foodcost is COGS / revenue", () => {
    assert.equal(foodcostPct(128, 690), (128 / 690) * 100);
    assert.equal(foodcostPct(10, 0), 0);
  });
});

describe("TZ §5 cost_at_sale is frozen", () => {
  it("does not follow a later purchase price", () => {
    const sale: Sale = {
      id: "s1",
      number: "1",
      branchId: "br-a",
      shiftId: "sh",
      at: "2026-09-02T12:00:00.000Z",
      items: [{ recipeId: "skewer", name: "Шашлык", qty: 2, price: 690, sum: 1380, costAtSale: 256 }],
      payments: [{ type: "cash", amount: 1380 }],
      total: 1380,
      waiterId: "w",
      source: "manual",
    };
    const expensive: Product[] = products.map((p) =>
      p.id === "pork" ? { ...p, avgCost: 900 } : p,
    );
    assert.equal(saleCogsFrozen(sale, [recipe], expensive), 256);
  });
});

describe("TZ §5 cash, payroll, net", () => {
  it("expected cash is open float plus cash sales", () => {
    assert.equal(expectedCash(15000, 4320), 19320);
  });

  it("payroll is shift rate plus sales percent", () => {
    const row = payrollAccrual(2200, 3, 10000);
    assert.equal(row.base, 2200);
    assert.equal(row.bonus, 300);
    assert.equal(row.total, 2500);
  });

  it("net profit is revenue minus the four cost buckets", () => {
    assert.equal(
      netProfit({ revenue: 10000, cogs: 3000, writeoffs: 200, opex: 1500, payroll: 800 }),
      4500,
    );
  });
});
