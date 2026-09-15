import type { Product, Unit } from "./types.ts";

const UNITS: Unit[] = ["kg", "l", "шт", "порц"];
const HEADER_CELLS = /^(name|название|product|товар|категория|category|unit|ед|minqty|мин|avgcost|цена|себест)/i;

function isUnit(value: string): value is Unit {
  return UNITS.includes(value as Unit);
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && (ch === ";" || ch === "," || ch === "\t")) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

export type NomenclatureRow = {
  name: string;
  category: string;
  unit: Unit;
  minQty: number;
  avgCost: number;
};

export function parseNomenclatureCsv(text: string): NomenclatureRow[] {
  const lines = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^#/.test(l));
  if (!lines.length) return [];

  const first = splitLine(lines[0]!).filter(Boolean);
  const hasHeader = first.some((cell) => HEADER_CELLS.test(cell));
  const body = hasHeader ? lines.slice(1) : lines;

  const rows: NomenclatureRow[] = [];
  for (const line of body) {
    const parts = splitLine(line);
    const name = (parts[0] ?? "").trim();
    if (!name || HEADER_CELLS.test(name)) continue;
    const unitRaw = (parts[2] ?? "kg").trim();
    rows.push({
      name,
      category: (parts[1] ?? "Прочее").trim() || "Прочее",
      unit: isUnit(unitRaw) ? unitRaw : "kg",
      minQty: Number(String(parts[3] ?? "").replace(",", ".")) || 0,
      avgCost: Number(String(parts[4] ?? "").replace(",", ".")) || 0,
    });
  }
  return rows;
}

export function asProductPatch(row: NomenclatureRow): Omit<Product, "id"> {
  return row;
}
