import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { C as periodStart, D as ruDate, I as topDishes, M as shiftTotals, S as pct, _ as filterByBranch, f as branchCompare, h as dailyRevenue, k as rub, p as computeKpis, s as TODAY, v as filterPeriod, y as needToBuy } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps } from "./store-Bknmh7t3.mjs";
import { c as CardTitle, o as Card, s as CardHeader, x as usePrefs } from "./router-DjPwU5Qt.mjs";
import { n as PageHeader, t as Kpi } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { t as Segmented } from "./tabs-rt-h79IP.mjs";
import { a as Area, c as ResponsiveContainer, i as XAxis, l as Tooltip, n as BarChart, o as CartesianGrid, r as YAxis, s as Bar, t as AreaChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-BqEXPVE2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function localAnalyze(snap, branchId) {
	const out = [];
	const week = computeKpis(snap, {
		period: "7d",
		branchId
	});
	const today = computeKpis(snap, {
		period: "today",
		branchId
	});
	if (week.foodCost > 32) out.push({
		id: "food-cost-high",
		severity: "warning",
		title: "Food cost выше нормы",
		body: `За 7 дней food cost ${week.foodCost.toFixed(1)}% при ориентире 28–32%. Проверьте техкарты и закупочные цены на мясо.`,
		module: "recipes",
		branchId: branchId === "all" ? void 0 : branchId
	});
	if (week.revenue > 0 && week.writeoffs / week.revenue > .025) out.push({
		id: "writeoff-share",
		severity: "critical",
		title: "Аномальная доля списаний",
		body: `Списания ${Math.round(week.writeoffs / week.revenue * 1e3) / 10}% от выручки за неделю. Норма — до 1.5%. Смотрите акты по порче и недостачам.`,
		module: "inventory",
		branchId: branchId === "all" ? void 0 : branchId
	});
	const branches = branchId === "all" ? snap.branches : snap.branches.filter((b) => b.id === branchId);
	for (const b of branches) {
		const urgent = needToBuy(snap, b.id).filter((n) => n.have <= n.min * .4);
		if (urgent.length) out.push({
			id: `stock-${b.id}`,
			severity: "warning",
			title: `Заканчивается товар · ${b.short}`,
			body: urgent.map((u) => u.product.name).slice(0, 4).join(", ") + ". Сформируйте заявку до открытия.",
			module: "procurement",
			branchId: b.id
		});
		const open = snap.shifts.find((s) => s.branchId === b.id && s.status === "open");
		if (open) {
			if (shiftTotals(open, snap.sales).revenue === 0 && "2026-09-02" === open.date) out.push({
				id: `shift-empty-${b.id}`,
				severity: "info",
				title: `Смена открыта без чеков · ${b.short}`,
				body: "Касса открыта, продаж ещё нет. Если кипер уже бьёт чеки — заберите Z/X-отчёт.",
				module: "shifts",
				branchId: b.id
			});
		}
		const bad = snap.shifts.filter((s) => s.branchId === b.id && s.status === "closed" && s.discrepancy).filter((s) => Math.abs(s.discrepancy ?? 0) > 300);
		if (bad.length >= 2) out.push({
			id: `cash-${b.id}`,
			severity: "warning",
			title: `Расхождения кассы · ${b.short}`,
			body: `${bad.length} смен с расхождением больше 300 ₽. Сверьте наличные с кипером и инкассацию.`,
			module: "shifts",
			branchId: b.id
		});
	}
	if (snap.movements.find((m) => m.id === "wo-anomaly-south-pork") && (branchId === "all" || branchId === "br-south")) out.push({
		id: "pork-missing",
		severity: "critical",
		title: "Недостача свинины · Южный",
		body: "Списание 4.2 кг без акта. По объёму это не порча. Имеет смысл сверка смены повара и ревизия морозилки.",
		module: "inventory",
		branchId: "br-south"
	});
	const unpaid = snap.banquets.filter((b) => (b.status === "confirmed" || b.status === "inquiry") && !b.depositPaid && b.date >= "2026-09-02");
	for (const b of unpaid.slice(0, 2)) out.push({
		id: `dep-${b.id}`,
		severity: "info",
		title: `Нет залога · ${b.title}`,
		body: `${b.clientName}, ${b.date}. Залог ${Math.round(b.deposit)} ₽ ещё не отмечен. Напомните до закупки продукта.`,
		module: "banquets",
		branchId: b.branchId
	});
	if (today.avgCheck && week.avgCheck && today.avgCheck < week.avgCheck * .85) out.push({
		id: "avg-check-drop",
		severity: "info",
		title: "Средний чек ниже недели",
		body: `Сегодня средний чек заметно ниже 7-дневного. Проверьте допродажи бара и комбо.`,
		module: "sales",
		branchId: branchId === "all" ? void 0 : branchId
	});
	if (week.net < 0) out.push({
		id: "net-neg",
		severity: "critical",
		title: "Отрицательная прибыль за период",
		body: "Выручка не покрывает себестоимость, списания, фонд оплаты и операционные. Смотрите сравнение филиалов.",
		module: "dashboard"
	});
	if (snap.movements.filter((m) => m.type === "writeoff" && m.userId === "u-cook-s").length >= 3 && (branchId === "all" || branchId === "br-south")) out.push({
		id: "cook-pattern",
		severity: "warning",
		title: "Паттерн списаний у повара",
		body: "На Южном большинство списаний закрывает один сотрудник. Это не доказательство, но повод для управляющего пройтись по актам вместе с ним.",
		module: "staff",
		branchId: "br-south"
	});
	return out;
}
function createLocalAdvisor() {
	return { async analyze(snap, branchId) {
		return localAnalyze(snap, branchId);
	} };
}
var advisor = createLocalAdvisor();
function DashboardPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const period = useOps((s) => s.period);
	const setPeriod = useOps((s) => s.setPeriod);
	const user = useSessionUser();
	const scope = session?.branchId ?? "all";
	const pinLowStock = usePrefs((s) => s.kitchenPinLowStock);
	const showAdvisor = usePrefs((s) => s.showAdvisor);
	const showLowStock = user?.role === "owner" || user?.role === "manager" || user?.role === "cook" && pinLowStock;
	const [insights, setInsights] = (0, import_react.useState)([]);
	const kpis = (0, import_react.useMemo)(() => computeKpis(snap, {
		period,
		branchId: scope
	}), [
		snap,
		period,
		scope
	]);
	const from = periodStart(period);
	const sales = filterPeriod(filterByBranch(snap.sales, scope), from, TODAY);
	const series = dailyRevenue(sales, from, TODAY);
	const compare = branchCompare(snap, period);
	const dishes = topDishes(sales, 5);
	const alerts = scope === "all" ? snap.branches.flatMap((b) => needToBuy(snap, b.id).slice(0, 2).map((n) => ({
		...n,
		branch: b.short
	}))) : needToBuy(snap, scope).slice(0, 6).map((n) => ({
		...n,
		branch: snap.branches.find((b) => b.id === scope)?.short ?? ""
	}));
	(0, import_react.useEffect)(() => {
		advisor.analyze(snap, scope).then(setInsights);
	}, [
		snap.movements.length,
		snap.sales.length,
		scope,
		period
	]);
	const greeting = user?.role === "owner" ? "Сводка по сети" : user?.role === "manager" ? "Сводка филиала" : user?.role === "cook" ? "Кухня и склад" : "Ваша смена";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: greeting,
			title: "Обзор",
			description: "Выручка, себестоимость, списания, фонд оплаты и чистая прибыль — без ручных таблиц.",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
				value: period,
				onChange: (v) => setPeriod(v),
				options: [
					{
						value: "today",
						label: "Сегодня"
					},
					{
						value: "7d",
						label: "7 дней"
					},
					{
						value: "30d",
						label: "30 дней"
					}
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "stagger-in grid grid-cols-2 gap-3 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Выручка",
					value: rub(kpis.revenue),
					hint: `${kpis.checks} чеков · ср. ${rub(kpis.avgCheck)}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Фудкост",
					value: pct(kpis.foodCost),
					hint: `себест. ${rub(kpis.cogs)}`,
					tone: kpis.foodCost > 32 ? "bad" : "good"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Списания",
					value: rub(kpis.writeoffs),
					hint: "порча, питание, недостача",
					tone: kpis.writeoffs > kpis.revenue * .02 ? "bad" : "default"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Чистая прибыль",
					value: rub(kpis.net),
					hint: `ФОТ ${rub(kpis.payroll)} · opex ${rub(kpis.opex)}`,
					tone: kpis.net >= 0 ? "good" : "bad"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Выручка по дням" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs text-muted",
				children: scope === "all" ? "Все филиалы" : snap.branches.find((b) => b.id === scope)?.short
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-56",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
						data: series,
						margin: {
							top: 8,
							right: 8,
							left: 0,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
								id: "rev",
								x1: "0",
								y1: "0",
								x2: "0",
								y2: "1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "0%",
									stopColor: "var(--color-primary)",
									stopOpacity: .28
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "100%",
									stopColor: "var(--color-primary)",
									stopOpacity: .02
								})]
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								stroke: "var(--color-border)",
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "date",
								tickFormatter: (d) => ruDate(d),
								tick: {
									fontSize: 11,
									fill: "var(--color-muted)"
								},
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tickFormatter: (v) => `${Math.round(v / 1e3)}к`,
								tick: {
									fontSize: 11,
									fill: "var(--color-muted)"
								},
								axisLine: false,
								tickLine: false,
								width: 36
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								formatter: (v) => rub(v),
								labelFormatter: (d) => ruDate(String(d), {
									day: "numeric",
									month: "long"
								}),
								contentStyle: {
									background: "var(--color-elevated)",
									border: "1px solid var(--color-border)",
									borderRadius: 12,
									fontSize: 12
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "value",
								stroke: "var(--color-primary)",
								fill: "url(#rev)",
								strokeWidth: 2
							})
						]
					})
				})
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Сигналы" }), user?.role === "owner" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/integrations",
				className: "text-xs text-muted hover:text-fg",
				children: "подключения"
			}) : null] }), !showAdvisor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Сигналы скрыты в настройках сети."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "space-y-3",
				children: [insights.slice(0, 4).map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-md bg-bg p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: i.severity === "critical" ? "danger" : i.severity === "warning" ? "warning" : "primary",
							children: i.severity === "critical" ? "важно" : i.severity === "warning" ? "внимание" : "сигнал"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: i.title
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs leading-relaxed text-muted",
						children: i.body
					})]
				}, i.id)), insights.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Аномалий нет — контур спокойный."
				}) : null]
			})] })]
		}),
		user?.role === "owner" || user?.role === "manager" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Филиалы рядом" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-52",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
							data: compare.map((c) => ({
								name: c.branch.short,
								revenue: c.revenue,
								net: c.net
							})),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									stroke: "var(--color-border)",
									vertical: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "name",
									tick: {
										fontSize: 11,
										fill: "var(--color-muted)"
									},
									axisLine: false,
									tickLine: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									tickFormatter: (v) => `${Math.round(v / 1e3)}к`,
									tick: {
										fontSize: 11,
										fill: "var(--color-muted)"
									},
									axisLine: false,
									tickLine: false,
									width: 36
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									formatter: (v) => rub(v),
									contentStyle: {
										background: "var(--color-elevated)",
										border: "1px solid var(--color-border)",
										borderRadius: 12,
										fontSize: 12
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
									dataKey: "revenue",
									fill: "var(--color-primary)",
									radius: [
										6,
										6,
										0,
										0
									]
								})
							]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "text-xs text-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "pb-2 font-medium",
									children: "Филиал"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "pb-2 font-medium",
									children: "Выручка"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "pb-2 font-medium",
									children: "FC"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "pb-2 font-medium",
									children: "ФОТ"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "pb-2 font-medium",
									children: "Прибыль"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: compare.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2",
									children: c.branch.short
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 font-mono tabular-nums",
									children: rub(c.revenue)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 font-mono tabular-nums",
									children: pct(c.foodCost)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 font-mono tabular-nums",
									children: rub(c.payroll)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 font-mono tabular-nums",
									children: rub(c.net)
								})
							]
						}, c.branch.id)) })]
					})
				})
			]
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Топ блюд" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: dishes.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-muted tabular-nums",
						children: [
							d.qty,
							" · ",
							rub(d.sum)
						]
					})]
				}, d.name))
			})] }), showLowStock ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Ниже минимума" }), user?.role === "owner" || user?.role === "manager" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/procurement",
				className: "text-xs text-muted hover:text-fg",
				children: "к закупкам"
			}) : null] }), alerts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Остатки в норме."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: alerts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [a.product.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 text-xs text-subtle",
						children: a.branch
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-danger tabular-nums",
						children: [
							a.have,
							" / ",
							a.min,
							" ",
							a.product.unit
						]
					})]
				}, `${a.branch}-${a.product.id}`))
			})] }) : null]
		})
	] });
}
//#endregion
export { DashboardPage as component };
