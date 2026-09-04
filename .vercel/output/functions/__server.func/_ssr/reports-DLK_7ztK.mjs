import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { C as periodStart, D as ruDate, L as writeoffByReason, S as pct, _ as filterByBranch, c as WRITEOFF_LABEL, k as rub, p as computeKpis, s as TODAY, v as filterPeriod } from "./seed-C4rObjht.mjs";
import { i as useOps } from "./store-Bknmh7t3.mjs";
import { l as Button, o as Card } from "./router-DjPwU5Qt.mjs";
import { n as PageHeader, t as Kpi } from "./page-Dq1WwIZy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-DLK_7ztK.js
var import_jsx_runtime = require_jsx_runtime();
function ReportsPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const period = useOps((s) => s.period);
	const scope = session.branchId;
	const k = computeKpis(snap, {
		period,
		branchId: scope
	});
	const from = periodStart(period);
	const reasons = writeoffByReason(snap.movements, from, TODAY, scope);
	const invoices = filterPeriod(filterByBranch(snap.invoices, scope), from, TODAY);
	function csv() {
		const lines = [
			"metric,value",
			`revenue,${k.revenue}`,
			`cogs,${k.cogs}`,
			`food_cost,${k.foodCost.toFixed(2)}`,
			`writeoffs,${k.writeoffs}`,
			`payroll,${k.payroll}`,
			`opex,${k.opex}`,
			`net,${k.net}`
		];
		const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ochag-${scope}-${from}-${TODAY}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Срез",
			title: "Отчёты",
			description: "Любой срез в реальном времени: продажи, приход, списания, ФОТ и чистая прибыль владельца.",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				onClick: csv,
				children: "Выгрузка CSV"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Выручка",
					value: rub(k.revenue)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Себестоимость",
					value: rub(k.cogs),
					hint: pct(k.foodCost)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Расходы + ФОТ",
					value: rub(k.opex + k.payroll)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Чистыми",
					value: rub(k.net),
					tone: k.net >= 0 ? "good" : "bad"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium",
				children: "Списания по причинам"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-2",
				children: [reasons.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: WRITEOFF_LABEL[r.reason] ?? r.reason }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono tabular-nums",
						children: rub(r.value)
					})]
				}, r.reason)), reasons.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Списаний нет."
				}) : null]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium",
				children: "Приход за период"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-2",
				children: invoices.slice(0, 8).map((inv) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [inv.number, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 text-xs text-muted",
						children: ruDate(inv.date)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono tabular-nums",
						children: rub(inv.total)
					})]
				}, inv.id))
			})] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium",
				children: "Как считается прибыль"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted",
				children: "Банкеты ведутся отдельным контуром. Прибыль: выручка чеков − себестоимость по техкартам − списания − аренда и коммуналка − начисленный фонд оплаты."
			})]
		})
	] });
}
//#endregion
export { ReportsPage as component };
