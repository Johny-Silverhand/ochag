/**
 * Коннектор r_keeper: Z-отчёт / XML → чеки и списание по техкартам.
 * HTTP-вызов живёт в keeper-http.ts (только сервер): отсюда не тянуть Node APIs.
 */
import type { PaymentType, Recipe } from "../domain/types";

export interface KeeperConfig {
  baseUrl: string;
  terminalId: string;
  user: string;
  passwordSet: boolean;
  enabled: boolean;
  querySet: boolean;
}

export const defaultKeeperConfig: KeeperConfig = {
  baseUrl: "",
  terminalId: "POS-01",
  user: "",
  passwordSet: false,
  enabled: false,
  querySet: false,
};

export interface KeeperLine {
  name: string;
  qty: number;
  sum: number;
}

export interface KeeperReceipt {
  number: string;
  datetime: string;
  sum: number;
  payType: "cash" | "card" | "qr";
  items: KeeperLine[];
}

export function demoKeeperZReport(): KeeperReceipt[] {
  return [
    {
      number: "K-9001",
      datetime: new Date().toISOString(),
      sum: 1380,
      payType: "card",
      items: [{ name: "Шашлык из свинины", qty: 2, sum: 1380 }],
    },
    {
      number: "K-9002",
      datetime: new Date().toISOString(),
      sum: 860,
      payType: "cash",
      items: [
        { name: "Курица на гриле", qty: 1, sum: 490 },
        { name: "Салат свежий", qty: 1, sum: 250 },
        { name: "Лаваш", qty: 1, sum: 70 },
        { name: "Газировка 0.5", qty: 1, sum: 50 },
      ],
    },
  ];
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

export function matchRecipe(recipes: Recipe[], name: string): Recipe | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  return (
    recipes.find((x) => normalizeName(x.name) === n) ??
    recipes.find((x) => {
      const rn = normalizeName(x.name);
      return rn.includes(n) || n.includes(rn);
    })
  );
}

export function mapKeeperReceipts(receipts: KeeperReceipt[], recipes: Recipe[], waiterId: string) {
  return receipts.map((r) => {
    const items = r.items.map((line) => {
      const recipe = matchRecipe(recipes, line.name);
      const qty = line.qty > 0 ? line.qty : 1;
      return {
        recipeId: recipe?.id ?? "",
        name: line.name,
        qty,
        price: recipe?.price ?? Math.round(line.sum / qty),
        sum: line.sum,
      };
    });
    const pay: PaymentType = r.payType;
    return {
      at: r.datetime,
      items,
      payments: [{ type: pay, amount: r.sum }],
      total: r.sum,
      waiterId,
      source: "keeper" as const,
      number: r.number,
    };
  });
}
