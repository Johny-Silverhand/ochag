import { addDays, parseDay } from "../format";
import type {
  Banquet,
  Branch,
  Expense,
  Invoice,
  PayrollAccrual,
  Product,
  Recipe,
  Sale,
  Shift,
  Snapshot,
  StaffUser,
  StockLevel,
  StockMovement,
} from "../domain/types";
import { TODAY } from "../domain/types";
import { applyMovement, deductSaleFromStock, payrollForShift, shiftTotals } from "../domain/engine";

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260902);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)] as T;
const between = (a: number, b: number) => a + rng() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));

export const BRANCHES: Branch[] = [
  {
    id: "br-pushkin",
    name: "Очаг на Пушкина",
    short: "Пушкина",
    city: "Краснодар",
    address: "ул. Пушкина, 18",
    seats: 48,
    phone: "+7 861 200-11-18",
  },
  {
    id: "br-south",
    name: "Очаг Южный",
    short: "Южный",
    city: "Краснодар",
    address: "ул. Зиповская, 5",
    seats: 36,
    phone: "+7 861 200-11-05",
  },
  {
    id: "br-embank",
    name: "Очаг Набережная",
    short: "Набережная",
    city: "Краснодар",
    address: "ул. Кубанская наб., 2",
    seats: 72,
    phone: "+7 861 200-11-02",
  },
];

export const USERS: StaffUser[] = [
  {
    id: "u-owner",
    name: "Кирилл Сорокин",
    email: "owner",
    password: "ochag",
    role: "owner",
    position: "Собственник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "+7 918 000-00-01",
  },
  {
    id: "u-mgr-p",
    name: "Анна Лебедева",
    email: "manager",
    password: "ochag",
    role: "manager",
    position: "Управляющий",
    branchId: "br-pushkin",
    shiftPay: 4500,
    salesPercent: 0,
    phone: "+7 918 000-00-02",
  },
  {
    id: "u-mgr-s",
    name: "Павел Орлов",
    email: "manager.south",
    password: "ochag",
    role: "manager",
    position: "Управляющий",
    branchId: "br-south",
    shiftPay: 4200,
    salesPercent: 0,
    phone: "+7 918 000-00-03",
  },
  {
    id: "u-mgr-e",
    name: "Мария Ким",
    email: "manager.emb",
    password: "ochag",
    role: "manager",
    position: "Управляющий",
    branchId: "br-embank",
    shiftPay: 4800,
    salesPercent: 0,
    phone: "+7 918 000-00-04",
  },
  {
    id: "u-cook-p",
    name: "Денис Жуков",
    email: "cook",
    password: "ochag",
    role: "cook",
    position: "Шеф-повар",
    branchId: "br-pushkin",
    shiftPay: 3800,
    salesPercent: 0,
    phone: "+7 918 000-00-05",
  },
  {
    id: "u-grill-p",
    name: "Игорь Савельев",
    email: "grill",
    password: "ochag",
    role: "cook",
    position: "Шашлычник",
    branchId: "br-pushkin",
    shiftPay: 3600,
    salesPercent: 0,
    phone: "+7 918 000-00-06",
  },
  {
    id: "u-cook-s",
    name: "Роман Белов",
    email: "cook.south",
    password: "ochag",
    role: "cook",
    position: "Повар",
    branchId: "br-south",
    shiftPay: 3400,
    salesPercent: 0,
    phone: "+7 918 000-00-07",
  },
  {
    id: "u-wait-p",
    name: "Алина Петрова",
    email: "waiter",
    password: "ochag",
    role: "waiter",
    position: "Официант",
    branchId: "br-pushkin",
    shiftPay: 2200,
    salesPercent: 3,
    phone: "+7 918 000-00-08",
  },
  {
    id: "u-wait-p2",
    name: "Никита Волков",
    email: "waiter2",
    password: "ochag",
    role: "waiter",
    position: "Официант",
    branchId: "br-pushkin",
    shiftPay: 2200,
    salesPercent: 3,
    phone: "+7 918 000-00-09",
  },
  {
    id: "u-wait-s",
    name: "Елена Кравец",
    email: "waiter.south",
    password: "ochag",
    role: "waiter",
    position: "Официант",
    branchId: "br-south",
    shiftPay: 2100,
    salesPercent: 3,
    phone: "+7 918 000-00-10",
  },
  {
    id: "u-wait-e",
    name: "Дарья Новикова",
    email: "waiter.emb",
    password: "ochag",
    role: "waiter",
    position: "Официант",
    branchId: "br-embank",
    shiftPay: 2300,
    salesPercent: 3,
    phone: "+7 918 000-00-11",
  },
  {
    id: "u-grill-e",
    name: "Артём Шилов",
    email: "grill.emb",
    password: "ochag",
    role: "cook",
    position: "Шашлычник",
    branchId: "br-embank",
    shiftPay: 3700,
    salesPercent: 0,
    phone: "+7 918 000-00-12",
  },
];

