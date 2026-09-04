/**
 * Операционные сигналы владельца: food cost, списания, касса, дефицит.
 * Контракт Insight[] общий — при подключении модели меняется только реализация.
 */
import type { Insight, Snapshot } from "../domain/types";
import { TODAY } from "../domain/types";
import {
  computeKpis,
  needToBuy,
  periodStart,
  shiftTotals,
} from "../domain/engine";

export interface Advisor {
  analyze(snap: Snapshot, branchId: string | "all"): Promise<Insight[]>;
}

function localAnalyze(snap: Snapshot, branchId: string | "all"): Insight[] {
  const out: Insight[] = [];
  const week = computeKpis(snap, { period: "7d", branchId });
  const today = computeKpis(snap, { period: "today", branchId });

  if (week.foodCost > 32) {
    out.push({
      id: "food-cost-high",
      severity: "warning",
      title: "Food cost выше нормы",
      body: `За 7 дней food cost ${week.foodCost.toFixed(1)}% при ориентире 28–32%. Проверьте техкарты и закупочные цены на мясо.`,
      module: "recipes",
      branchId: branchId === "all" ? undefined : branchId,
    });
  }

  if (week.revenue > 0 && week.writeoffs / week.revenue > 0.025) {
    out.push({
      id: "writeoff-share",
      severity: "critical",
      title: "Аномальная доля списаний",
      body: `Списания ${Math.round((week.writeoffs / week.revenue) * 1000) / 10}% от выручки за неделю. Норма — до 1.5%. Смотрите акты по порче и недостачам.`,
      module: "inventory",
      branchId: branchId === "all" ? undefined : branchId,
    });
  }

  const branches = branchId === "all" ? snap.branches : snap.branches.filter((b) => b.id === branchId);
  for (const b of branches) {
    const need = needToBuy(snap, b.id);
    const urgent = need.filter((n) => n.have <= n.min * 0.4);
    if (urgent.length) {
      out.push({
        id: `stock-${b.id}`,
        severity: "warning",
        title: `Заканчивается товар · ${b.short}`,
        body: urgent.map((u) => u.product.name).slice(0, 4).join(", ") + ". Сформируйте заявку до открытия.",
        module: "procurement",
        branchId: b.id,
      });
    }

    const open = snap.shifts.find((s) => s.branchId === b.id && s.status === "open");
    if (open) {
      const t = shiftTotals(open, snap.sales);
      if (t.revenue === 0 && TODAY === open.date) {
        out.push({
          id: `shift-empty-${b.id}`,
          severity: "info",
          title: `Смена открыта без чеков · ${b.short}`,
          body: "Касса открыта, продаж ещё нет. Если кипер уже бьёт чеки — заберите Z/X-отчёт.",
          module: "shifts",
          branchId: b.id,
        });
      }
    }

    const closed = snap.shifts.filter((s) => s.branchId === b.id && s.status === "closed" && s.discrepancy);
    const bad = closed.filter((s) => Math.abs(s.discrepancy ?? 0) > 300);
    if (bad.length >= 2) {
      out.push({
        id: `cash-${b.id}`,
        severity: "warning",
        title: `Расхождения кассы · ${b.short}`,
        body: `${bad.length} смен с расхождением больше 300 ₽. Сверьте наличные с кипером и инкассацию.`,
        module: "shifts",
        branchId: b.id,
      });
    }
  }

  const southPork = snap.movements.find((m) => m.id === "wo-anomaly-south-pork");
  if (southPork && (branchId === "all" || branchId === "br-south")) {
    out.push({
      id: "pork-missing",
      severity: "critical",
      title: "Недостача свинины · Южный",
      body: "Списание 4.2 кг без акта. По объёму это не порча. Имеет смысл сверка смены повара и ревизия морозилки.",
      module: "inventory",
      branchId: "br-south",
    });
  }

  const unpaid = snap.banquets.filter(
    (b) => (b.status === "confirmed" || b.status === "inquiry") && !b.depositPaid && b.date >= TODAY,
  );
  for (const b of unpaid.slice(0, 2)) {
    out.push({
      id: `dep-${b.id}`,
      severity: "info",
      title: `Нет залога · ${b.title}`,
      body: `${b.clientName}, ${b.date}. Залог ${Math.round(b.deposit)} ₽ ещё не отмечен. Напомните до закупки продукта.`,
      module: "banquets",
      branchId: b.branchId,
    });
  }

  if (today.avgCheck && week.avgCheck && today.avgCheck < week.avgCheck * 0.85) {
    out.push({
      id: "avg-check-drop",
      severity: "info",
      title: "Средний чек ниже недели",
      body: `Сегодня средний чек заметно ниже 7-дневного. Проверьте допродажи бара и комбо.`,
      module: "sales",
      branchId: branchId === "all" ? undefined : branchId,
    });
  }

  if (week.net < 0) {
    out.push({
      id: "net-neg",
      severity: "critical",
      title: "Отрицательная прибыль за период",
      body: "Выручка не покрывает себестоимость, списания, фонд оплаты и операционные. Смотрите сравнение филиалов.",
      module: "dashboard",
    });
  }

  const cookWriteoffs = snap.movements.filter((m) => m.type === "writeoff" && m.userId === "u-cook-s");
  if (cookWriteoffs.length >= 3 && (branchId === "all" || branchId === "br-south")) {
    out.push({
      id: "cook-pattern",
      severity: "warning",
      title: "Паттерн списаний у повара",
      body: "На Южном большинство списаний закрывает один сотрудник. Это не доказательство, но повод для управляющего пройтись по актам вместе с ним.",
      module: "staff",
      branchId: "br-south",
    });
  }

  return out;
}

export function createLocalAdvisor(): Advisor {
  return {
    async analyze(snap, branchId) {
      return localAnalyze(snap, branchId);
    },
  };
}

export const advisor = createLocalAdvisor();
