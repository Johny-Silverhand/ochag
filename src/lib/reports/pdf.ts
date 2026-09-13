/** Server PDF is stubbed. Real renderer comes later; CSV already works in UI. */

export interface PdfStub {
  ok: true;
  stub: true;
  filename: string;
  mime: "application/pdf";
  note: string;
}

export function stubPeriodPdf(label: string): PdfStub {
  return {
    ok: true,
    stub: true,
    filename: `ochag-${label}.pdf`,
    mime: "application/pdf",
    note: "Серверный PDF не включён в эту волну. Выгрузка CSV на странице «Отчёты» работает.",
  };
}