export const PRODUCTS: Product[] = [
  { id: "prd-pork", name: "Свиная шея", category: "Мясо", unit: "kg", minQty: 18, avgCost: 420 },
  { id: "prd-beef", name: "Говядина лопатка", category: "Мясо", unit: "kg", minQty: 10, avgCost: 780 },
  { id: "prd-chicken", name: "Курица бедро", category: "Мясо", unit: "kg", minQty: 14, avgCost: 265 },
  { id: "prd-lamb", name: "Баранина", category: "Мясо", unit: "kg", minQty: 6, avgCost: 820 },
  { id: "prd-onion", name: "Лук репчатый", category: "Овощи", unit: "kg", minQty: 10, avgCost: 42 },
  { id: "prd-tomato", name: "Помидоры", category: "Овощи", unit: "kg", minQty: 8, avgCost: 155 },
  { id: "prd-cucumber", name: "Огурцы", category: "Овощи", unit: "kg", minQty: 6, avgCost: 140 },
  { id: "prd-potato", name: "Картофель", category: "Овощи", unit: "kg", minQty: 25, avgCost: 36 },
  { id: "prd-pepper", name: "Перец болгарский", category: "Овощи", unit: "kg", minQty: 5, avgCost: 210 },
  { id: "prd-greens", name: "Зелень (кинза/укроп)", category: "Овощи", unit: "kg", minQty: 2, avgCost: 360 },
  { id: "prd-garlic", name: "Чеснок", category: "Овощи", unit: "kg", minQty: 1.2, avgCost: 240 },
  { id: "prd-oil", name: "Масло подсолнечное", category: "Бакалея", unit: "l", minQty: 8, avgCost: 135 },
  { id: "prd-rice", name: "Рис", category: "Бакалея", unit: "kg", minQty: 8, avgCost: 92 },
  { id: "prd-salt", name: "Соль / специи", category: "Бакалея", unit: "kg", minQty: 2, avgCost: 95 },
  { id: "prd-tkemali", name: "Ткемали", category: "Соусы", unit: "l", minQty: 3, avgCost: 310 },
  { id: "prd-adjika", name: "Аджика", category: "Соусы", unit: "kg", minQty: 2, avgCost: 280 },
  { id: "prd-lavash", name: "Лаваш", category: "Хлеб", unit: "шт", minQty: 40, avgCost: 28 },
  { id: "prd-bread", name: "Хлеб деревенский", category: "Хлеб", unit: "шт", minQty: 16, avgCost: 48 },
  { id: "prd-cola", name: "Газировка", category: "Напитки", unit: "l", minQty: 24, avgCost: 85 },
  { id: "prd-beer", name: "Пиво разливное", category: "Напитки", unit: "l", minQty: 28, avgCost: 155 },
  { id: "prd-vodka", name: "Водка", category: "Бар", unit: "l", minQty: 4, avgCost: 780 },
  { id: "prd-wine", name: "Вино красное", category: "Бар", unit: "l", minQty: 6, avgCost: 520 },
  { id: "prd-coal", name: "Уголь", category: "Хоз.", unit: "kg", minQty: 25, avgCost: 42 },
  { id: "prd-cream", name: "Сметана", category: "Молочка", unit: "kg", minQty: 4, avgCost: 185 },
  { id: "prd-lemon", name: "Лимоны", category: "Овощи", unit: "kg", minQty: 2, avgCost: 175 },
];

