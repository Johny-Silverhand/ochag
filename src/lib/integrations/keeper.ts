/**
 * Коннектор r_keeper: Z-отчёт → чеки и списание по техкартам.
 */
import type { PaymentType, Recipe, Sale } from "../domain/types";

export interface KeeperConfig {
  baseUrl: string;
  terminalId: string;
  enabled: boolean;
}

export const defaultKeeperConfig: KeeperConfig = {
  baseUrl: "https://keeper.local/api",
  terminalId: "POS-01",
  enabled: false,
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
      items: [
        { name: "Шашлык из свинины", qty: 2, sum: 1380 },
      ],
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

export function mapKeeperReceipts(
  receipts: KeeperReceipt[],
  recipes: Recipe[],
  waiterId: string,
): Omit<Sale, "id" | "number" | "shiftId" | "branchId">[] {
  return receipts.map((r) => {
    const items = r.items.map((line) => {
      const recipe = recipes.find((x) => x.name.toLowerCase() === line.name.toLowerCase());
      return {
        recipeId: recipe?.id ?? "rcp-pork",
        name: line.name,
        qty: line.qty,
        price: recipe?.price ?? Math.round(line.sum / line.qty),
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
    };
  });
}

export async function fetchKeeperZReport(_cfg: KeeperConfig): Promise<KeeperReceipt[]> {
  // Real integration: GET `${cfg.baseUrl}/zreport?terminal=${cfg.terminalId}`
  return demoKeeperZReport();
}
