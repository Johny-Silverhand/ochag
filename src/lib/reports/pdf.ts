import PDFDocument from "pdfkit";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Banquet, Snapshot } from "../domain/types";

function fontPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "fonts/DejaVuSans.ttf"),
    join(process.cwd(), "src/lib/reports/fonts/DejaVuSans.ttf"),
    join(process.cwd(), "public/fonts/DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
  return candidates.find((p) => existsSync(p));
}

function pdfBuffer(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const font = fontPath();
    if (!font) {
      reject(new Error("Нет DejaVuSans.ttf — PDF с кириллицей недоступен. Положите шрифт в public/fonts."));
      return;
    }
    doc.font(font);
    draw(doc);
    doc.end();
  });
}

export async function banquetPdf(snap: Snapshot, banquet: Banquet, sheet: "guest" | "waiter" | "cook" | "grill") {
  const branch = snap.branches.find((b) => b.id === banquet.branchId);
  const spec = {
    guest: { title: "Банкетный лист", lines: [...banquet.grillItems, ...banquet.kitchenItems, ...banquet.serviceItems], notes: banquet.notes },
    waiter: { title: "Лист официанта", lines: banquet.serviceItems, notes: banquet.waiterNotes },
    cook: { title: "Лист кухни", lines: banquet.kitchenItems, notes: banquet.notes },
    grill: { title: "Лист шашлычника", lines: banquet.grillItems, notes: "" },
  }[sheet];

  const buf = await pdfBuffer((doc) => {
    doc.fontSize(11).fillColor("#17352b").text("Очаг · Victimok Labs", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(20).text(spec.title);
    doc.fontSize(12).fillColor("#222").text(`${banquet.number} · ${banquet.title}`);
    doc.text(`${branch?.name ?? ""} · ${banquet.date} ${banquet.startTime}–${banquet.endTime}`);
    doc.text(`Гостей: ${banquet.guests} · Зал: ${banquet.hall}`);
    doc.text(`Клиент: ${banquet.clientName}  ${banquet.clientPhone}`);
    doc.moveDown();
    doc.fontSize(11);
    for (const line of spec.lines) {
      doc.text(`${line.name}  —  ${line.qty} ${line.unit}${line.readyBy ? `  к ${line.readyBy}` : ""}`);
    }
    if (spec.notes) {
      doc.moveDown();
      doc.fontSize(10).fillColor("#444").text(spec.notes);
    }
    if (banquet.timeline.length) {
      doc.moveDown();
      doc.fillColor("#17352b").text("Тайминг");
      doc.fillColor("#222");
      for (const t of banquet.timeline) doc.text(`${t.time}  ${t.action}`);
    }
  });
  return { filename: `ochag-banquet-${banquet.number}-${sheet}.pdf`, bytes: buf };
}

export async function periodPdf(snap: Snapshot, label: string, body: string[]) {
  const buf = await pdfBuffer((doc) => {
    doc.fontSize(11).fillColor("#17352b").text("Очаг · отчёт периода");
    doc.moveDown(0.2);
    doc.fontSize(18).fillColor("#111").text(label);
    doc.moveDown();
    doc.fontSize(11).fillColor("#222");
    for (const line of body) doc.text(line);
  });
  return { filename: `ochag-report-${label}.pdf`, bytes: buf };
}

export async function revisionActPdf(snap: Snapshot, revisionId: string) {
  const rev = snap.revisions.find((r) => r.id === revisionId);
  if (!rev) throw new Error("Ревизия не найдена");
  const branch = snap.branches.find((b) => b.id === rev.branchId);
  const buf = await pdfBuffer((doc) => {
    doc.fontSize(18).text("Акт ревизии");
    doc.fontSize(11).text(`${branch?.name ?? rev.branchId} · ${rev.date}`);
    doc.text(rev.note ?? "");
    doc.moveDown();
    for (const line of rev.lines) {
      const p = snap.products.find((x) => x.id === line.productId);
      const delta = line.factQty - line.bookQty;
      doc.text(`${p?.name ?? line.productId}: книга ${line.bookQty} / факт ${line.factQty} (${delta >= 0 ? "+" : ""}${delta})`);
    }
  });
  return { filename: `ochag-revision-${rev.date}.pdf`, bytes: buf };
}

export function csvEscape(value: string | number) {
  const s = String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]) {
  const bom = "\uFEFF";
  return bom + [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
}
