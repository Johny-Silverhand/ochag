/**
 * Stub parser for an r_keeper 7 XML dump / Z-report.
 * Live RK7 is out of scope — this only understands a small documented subset.
 */
import type { KeeperReceipt } from "./keeper";

function decode(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i")) ?? tag.match(new RegExp(`${name}='([^']*)'`, "i"));
  return m ? decode(m[1] ?? "") : "";
}

function payType(raw: string): KeeperReceipt["payType"] {
  const v = raw.toLowerCase();
  if (v.includes("cash") || v.includes("нал")) return "cash";
  if (v.includes("qr")) return "qr";
  return "card";
}

export function parseKeeperXml(xml: string): KeeperReceipt[] {
  const receipts: KeeperReceipt[] = [];
  const blocks = xml.match(/<Receipt\b[^>]*>[\s\S]*?<\/Receipt>/gi) ?? [];
  for (const block of blocks) {
    const open = block.match(/<Receipt\b[^>]*>/i)?.[0] ?? "";
    const items: KeeperReceipt["items"] = [];
    const itemTags = block.match(/<Item\b[^>]*\/?>/gi) ?? [];
    for (const tag of itemTags) {
      const qty = Number(attr(tag, "qty") || attr(tag, "quantity") || 1);
      const sum = Number(attr(tag, "sum") || attr(tag, "amount") || 0);
      items.push({
        name: attr(tag, "name") || "Блюдо",
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        sum: Number.isFinite(sum) ? sum : 0,
      });
    }
    const sum = Number(attr(open, "sum") || items.reduce((s, i) => s + i.sum, 0));
    receipts.push({
      number: attr(open, "number") || attr(open, "code") || `K-${receipts.length + 1}`,
      datetime: attr(open, "datetime") || attr(open, "date") || new Date().toISOString(),
      sum,
      payType: payType(attr(open, "pay") || attr(open, "paytype") || attr(open, "type")),
      items,
    });
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