export const RECIPES: Recipe[] = [
  {
    id: "rcp-pork",
    name: "Шашлык из свинины",
    category: "Мангал",
    price: 690,
    yieldPortions: 1,
    items: [
      { productId: "prd-pork", qty: 0.32 },
      { productId: "prd-onion", qty: 0.05 },
      { productId: "prd-oil", qty: 0.015 },
      { productId: "prd-salt", qty: 0.008 },
      { productId: "prd-coal", qty: 0.12 },
    ],
  },
  {
    id: "rcp-beef",
    name: "Шашлык из говядины",
    category: "Мангал",
    price: 890,
    yieldPortions: 1,
    items: [
      { productId: "prd-beef", qty: 0.3 },
      { productId: "prd-onion", qty: 0.04 },
      { productId: "prd-oil", qty: 0.012 },
      { productId: "prd-salt", qty: 0.008 },
      { productId: "prd-coal", qty: 0.12 },
    ],
  },
  {
    id: "rcp-lyulya",
    name: "Люля-кебаб",
    category: "Мангал",
    price: 620,
    yieldPortions: 1,
    items: [
      { productId: "prd-lamb", qty: 0.12 },
      { productId: "prd-beef", qty: 0.12 },
      { productId: "prd-onion", qty: 0.04 },
      { productId: "prd-greens", qty: 0.01 },
      { productId: "prd-salt", qty: 0.006 },
      { productId: "prd-coal", qty: 0.1 },
    ],
  },
  {
    id: "rcp-chicken",
    name: "Курица на гриле",
    category: "Мангал",
    price: 490,
    yieldPortions: 1,
    items: [
      { productId: "prd-chicken", qty: 0.35 },
      { productId: "prd-oil", qty: 0.01 },
      { productId: "prd-adjika", qty: 0.02 },
      { productId: "prd-coal", qty: 0.1 },
    ],
  },
  {
    id: "rcp-veg",
    name: "Овощи на гриле",
    category: "Гарнир",
    price: 290,
    yieldPortions: 1,
    items: [
      { productId: "prd-pepper", qty: 0.08 },
      { productId: "prd-tomato", qty: 0.08 },
      { productId: "prd-onion", qty: 0.05 },
      { productId: "prd-oil", qty: 0.01 },
    ],
  },
  {
    id: "rcp-potato",
    name: "Картофель по-деревенски",
    category: "Гарнир",
    price: 190,
    yieldPortions: 1,
    items: [
      { productId: "prd-potato", qty: 0.25 },
      { productId: "prd-oil", qty: 0.02 },
      { productId: "prd-garlic", qty: 0.008 },
      { productId: "prd-salt", qty: 0.004 },
    ],
  },
  {
    id: "rcp-salad",
    name: "Салат свежий",
    category: "Салаты",
    price: 250,
    yieldPortions: 1,
    items: [
      { productId: "prd-tomato", qty: 0.08 },
      { productId: "prd-cucumber", qty: 0.08 },
      { productId: "prd-greens", qty: 0.015 },
      { productId: "prd-oil", qty: 0.01 },
    ],
  },
  {
    id: "rcp-lavash",
    name: "Лаваш",
    category: "Хлеб",
    price: 70,
    yieldPortions: 1,
    items: [{ productId: "prd-lavash", qty: 1 }],
  },
  {
    id: "rcp-cola",
    name: "Газировка 0.5",
    category: "Напитки",
    price: 150,
    yieldPortions: 1,
    items: [{ productId: "prd-cola", qty: 0.5 }],
  },
  {
    id: "rcp-beer",
    name: "Пиво 0.5",
    category: "Бар",
    price: 280,
    yieldPortions: 1,
    items: [{ productId: "prd-beer", qty: 0.5 }],
  },
  {
    id: "rcp-vodka",
    name: "Водка 50 мл",
    category: "Бар",
    price: 220,
    yieldPortions: 1,
    items: [{ productId: "prd-vodka", qty: 0.05 }],
  },
  {
    id: "rcp-wine",
    name: "Вино 150 мл",
    category: "Бар",
    price: 320,
    yieldPortions: 1,
    items: [{ productId: "prd-wine", qty: 0.15 }],
  },
];

