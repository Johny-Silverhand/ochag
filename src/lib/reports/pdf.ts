import PDFDocument from "pdfkit";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_NAME, DOWNLOAD_SLUG } from "../brand.ts";
import type { Banquet, Snapshot } from "../domain/types";

function fontCandidates() {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(here, "fonts/DejaVuSans.ttf"),
    join(process.cwd(), "src/lib/reports/fonts/DejaVuSans.ttf"),
    join(process.cwd(), "public/fonts/DejaVuSans.ttf"),
    join(process.cwd(), "fonts/DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ];
}

function fontBuffer(): Buffer | null {
  for (const p of fontCandidates()) {
    try {
      if (existsSync(p)) return readFileSync(p);
    } catch {
      /* next */
    }
  }
  try {
    return readFileSync(new URL("./fonts/DejaVuSans.ttf", import.meta.url));
  } catch {
    return null;
  }
}

function pdfBuffer(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const font = fontBuffer();
    if (!font) {
      reject(new Error("Нет шрифта с кириллицей — PDF сейчас собрать нельзя. Обратитесь к администратору контура."));
      return;
    }
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => {
      reject(new Error(`Не удалось собрать PDF: ${err instanceof Error ? err.message : "ошибка записи"}`));
    });
    try {
      const fontName = "DejaVuSans";
      doc.registerFont(fontName, font);
      doc.font(fontName);
      draw(doc);
      doc.end();
    } catch (err) {
      reject(new Error(`Не удалось собрать PDF: ${err instanceof Error ? err.message : "ошибка шрифта"}`));
    }
  });
}

export function pdfBytesToBase64(bytes: Buffer | Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

export async function banquetPdf(snap: Snapshot, banquet: Banquet, sheet: "guest" | "waiter" | "cook" | "grill") {
  const branch = snap.branches.find((b) => b.id === banquet.branchId);
  const spec = {
    guest: { title: "Банкетный лист", lines: [...banquet.grillItems, ...banquet.kitchenItems, ...banquet.serviceItems], notes: banquet.notes },
    waiter: { title: "Лист официанта", lines: banquet.serviceItems, notes: banquet.waiterNotes },
    cook: { title: "Лист кухни", lines: banquet.kitchenItems, notes: banquet.kitchenNotes },
    grill: { title: "Лист шашлычника", lines: banquet.grillItems, notes: banquet.grillNotes },
  }[sheet];

  const buf = await pdfBuffer((doc) => {
    doc.fontSize(11).fillColor("#17352b").text(APP_NAME, { align: "left" });
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
  return { filename: `${DOWNLOAD_SLUG}-banquet-${banquet.number}-${sheet}.pdf`, bytes: buf };
}

export async function periodPdf(snap: Snapshot, label: string, body: string[]) {
  const buf = await pdfBuffer((doc) => {
    doc.fontSize(11).fillColor("#17352b").text(`${APP_NAME} · отчёт периода`);
    doc.moveDown(0.2);
    doc.fontSize(18).fillColor("#111").text(label);
    doc.moveDown();
    doc.fontSize(11).fillColor("#222");
    for (const line of body) doc.text(line);
  });
  return { filename: `${DOWNLOAD_SLUG}-report-${label}.pdf`, bytes: buf };
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
  return { filename: `${DOWNLOAD_SLUG}-revision-${rev.date}.pdf`, bytes: buf };
}

export function transferLegs(snap: Snapshot, refId: string) {
  const id = refId.trim();
  if (!id) throw new Error("Накладная не найдена");
  const legs = snap.movements.filter((m) => m.type === "transfer" && m.refId === id);
  if (!legs.length) throw new Error("Накладная не найдена");
  return legs.slice().sort((a, b) => a.qty - b.qty);
}

export async function transferWaybillPdf(snap: Snapshot, refId: string) {
  const legs = transferLegs(snap, refId);
  const out = legs.find((m) => m.qty < 0) ?? legs[0]!;
  const inn = legs.find((m) => m.qty > 0);
  const from = snap.branches.find((b) => b.id === out.branchId);
  const to = snap.branches.find((b) => b.id === (inn?.branchId ?? out.counterpartBranchId));
  const product = snap.products.find((p) => p.id === out.productId);
  const user = snap.users.find((u) => u.id === out.userId);
  const buf = await pdfBuffer((doc) => {
    doc.fontSize(11).fillColor("#17352b").text(`${APP_NAME} · внутренняя накладная`);
    doc.moveDown(0.3);
    doc.fontSize(18).fillColor("#111").text("Перемещение между филиалами");
    doc.fontSize(12).fillColor("#222");
    doc.text(`№ ${out.refId}`);
    doc.text(`Дата: ${out.at.slice(0, 16).replace("T", " ")}`);
    doc.text(`Откуда: ${from?.name ?? out.branchId}`);
    doc.text(`Куда: ${to?.name ?? inn?.branchId ?? out.counterpartBranchId ?? "—"}`);
    doc.text(`Кто провёл: ${user?.name ?? out.userId}`);
    doc.moveDown();
    doc.fontSize(11);
    doc.text(
      `${product?.name ?? out.productId}  —  ${Math.abs(out.qty)} ${product?.unit ?? ""}  ·  ${Math.round(out.cost)} ₽`,
    );
    if (out.note) {
      doc.moveDown();
      doc.fontSize(10).fillColor("#444").text(out.note);
    }
  });
  return { filename: `${DOWNLOAD_SLUG}-waybill-${out.refId}.pdf`, bytes: buf };
}

export async function ttkPdf(snap: Snapshot, recipeId: string) {
  const recipe = snap.recipes.find((r) => r.id === recipeId);
  if (!recipe) throw new Error("Техкарта не найдена");
  const buf = await pdfBuffer((doc) => {
    doc.fontSize(11).fillColor("#17352b").text(`${APP_NAME} · технологическая карта`);
    doc.moveDown(0.3);
    doc.fontSize(18).fillColor("#111").text(recipe.name);
    doc.fontSize(12).fillColor("#222");
    doc.text(`Категория: ${recipe.category}`);
    doc.text(`Выход: ${recipe.yieldPortions} порц.${recipe.outputGrams ? ` · ${recipe.outputGrams} г` : ""}`);
    if (recipe.shelfLifeHours) doc.text(`Срок реализации: ${recipe.shelfLifeHours} ч`);
    doc.text(`Цена: ${recipe.price} ₽`);
    doc.moveDown();
    doc.fontSize(12).fillColor("#17352b").text("Норма закладки");
    doc.fontSize(11).fillColor("#222");
    for (const line of recipe.items) {
      const p = snap.products.find((x) => x.id === line.productId);
      doc.text(`${p?.name ?? line.productId}  —  ${line.qty} ${p?.unit ?? ""}`);
    }
    if (recipe.techProcess?.trim()) {
      doc.moveDown();
      doc.fontSize(12).fillColor("#17352b").text("Технология");
      doc.fontSize(11).fillColor("#222").text(recipe.techProcess.trim());
    }
  });
  return { filename: `${DOWNLOAD_SLUG}-ttk-${recipe.id}.pdf`, bytes: buf };
}

export function csvEscape(value: string | number) {
  const s = String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]) {
  const bom = "\uFEFF";
  return bom + [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
}
