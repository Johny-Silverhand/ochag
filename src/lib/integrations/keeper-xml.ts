/**
 * Parser for r_keeper 7 XML dumps / Z-reports / RK7 XML interface replies.
 * Live HTTP still needs a reachable RK7 host; this understands the shapes we
 * can actually import on Vercel (file upload and XML-interface responses).
 */
import type { KeeperReceipt } from "./keeper";

function decode(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function attr(tag: string, name: string) {
  const m =
    tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i")) ??
    tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
  return m ? decode(m[1] ?? "") : "";
}

function firstAttr(tag: string, names: string[]) {
  for (const name of names) {
    const v = attr(tag, name);
    if (v) return v;
  }
  return "";
}

function payType(raw: string): KeeperReceipt["payType"] {
  const v = raw.toLowerCase();
  if (v.includes("cash") || v.includes("нал") || v.includes("наллич") || v === "1") return "cash";
  if (v.includes("qr") || v.includes("сбп") || v.includes("sbp")) return "qr";
  if (v.includes("перевод") || v.includes("transfer") || v.includes("wire")) return "transfer";
  return "card";
}

function num(raw: string, fallback = 0) {
  const n = Number(String(raw).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** RK7 XML interface often stores qty in 1/1000 and money in kopecks. File dumps use pieces and rubles. */
export function normalizeRk7Units(qty: number, sum: number): { qty: number; sum: number } {
  let q = qty;
  let s = sum;
  const thousandths = q >= 100 && Math.abs(q % 1000) < 0.001;
  if (thousandths) q = q / 1000;
  if (thousandths && s >= 10000 && Number.isInteger(s)) s = s / 100;
  return { qty: q > 0 ? q : 1, sum: s };
}

function itemFromTag(tag: string): KeeperReceipt["items"][number] | null {
  const name =
    firstAttr(tag, ["name", "Name", "NAME", "code", "Code"]) ||
    decode((tag.match(/>([^<]+)</)?.[1] ?? "").trim());
  if (!name && !firstAttr(tag, ["qty", "quantity", "Quantity", "amount", "sum"])) return null;
  const rawQty = num(firstAttr(tag, ["qty", "quantity", "Quantity", "count", "Count"]), 1);
  const rawSum = num(firstAttr(tag, ["sum", "amount", "Amount", "SUM", "price"]));
  const units = normalizeRk7Units(rawQty, rawSum);
  return {
    name: name || "Блюдо",
    qty: units.qty,
    sum: units.sum || 0,
  };
}

function payFromBlock(block: string): KeeperReceipt["payType"] {
  const payTag =
    block.match(/<Pay\b[^>]*\/?>/i)?.[0] ??
    block.match(/<PAY\b[^>]*\/?>/i)?.[0] ??
    block.match(/<Payment\b[^>]*\/?>/i)?.[0] ??
    "";
  const fromChild = firstAttr(payTag, ["type", "Type", "name", "Name", "paytype", "code"]);
  const open = block.match(/<(Receipt|Check|CHECK|Order)\b[^>]*>/i)?.[0] ?? "";
  return payType(fromChild || firstAttr(open, ["pay", "paytype", "type", "PayType", "paid"]));
}

function datetimeOf(open: string) {
  const date = firstAttr(open, ["datetime", "date", "Date", "closedatetime", "CreateTime"]);
  const time = firstAttr(open, ["time", "Time"]);
  if (date && time && !date.includes("T")) return `${date}T${time}`;
  return date || new Date().toISOString();
}

function blocksOf(xml: string, tag: string) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  return xml.match(re) ?? [];
}

function parseBlock(block: string, fallbackNumber: string): KeeperReceipt | null {
  const open = block.match(/<(Receipt|Check|CHECK|Order)\b[^>]*>/i)?.[0] ?? "";
  const itemTags = [
    ...(block.match(/<Item\b[^>]*\/?>/gi) ?? []),
    ...(block.match(/<ITEM\b[^>]*\/?>/gi) ?? []),
    ...(block.match(/<Dish\b[^>]*\/?>/gi) ?? []),
    ...(block.match(/<DISH\b[^>]*\/?>/gi) ?? []),
    ...(block.match(/<(Item|Dish|ITEM|DISH)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? []),
  ];
  const seen = new Set<string>();
  const items: KeeperReceipt["items"] = [];
  for (const tag of itemTags) {
    const key = tag.slice(0, 180);
    if (seen.has(key)) continue;
    seen.add(key);
    const item = itemFromTag(tag);
    if (item) items.push(item);
  }
  if (items.length === 0) return null;
  const rawSum = num(firstAttr(open, ["sum", "amount", "Amount", "SUM"]));
  const sum = rawSum > 0 ? normalizeRk7Units(1, rawSum).sum : items.reduce((s, i) => s + i.sum, 0);
  return {
    number:
      firstAttr(open, ["number", "code", "Code", "orderName", "Visit", "guid", "id"]) || fallbackNumber,
    datetime: datetimeOf(open),
    sum,
    payType: payFromBlock(block),
    items,
  };
}

export function parseKeeperXml(xml: string): KeeperReceipt[] {
  const text = xml.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const receipts: KeeperReceipt[] = [];
  const chunks = [
    ...blocksOf(text, "Receipt"),
    ...blocksOf(text, "Check"),
    ...blocksOf(text, "CHECK"),
    ...blocksOf(text, "Order"),
  ];
  const unique = [...new Set(chunks)];
  for (const block of unique) {
    const row = parseBlock(block, `K-${receipts.length + 1}`);
    if (row) receipts.push(row);
  }
  return receipts;
}

export const SAMPLE_KEEPER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <Command>
    <ZReport date="2026-09-02" cash="860" card="1380">
      <Receipt number="K-9001" datetime="2026-09-02T14:10:00" pay="card" sum="1380">
        <Item name="Шашлык из свинины" qty="2" sum="1380"/>
      </Receipt>
      <Receipt number="K-9002" datetime="2026-09-02T14:22:00" pay="cash" sum="860">
        <Item name="Курица на гриле" qty="1" sum="490"/>
        <Item name="Салат свежий" qty="1" sum="250"/>
        <Item name="Лаваш" qty="1" sum="70"/>
        <Item name="Газировка 0.5" qty="1" sum="50"/>
      </Receipt>
    </ZReport>
  </Command>
</RK7Query>
`;

export const SAMPLE_RK7_CHECK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<RK7QueryResult Status="Ok">
  <Check number="45" date="2026-09-14" time="18:10:00" sum="1380">
    <Dish name="Шашлык из свинины" quantity="2" amount="1380"/>
    <Pay type="card" amount="1380"/>
  </Check>
  <Check number="46" date="2026-09-14" time="18:22:00" sum="860">
    <Dish name="Курица на гриле" quantity="1" amount="860"/>
    <Pay type="нал" amount="860"/>
  </Check>
</RK7QueryResult>
`;