const MANAGERS: Record<string, string> = {
  "br-pushkin": "u-mgr-p",
  "br-south": "u-mgr-s",
  "br-embank": "u-mgr-e",
};

const WAITERS: Record<string, string[]> = {
  "br-pushkin": ["u-wait-p", "u-wait-p2"],
  "br-south": ["u-wait-s"],
  "br-embank": ["u-wait-e"],
};

const STAFF_ON: Record<string, string[]> = {
  "br-pushkin": ["u-mgr-p", "u-cook-p", "u-grill-p", "u-wait-p", "u-wait-p2"],
  "br-south": ["u-mgr-s", "u-cook-s", "u-wait-s"],
  "br-embank": ["u-mgr-e", "u-grill-e", "u-wait-e"],
};

function pad(n: number) {
  return String(n).padStart(4, "0");
}

function atHour(day: string, hour: number, minute: number) {
  const d = parseDay(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function createSeed(): Snapshot {
  const invoices: Invoice[] = [];
  const movements: StockMovement[] = [];
  let stock: StockLevel[] = [];
  const sales: Sale[] = [];
  const shifts: Shift[] = [];
  const payroll: PayrollAccrual[] = [];
  const expenses: Expense[] = [];

  const start = addDays(TODAY, -7);

  for (const br of BRANCHES) {
    const lines = PRODUCTS.map((p) => {
      const qty = Math.round(p.minQty * between(2.4, 3.6) * 10) / 10;
      return { productId: p.id, qty, price: p.avgCost };
    });
    const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const inv: Invoice = {
      id: `inv-${br.id}-open`,
      number: `НФ-${br.short.slice(0, 2).toUpperCase()}-2408`,
      branchId: br.id,
      supplier: "Мясоопт Юг",
      date: addDays(start, -1),
      lines,
      total: Math.round(total),
      userId: MANAGERS[br.id] ?? "u-owner",
    };
    invoices.push(inv);
    for (const line of lines) {
      const mov: StockMovement = {
        id: `m-open-${br.id}-${line.productId}`,
        at: atHour(inv.date, 9, 0),
        branchId: br.id,
        productId: line.productId,
        type: "receipt",
        qty: line.qty,
        cost: line.qty * line.price,
        refId: inv.id,
        userId: inv.userId,
        note: "Стартовый приход",
      };
      movements.push(mov);
      stock = applyMovement(stock, mov);
    }
  }

  const opexDaily: Record<string, { rent: number; util: number }> = {
    "br-pushkin": { rent: 6500, util: 1800 },
    "br-south": { rent: 4800, util: 1400 },
    "br-embank": { rent: 8200, util: 2200 },
  };

  let saleSeq = 10420;
  let day = start;
  while (day <= TODAY) {
    const dow = parseDay(day).getDay();
    const weekend = dow === 0 || dow === 6;
    for (const br of BRANCHES) {
      const opex = opexDaily[br.id] ?? { rent: 5000, util: 1500 };
      expenses.push(
        {
          id: `exp-${br.id}-${day}-r`,
          branchId: br.id,
          date: day,
          category: "Аренда",
          amount: opex.rent,
          note: "Доля аренды за день",
        },
        {
          id: `exp-${br.id}-${day}-u`,
          branchId: br.id,
          date: day,
          category: "Коммунальные",
          amount: opex.util,
          note: "Электричество, газ, вода",
        },
      );

      const isToday = day === TODAY;
      const openCash = int(12, 18) * 1000;
      const shift: Shift = {
        id: `sh-${br.id}-${day}`,
        branchId: br.id,
        date: day,
        status: isToday ? "open" : "closed",
        openedAt: atHour(day, 11, 0),
        closedAt: isToday ? undefined : atHour(day, 23, 5),
        openedBy: MANAGERS[br.id] ?? "u-owner",
        closedBy: isToday ? undefined : MANAGERS[br.id],
        openCash,
        cashTotal: 0,
        cardTotal: 0,
        qrTotal: 0,
        staffIds: STAFF_ON[br.id] ?? [],
      };

      const nChecks = int(weekend ? 16 : 11, weekend ? 24 : 18) + (br.id === "br-embank" ? 4 : 0);
      const waiters = WAITERS[br.id] ?? ["u-wait-p"];
      for (let i = 0; i < nChecks; i++) {
        if (isToday && i > nChecks * 0.55) break;
        const hour = 12 + Math.floor((i / nChecks) * 10);
        const minute = int(0, 59);
        const itemCount = int(2, 5);
        const items = [];
        for (let k = 0; k < itemCount; k++) {
          const recipe = pick(RECIPES);
          const qty = recipe.category === "Напитки" || recipe.category === "Бар" ? int(1, 3) : 1;
          items.push({
            recipeId: recipe.id,
            name: recipe.name,
            qty,
            price: recipe.price,
            sum: recipe.price * qty,
          });
        }
        const total = items.reduce((s, it) => s + it.sum, 0);
        const method = rng() < 0.38 ? "cash" : rng() < 0.82 ? "card" : "qr";
        const sale: Sale = {
          id: `sale-${saleSeq}`,
          number: `ЧК-${pad(saleSeq)}`,
          branchId: br.id,
          shiftId: shift.id,
          at: atHour(day, hour, minute),
          items,
          payments: [{ type: method, amount: total }],
          total,
          waiterId: pick(waiters),
          source: "keeper",
        };
        saleSeq += 1;
        sales.push(sale);
        const deducted = deductSaleFromStock(stock, sale, RECIPES, PRODUCTS, sale.waiterId);
        stock = deducted.stock;
        movements.push(...deducted.movements);
      }

      if (!isToday && rng() < 0.45) {
        const product =
          PRODUCTS.find((p) => p.id === "prd-greens") ??
          PRODUCTS.find((p) => p.id === "prd-pork") ??
          PRODUCTS[0]!;
        const qty = -Math.round(between(0.3, 1.6) * 10) / 10;
        const mov: StockMovement = {
          id: `wo-${br.id}-${day}-${product.id}`,
          at: atHour(day, 21, 40),
          branchId: br.id,
          productId: product.id,
          type: "writeoff",
          qty,
          cost: Math.abs(qty) * product.avgCost,
          reason: rng() < 0.6 ? "spoilage" : "staff_meal",
          note: rng() < 0.6 ? "Срок / качество" : "Питание смены",
          userId: STAFF_ON[br.id]?.[1] ?? "u-cook-p",
        };
        movements.push(mov);
        stock = applyMovement(stock, mov);
      }

      const totals = shiftTotals(shift, sales);
      shift.cashTotal = totals.cash;
      shift.cardTotal = totals.card;
      shift.qrTotal = totals.qr;
      if (!isToday) {
        const disc = Math.round(between(-400, 350));
        shift.expectedCash = totals.expected;
        shift.closeCash = totals.expected + disc;
        shift.discrepancy = disc;
        const pays = payrollForShift(shift, sales, USERS);
        for (const p of pays) {
          payroll.push({
            id: `pay-${shift.id}-${p.userId}`,
            userId: p.userId,
            branchId: br.id,
            date: day,
            shiftId: shift.id,
            hours: p.hours,
            base: p.base,
            bonus: p.bonus,
            total: p.total,
          });
        }
      }
      shifts.push(shift);
    }
    day = addDays(day, 1);
  }

  const southPork = stock.find((s) => s.branchId === "br-south" && s.productId === "prd-pork");
  if (southPork) southPork.qty = 9.4;
  const pushGreens = stock.find((s) => s.branchId === "br-pushkin" && s.productId === "prd-greens");
  if (pushGreens) pushGreens.qty = 0.8;
  const embBeer = stock.find((s) => s.branchId === "br-embank" && s.productId === "prd-beer");
  if (embBeer) embBeer.qty = 16;

  const extraWriteoff: StockMovement = {
    id: "wo-anomaly-south-pork",
    at: atHour(addDays(TODAY, -1), 22, 10),
    branchId: "br-south",
    productId: "prd-pork",
    type: "writeoff",
    qty: -4.2,
    cost: 4.2 * 420,
    reason: "theft",
    note: "Недостача после закрытия. Нет акта.",
    userId: "u-cook-s",
  };
  movements.push(extraWriteoff);
  stock = applyMovement(stock, extraWriteoff);

  const banquets: Banquet[] = [
    {
      id: "bn-1",
      number: "БН-104",
      branchId: "br-embank",
      title: "Юбилей 50 лет",
      clientName: "Сергей Макаров",
      clientPhone: "+7 918 555-14-20",
      date: "2026-09-05",
      startTime: "17:00",
      endTime: "23:00",
      guests: 48,
      hall: "Веранда",
      total: 186000,
      deposit: 40000,
      depositPaid: true,
      status: "deposit_paid",
      notes: "Без свинины у 4 гостей. Торт привозят сами в 20:30.",
      waiterNotes: "Расстановка 6 столов по 8. Детский стул — 2 шт. Отдельный стол под торт.",
      grillItems: [
        { name: "Шашлык свинина", qty: 16, unit: "кг", readyBy: "17:45", notes: "Средняя прожарка" },
        { name: "Люля-кебаб", qty: 8, unit: "кг", readyBy: "18:00" },
        { name: "Овощи гриль", qty: 6, unit: "кг", readyBy: "17:50" },
      ],
      kitchenItems: [
        { name: "Салат свежий", qty: 48, unit: "порц", readyBy: "16:40" },
        { name: "Картофель по-деревенски", qty: 48, unit: "порц", readyBy: "17:30" },
        { name: "Соусы (ткемали, аджика)", qty: 12, unit: "шт", readyBy: "16:30" },
      ],
      serviceItems: [
        { name: "Набор приборов", qty: 50, unit: "шт" },
        { name: "Пиво разливное", qty: 30, unit: "л", notes: "Старт в 17:00" },
        { name: "Газировка", qty: 20, unit: "л" },
        { name: "Водка", qty: 3, unit: "л" },
      ],
      timeline: [
        { time: "15:00", action: "Зал, текстиль, расстановка" },
        { time: "16:30", action: "Холодный цех готов" },
        { time: "17:00", action: "Встреча гостей, аперитив" },
        { time: "17:45", action: "Горячее с мангала" },
        { time: "20:30", action: "Торт / свечи" },
        { time: "23:00", action: "Завершение" },
      ],
    },
    {
      id: "bn-2",
      number: "БН-105",
      branchId: "br-pushkin",
      title: "Корпоратив «ЮгСтрой»",
      clientName: "Ольга Немцева",
      clientPhone: "+7 918 441-02-88",
      date: "2026-09-06",
      startTime: "18:30",
      endTime: "23:30",
      guests: 32,
      hall: "Основной зал",
      total: 118000,
      deposit: 25000,
      depositPaid: true,
      status: "confirmed",
      notes: "Счёт на юрлицо. Нужны стоп-листы по алкоголю после 23:00.",
      waiterNotes: "Именные таблички на столы. Микрофон.",
      grillItems: [
        { name: "Шашлык говядина", qty: 8, unit: "кг", readyBy: "19:00" },
        { name: "Курица на гриле", qty: 6, unit: "кг", readyBy: "19:00" },
      ],
      kitchenItems: [
        { name: "Салат свежий", qty: 32, unit: "порц", readyBy: "18:10" },
        { name: "Рис со специями", qty: 32, unit: "порц", readyBy: "18:40" },
      ],
      serviceItems: [
        { name: "Вино красное", qty: 8, unit: "л" },
        { name: "Газировка", qty: 12, unit: "л" },
      ],
      timeline: [
        { time: "17:00", action: "Подготовка зала" },
        { time: "18:30", action: "Сбор гостей" },
        { time: "19:00", action: "Горячее" },
      ],
    },
    {
      id: "bn-3",
      number: "БН-106",
      branchId: "br-south",
      title: "День рождения",
      clientName: "Иван Котов",
      clientPhone: "+7 918 300-77-12",
      date: "2026-09-12",
      startTime: "16:00",
      endTime: "21:00",
      guests: 18,
      hall: "Кабинка 2",
      total: 54000,
      deposit: 10000,
      depositPaid: false,
      status: "inquiry",
      notes: "Ждут подтверждения меню до 8 сентября.",
      waiterNotes: "Детский стол на 4 персоны.",
      grillItems: [{ name: "Шашлык свинина", qty: 5, unit: "кг", readyBy: "16:40" }],
      kitchenItems: [{ name: "Картофель", qty: 18, unit: "порц", readyBy: "16:30" }],
      serviceItems: [{ name: "Газировка", qty: 8, unit: "л" }],
      timeline: [{ time: "16:00", action: "Встреча" }],
    },
    {
      id: "bn-4",
      number: "БН-101",
      branchId: "br-embank",
      title: "Свадебный ужин",
      clientName: "Алина и Пётр",
      clientPhone: "+7 918 111-22-33",
      date: "2026-08-29",
      startTime: "17:00",
      endTime: "00:00",
      guests: 64,
      hall: "Веранда + зал",
      total: 274000,
      deposit: 70000,
      depositPaid: true,
      status: "done",
      notes: "Прошёл без замечаний.",
      waiterNotes: "",
      grillItems: [{ name: "Ассорти мангал", qty: 28, unit: "кг", readyBy: "18:00" }],
      kitchenItems: [{ name: "Холодные закуски", qty: 64, unit: "порц", readyBy: "16:30" }],
      serviceItems: [{ name: "Бар-пакет", qty: 1, unit: "компл" }],
      timeline: [],
    },
    {
      id: "bn-5",
      number: "БН-098",
      branchId: "br-pushkin",
      title: "Проводы",
      clientName: "Ренат Алиев",
      clientPhone: "+7 918 222-10-10",
      date: "2026-08-26",
      startTime: "19:00",
      endTime: "23:00",
      guests: 22,
      hall: "Основной зал",
      total: 64000,
      deposit: 15000,
      depositPaid: true,
      status: "done",
      notes: "",
      waiterNotes: "",
      grillItems: [{ name: "Шашлык свинина", qty: 7, unit: "кг", readyBy: "19:20" }],
      kitchenItems: [{ name: "Салат", qty: 22, unit: "порц", readyBy: "18:40" }],
      serviceItems: [{ name: "Пиво", qty: 15, unit: "л" }],
      timeline: [],
    },
  ];

  return {
    branches: BRANCHES,
    users: USERS,
    products: PRODUCTS,
    recipes: RECIPES,
    stock,
    movements,
    invoices,
    sales,
    shifts,
    requests: [
      {
        id: "pr-1",
        number: "ЗК-214",
        branchId: "br-pushkin",
        date: TODAY,
        status: "draft",
        userId: "u-mgr-p",
        note: "Срочно зелень и пиво к пятнице",
        lines: [
          { productId: "prd-greens", qty: 4 },
          { productId: "prd-beer", qty: 40 },
        ],
      },
    ],
    banquets,
    expenses,
    payroll,
    revisions: [
      {
        id: "rev-south-1",
        branchId: "br-south",
        date: addDays(TODAY, -3),
        status: "done",
        userId: "u-mgr-s",
        note: "Плановая недельная",
        lines: PRODUCTS.slice(0, 8).map((p) => ({
          productId: p.id,
          bookQty: 20,
          factQty: p.id === "prd-pork" ? 16.4 : 20,
        })),
      },
    ],
  };
}

export const DEMO_ACCOUNTS = [
  { email: "owner", role: "Владелец", name: "Кирилл Сорокин", hint: "Все филиалы, финансы, интеграции" },
  { email: "manager", role: "Управляющий", name: "Анна Лебедева", hint: "Пушкина: смена, закупки, банкеты" },
  { email: "cook", role: "Повар", name: "Денис Жуков", hint: "Склад, техкарты, списания" },
  { email: "waiter", role: "Официант", name: "Алина Петрова", hint: "Чеки, своя смена, банкет в зале" },
] as const;

