import type { Insight } from "../domain/types";
import type { AiProvider } from "./provider";
import type { SafeMetrics } from "./safe-context";

function lines(m: SafeMetrics) {
  const bits = [
    `Период ${m.period}, контур ${m.branch}.`,
    `Выручка ${m.revenue} ₽, ${m.checks} чеков, средний ${m.avgCheck} ₽.`,
    `Фудкост ${m.foodCost}% (себест. ${m.cogs} ₽).`,
    `Списания ${m.writeoffs} ₽, постоянные ${m.opex} ₽, ФОТ ${m.payroll} ₽.`,
    `Чистыми ${m.net} ₽.`,
  ];
  if (m.topDishes[0]) bits.push(`Лидер продаж — ${m.topDishes[0].name}.`);
  if (m.stopList.length) bits.push(`На стопе: ${m.stopList.join(", ")}.`);
  if (m.foodCost > 32) bits.push("Фудкост выше ориентира 28–32%.");
  if (m.revenue > 0 && m.writeoffs / m.revenue > 0.025) bits.push("Доля списаний выше нормы.");
  return bits.join(" ");
}

export function createHeuristicProvider(): AiProvider {
  return {
    id: "heuristic",
    async narrative(metrics) {
      return lines(metrics);
    },
    async ask(question, metrics) {
      const q = question.toLowerCase();
      if (q.includes("фудкост") || q.includes("food")) {
        return `Фудкост ${metrics.foodCost}% при выручке ${metrics.revenue} ₽ и себестоимости ${metrics.cogs} ₽. Считается как COGS / выручка, COGS — сумма cost_at_sale.`;
      }
      if (q.includes("касс") || q.includes("нал")) {
        return `Наличные за период ${metrics.cash} ₽. Ожидаемая касса смены = размен + нал по чекам.`;
      }
      if (q.includes("прибыл") || q.includes("чистыми")) {
        return `Чистая прибыль ${metrics.net} ₽ = выручка − себестоимость − списания − постоянные − ФОТ.`;
      }
      if (q.includes("стоп")) {
        return metrics.stopList.length
          ? `Сейчас на стопе: ${metrics.stopList.join(", ")}.`
          : "Стоп-лист пуст.";
      }
      return `${lines(metrics)} Вопрос: «${question}».`;
    },
    async recommend(metrics) {
      const extra: Insight[] = [];
      if (metrics.foodCost > 32) {
        extra.push({
          id: "ai-fc",
          severity: "warning",
          title: "Сжать закупку мяса",
          body: `Фудкост ${metrics.foodCost}%. Пересмотрите средневзвешенную цену шеи и выход шашлыка.`,
          module: "recipes",
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
      return extra;
    },
  };
}
