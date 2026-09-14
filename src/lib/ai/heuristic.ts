import type { Insight } from "../domain/types.ts";
import type { AiProvider } from "./provider.ts";
import type { SafeMetrics } from "./safe-context.ts";
import { heuristicExplain } from "./calc.ts";

function lines(m: SafeMetrics) {
  const bits = [
    `Период ${m.period}, контур ${m.branch}.`,
    `Выручка ${m.revenue} ₽, ${m.checks} чеков, средний ${m.avgCheck} ₽.`,
    `Маржа ${m.grossMarginPct}% (${m.contribution} ₽), фудкост ${m.foodCost}%.`,
    `Списания ${m.writeoffs} ₽ (${m.writeoffSharePct}%), постоянные ${m.opex} ₽, ФОТ ${m.payroll} ₽.`,
    `Чистыми ${m.net} ₽.`,
  ];
  if (m.peakLabel) bits.push(`Пик ${m.peakLabel} · ${m.peakRevenue} ₽.`);
  if (m.topDishes[0]) bits.push(`Лидер продаж — ${m.topDishes[0].name}.`);
  if (m.stopList.length) bits.push(`На стопе: ${m.stopList.join(", ")}.`);
  if (m.foodCost > 32) bits.push("Фудкост выше ориентира 28–32%.");
  if (m.writeoffSharePct > 2.5) bits.push("Доля списаний выше нормы.");
  if (m.planTarget) bits.push(`План месяца ${m.planTarget} ₽, темп ≈ ${m.runRateMonth} ₽.`);
  return bits.join(" ");
}

export function createHeuristicProvider(): AiProvider {
  return {
    id: "heuristic",
    async narrative(metrics) {
      return lines(metrics);
    },
    async explain(task, metrics) {
      return heuristicExplain(task, metrics);
    },
    async recommend(metrics) {
      const extra: Insight[] = [];
      if (metrics.foodCost > 32) {
        extra.push({
          id: "ai-fc",
          severity: "warning",
          title: "Сжать закупку мяса",
          body: `Фудкост ${metrics.foodCost}%. Пересмотрите средневзвешенную цену и выход техкарт.`,
          module: "recipes",
        });
      }
      if (metrics.writeoffSharePct > 2.5) {
        extra.push({
          id: "ai-wo",
          severity: "warning",
          title: "Списания едят маржу",
          body: `Доля списаний ${metrics.writeoffSharePct}% от выручки. Норма до 1.5–2.5%.`,
          module: "inventory",
        });
      }
      if (metrics.peakLabel) {
        extra.push({
          id: "ai-peak",
          severity: "info",
          title: `Пик ${metrics.peakLabel}`,
          body: `На пике ${metrics.peakChecks} чеков · ${metrics.peakRevenue} ₽. Держите зал плотнее в этот час, чем на открытие.`,
          module: "shifts",
        });
      }
      if (metrics.planTarget && metrics.runRateMonth + 0.5 < metrics.planTarget) {
        extra.push({
          id: "ai-plan",
          severity: "warning",
          title: "Темп ниже плана месяца",
          body: `Факт ${metrics.monthFact} ₽, темп ≈ ${metrics.runRateMonth} при плане ${metrics.planTarget} ₽.`,
          module: "planning",
        });
      }
      if (metrics.stopList.length) {
        extra.push({
          id: "ai-stop",
          severity: "info",
          title: "Закрыть стоп-лист",
          body: `Без ${metrics.stopList[0]} теряется средний чек. Сверьте приход или перемещение.`,
          module: "inventory",
        });
      }
      if (metrics.net < 0) {
        extra.push({
          id: "ai-net",
          severity: "critical",
          title: "Отрицательная прибыль",
          body: "Выручка не покрывает себестоимость, списания, постоянные и ФОТ.",
          module: "dashboard",
        });
      }
      if (metrics.lowCover.some((r) => r.days < 3)) {
        extra.push({
          id: "ai-cover",
          severity: "warning",
          title: "Склад не дотягивает до открытия",
          body: metrics.lowCover
            .filter((r) => r.days < 3)
            .map((r) => `${r.name} (~${r.days} дн.)`)
            .join(", "),
          module: "procurement",
        });
      }
      if (metrics.abcA[0]) {
        extra.push({
          id: "ai-abc",
          severity: "info",
          title: `Класс A · ${metrics.abcA[0].name}`,
          body: `Доля ${metrics.abcA[0].sharePct}%. Не снимайте со стопа: это ядро выручки среза.`,
          module: "planning",
        });
      }
      return extra;
    },
  };
}
