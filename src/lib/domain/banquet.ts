import type { Banquet, BanquetLine } from "./types.ts";
import { DEFAULT_HALL } from "./types.ts";

function minutesFrom(hhmm: string, delta: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, (h || 0) * 60 + (m || 0) + delta);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function qty(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export type BanquetKit = {
  grillItems: BanquetLine[];
  kitchenItems: BanquetLine[];
  serviceItems: BanquetLine[];
  timeline: { time: string; action: string }[];
};

/** Per-guest kit. Counts are suggestions — the card may override every line. */
export function autoBanquetKit(input: { guests: number; startTime: string }): BanquetKit {
  const guests = Math.max(0, Math.round(input.guests) || 0);
  const start = /^\d{2}:\d{2}$/.test(input.startTime) ? input.startTime : "18:00";
  const grillKg = qty(guests * 0.25, 2);
  return {
    grillItems: [
      { name: "Шашлык свинина", qty: grillKg, unit: "кг", readyBy: minutesFrom(start, 30) },
      { name: "Овощи гриль", qty: qty(guests * 0.08, 2), unit: "кг", readyBy: minutesFrom(start, 20) },
    ],
    kitchenItems: [
      { name: "Салат свежий", qty: guests, unit: "порц", readyBy: minutesFrom(start, -20) },
      { name: "Хлеб / лаваш", qty: Math.max(guests, 1), unit: "шт", readyBy: minutesFrom(start, -10) },
    ],
    serviceItems: [
      { name: "Приборы", qty: guests, unit: "шт" },
      { name: "Бокалы", qty: guests, unit: "шт" },
      { name: "Салфетки", qty: guests, unit: "шт" },
    ],
    timeline: [
      { time: minutesFrom(start, -120), action: "Зал и сервировка" },
      { time: minutesFrom(start, -40), action: "Кухня: холодные заготовки" },
      { time: minutesFrom(start, -20), action: "Мангал: выход на жар" },
      { time: start, action: "Встреча гостей" },
    ],
  };
}

export function applyBanquetKit(banquet: Banquet, kit: BanquetKit): Banquet {
  return {
    ...banquet,
    grillItems: kit.grillItems.map((row) => ({ ...row })),
    kitchenItems: kit.kitchenItems.map((row) => ({ ...row })),
    serviceItems: kit.serviceItems.map((row) => ({ ...row })),
    timeline: kit.timeline.map((row) => ({ ...row })),
  };
}

export function withDefaultHall(hall: string | undefined): string {
  const trimmed = hall?.trim();
  return trimmed || DEFAULT_HALL;
}

export function emptyBanquetLine(): BanquetLine {
  return { name: "", qty: 1, unit: "порц" };
}

export function upsertBanquetLine(items: BanquetLine[], index: number, patch: Partial<BanquetLine>): BanquetLine[] {
  const next = items.map((row) => ({ ...row }));
  if (index < 0 || index >= next.length) {
    next.push({ ...emptyBanquetLine(), ...patch });
    return next;
  }
  next[index] = { ...next[index]!, ...patch };
  return next;
}

export function removeBanquetLine(items: BanquetLine[], index: number): BanquetLine[] {
  return items.filter((_, i) => i !== index);
}
