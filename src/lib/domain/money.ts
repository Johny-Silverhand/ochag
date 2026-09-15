import { roundMoney } from "./finance.ts";

/** Parse a till/recount amount: "5 000", "5000р", "5.000,50", "-6500". */
export function parseMoney(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const text = String(raw ?? "")
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/[₽руб.]/gi, "")
    .trim();
  if (!text) return 0;
  const negative = /^-/.test(text.replace(/\s/g, ""));
  const cleaned = text.replace(/[^\d,.\s-]/g, "").replace(/\s+/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") return 0;
  let n: number;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    n = Number(cleaned.replace(/,/g, ""));
  } else if (cleaned.includes(",")) {
    n = Number(cleaned.replace(/\./g, "").replace(",", "."));
  } else {
    n = Number(cleaned);
  }
  if (!Number.isFinite(n)) return 0;
  const abs = Math.abs(n);
  return negative ? -abs : abs;
}

/**
 * Discrepancy = counted cash − expected after new till extras.
 * Expected may already be negative (evening debt). Do not take abs().
 *
 * Example: expected −6500, recount 5000, no extra → +11500
 * (in the drawer 11500 more than the books).
 */
export function cashDiscrepancy(counted: number, expected: number, extraFromTill = 0) {
  return roundMoney(counted - (expected - extraFromTill));
}
