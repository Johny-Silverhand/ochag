import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { C as periodStart, D as ruDate, _ as filterByBranch, k as rub, o as ROLE_LABEL, s as TODAY, v as filterPeriod } from "./seed-C4rObjht.mjs";
import { i as useOps } from "./store-Bknmh7t3.mjs";
import { o as Card } from "./router-DjPwU5Qt.mjs";
import { n as PageHeader, t as Kpi } from "./page-Dq1WwIZy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/staff-BumODUar.js
var import_jsx_runtime = require_jsx_runtime();
function StaffPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const period = useOps((s) => s.period);
	const scope = session.branchId;
	const from = periodStart(period);
	const rows = filterPeriod(filterByBranch(snap.payroll, scope), from, TODAY);
	const total = rows.reduce((s, r) => s + r.total, 0);
	const staff = snap.users.filter((u) => u.role !== "owner" && (scope === "all" || u.branchId === scope));
	const byUser = staff.map((u) => {
		const accruals = rows.filter((r) => r.userId === u.id);
		return {
			u,
			sum: accruals.reduce((s, r) => s + r.total, 0),
			bonus: accruals.reduce((s, r) => s + r.bonus, 0),
			shifts: accruals.length
		};
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "ФОТ",
			title: "Сотрудники и зарплаты",
			description: "Ставка за смену плюс процент с выручки у официантов. Начисление — в момент закрытия кассы."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Начислено за период",
					value: rub(total)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Смен закрыто",
					value: String(rows.length)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "В штате",
					value: String(staff.length)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-bg text-xs text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 font-medium",
							children: "Сотрудник"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Роль"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Ставка"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Смен"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 text-right font-medium",
							children: "Начислено"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: byUser.map(({ u, sum, bonus, shifts }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "px-5 py-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: u.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted",
								children: u.position
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2.5 text-muted",
							children: ROLE_LABEL[u.role]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "px-3 py-2.5 font-mono tabular-nums",
							children: [rub(u.shiftPay), u.salesPercent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-xs",
								children: [
									"+",
									u.salesPercent,
									"%"
								]
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2.5 font-mono tabular-nums",
							children: shifts
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "px-5 py-2.5 text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono tabular-nums",
								children: rub(sum)
							}), bonus ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted",
								children: ["в т.ч. бонус ", rub(bonus)]
							}) : null]
						})
					]
				}, u.id)) })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-4 overflow-hidden p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border px-5 py-3 text-sm font-medium",
				children: "Последние начисления"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
				className: "w-full text-left text-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.slice(0, 12).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2",
							children: snap.users.find((u) => u.id === r.userId)?.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2 text-muted",
							children: ruDate(r.date)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2 text-right font-mono tabular-nums",
							children: rub(r.total)
						})
					]
				}, r.id)) })
			})]
		})
	] });
}
//#endregion
export { StaffPage as component };
