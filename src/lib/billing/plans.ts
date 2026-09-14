export type TariffId = "trial" | "basic" | "mid" | "pro";

export interface TariffPlan {
  id: TariffId;
  name: string;
  price: string;
  period: string;
  image: string;
  tagline: string;
  bullets: string[];
  ai: boolean;
}

export const TARIFFS: TariffPlan[] = [
  {
    id: "trial",
    name: "Пробный",
    price: "0 ₽",
    period: "30 дней",
    image: "/marketing/trial.png",
    tagline: "Один филиал, чтобы пройти контур на своих цифрах.",
    bullets: [
      "30 дней полного доступа без счёта",
      "Один филиал, роли зала и кухни",
      "Склад, техкарты, смены, XML кипера",
      "После срока — выбрать платный тариф",
    ],
    ai: false,
  },
  {
    id: "basic",
    name: "Базовый",
    price: "4 900 ₽",
    period: "в месяц",
    image: "/marketing/basic.png",
    tagline: "Товароучёт и смена для одного кафе на r_keeper.",
    bullets: [
      "Один филиал",
      "Склад, техкарты, стоп-лист, списания",
      "Смены, касса, импорт XML кипера",
      "Банкеты и сотрудники зала",
    ],
    ai: false,
  },
  {
    id: "mid",
    name: "Средний",
    price: "9 900 ₽",
    period: "в месяц",
    image: "/marketing/mid.png",
    tagline: "Сеть из нескольких точек: закупки, ФОТ, отчёты.",
    bullets: [
      "До трёх филиалов",
      "Закупки, перемещения, ревизии",
      "ФОТ, период, PDF и CSV",
      "Кипер XML и сверка Z-отчёта",
    ],
    ai: false,
  },
  {
    id: "pro",
    name: "Профессиональный + ИИ",
    price: "19 900 ₽",
    period: "в месяц",
    image: "/marketing/pro-ai.png",
    tagline: "Вся сеть, аналитика и Очаг AI по цифрам контура.",
    bullets: [
      "Филиалы без лимита",
      "ABC, план-факт, покрытие склада",
      "Очаг AI: сводка, вопрос, рекомендации",
      "Приоритетная очередь сигналов",
    ],
    ai: true,
  },
];

export function isTariffId(value: unknown): value is TariffId {
  return value === "trial" || value === "basic" || value === "mid" || value === "pro";
}

export function tariffById(id: TariffId) {
  return TARIFFS.find((t) => t.id === id) ?? TARIFFS[0]!;
}

export const PAYMENT_SIM_BADGE = "Симуляция оплаты — боевой эквайринг подключит другой разработчик";
