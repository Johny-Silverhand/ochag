import type { SafeMetrics } from "./safe-context.ts";
import { roundMoney } from "../domain/finance.ts";

export const CALC_TASKS = ["margin", "forecast", "shift", "cover"] as const;
export type CalcTask = (typeof CALC_TASKS)[number];

export function isCalcTask(value: unknown): value is CalcTask {
  return typeof value === "string" && (CALC_TASKS as readonly string[]).includes(value);
}

export function marginOf(m: SafeMetrics) {
  const contribution = roundMoney(m.contribution);
  return {
    contribution,
    grossMarginPct: m.grossMarginPct,
    foodCost: m.foodCost,
    writeoffSharePct: m.writeoffSharePct,
    net: m.net,
  };
}

export function forecastOf(m: SafeMetrics) {
  const gap = roundMoney(m.planTarget - m.runRateMonth);
  return {
    month: m.month,
    planTarget: m.planTarget,
    monthFact: m.monthFact,
    daysElapsed: m.daysElapsed,
    daysInMonth: m.daysInMonth,
    runRateMonth: m.runRateMonth,
    gap,
    onPace: m.planTarget <= 0 ? null : m.runRateMonth + 0.5 >= m.planTarget,
  };
}

export function shiftPlanOf(m: SafeMetrics) {
  return {
    peakHour: m.peakHour,
    peakLabel: m.peakLabel,
    peakRevenue: m.peakRevenue,
    peakChecks: m.peakChecks,
    avgCheck: m.avgCheck,
    itemsPerCheck: m.itemsPerCheck,
    busyHours: m.busyHours,
    openShifts: m.openShifts,
  };
}

export function coverOf(m: SafeMetrics) {
  return {
    lowCover: m.lowCover,
    criticalCount: m.lowCover.filter((r) => r.days < 3).length,
    abcA: m.abcA,
  };
}

export function calcSnapshot(task: CalcTask, m: SafeMetrics) {
  if (task === "margin") return marginOf(m);
  if (task === "forecast") return forecastOf(m);
  if (task === "shift") return shiftPlanOf(m);
  return coverOf(m);
}

/** Formula text — used when Ollama is off/down. Not a model. */
export function heuristicExplain(task: CalcTask, m: SafeMetrics) {
  if (task === "margin") {
    const bits = [
      `Маржа (выручка − себест.) ${m.grossMarginPct}% · ${m.contribution} ₽ при выручке ${m.revenue} ₽.`,
      `Фудкост ${m.foodCost}% (ориентир 28–32%).`,
      `Списания ${m.writeoffSharePct}% от выручки.`,
      `Чистыми ${m.net} ₽ после ФОТ ${m.payroll} ₽ и постоянных ${m.opex} ₽.`,
    ];
    if (m.foodCost > 32) bits.push("Резать закупку или выход техкарт — фудкост выше коридора.");
    if (m.writeoffSharePct > 2.5) bits.push("Доля списаний выше 2.5% — смотрите акты порчи.");
    return bits.join(" ");
  }
  if (task === "forecast") {
    const f = forecastOf(m);
    const bits = [
      `Месяц ${m.month}: факт ${m.monthFact} ₽ за ${m.daysElapsed} из ${m.daysInMonth} дней.`,
      m.planTarget
        ? `План ${m.planTarget} ₽. Темп до конца месяца ≈ ${m.runRateMonth} ₽ (${f.onPace ? "в темпе" : `разрыв ${f.gap} ₽`}).`
        : "План месяца не задан в аналитике — темп считается от факта.",
    ];
    if (f.onPace === false) bits.push("Чтобы закрыть план, нужен более плотный зал в оставшиеся дни или допродажи бара.");
    return bits.join(" ");
  }
  if (task === "cover") {
    const bits: string[] = [];
    if (!m.lowCover.length) {
      bits.push("По покрытию критичных позиций нет: расход и остатки в норме или мало движений.");
    } else {
      bits.push(
        `Риск покрытия: ${m.lowCover.map((r) => `${r.name} (~${r.days} дн.)`).join(", ")}.`,
      );
      if (m.lowCover.some((r) => r.days < 3)) bits.push("Позиции меньше 3 дней — заявка до открытия.");
    }
    if (m.abcA.length) {
      bits.push(`Класс A: ${m.abcA.map((r) => r.name).join(", ")} — не снимайте со стопа.`);
    }
    return bits.join(" ");
  }
  const hours =
    m.busyHours.length > 0
      ? m.busyHours.map((h) => `${h.label} (${h.checks} чек.)`).join(", ")
      : "нет чеков";
  const bits = [
    `Средний чек ${m.avgCheck} ₽ · ${m.itemsPerCheck} поз. на чек.`,
    m.peakLabel ? `Пик по Москве ${m.peakLabel} · ${m.peakRevenue} ₽ · ${m.peakChecks} чеков.` : "Пика нет — мало чеков.",
    `Плотные часы: ${hours}.`,
  ];
  if (m.peakHour != null && m.peakHour >= 18) bits.push("На вечерний пик держите больше зала, чем на открытие.");
  else if (m.peakHour != null && m.peakHour >= 12 && m.peakHour < 16) bits.push("Обед плотнее вечера — смену зала лучше смещать к 12:00.");
  if (m.openShifts) bits.push(`Сейчас открытых смен: ${m.openShifts}.`);
  return bits.join(" ");
}
