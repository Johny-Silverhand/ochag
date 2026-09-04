import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { A as salePayments, C as periodStart, I as topDishes, O as ruDateTime, S as pct, _ as filterByBranch, b as openShiftFor, i as PAYMENT_LABEL, k as rub, s as TODAY, v as filterPeriod } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps } from "./store-Bknmh7t3.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as Button, o as Card, x as usePrefs } from "./router-DjPwU5Qt.mjs";
import { i as canImportKeeper, n as canCreateSale } from "./permissions-DdHKqKg8.mjs";
import { r as NativeSelect, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader, t as Kpi } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-b23vXdEV.mjs";
import { t as Segmented } from "./tabs-rt-h79IP.mjs";
import { n as demoKeeperZReport, r as mapKeeperReceipts } from "./keeper-zc8Y9rwx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sales-Dp7tnZdh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SalesPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const period = useOps((s) => s.period);
	const setPeriod = useOps((s) => s.setPeriod);
	const user = useSessionUser();
	const importKeeperSales = useOps((s) => s.importKeeperSales);
	const addManualSale = useOps((s) => s.addManualSale);
	const ownSalesOnly = usePrefs((s) => s.waiterOwnSalesOnly);
	const scope = session.branchId;
	const from = periodStart(period);
	const rows = (0, import_react.useMemo)(() => {
		let list = filterPeriod(filterByBranch(snap.sales, scope), from, TODAY);
		if (user.role === "waiter" && ownSalesOnly) list = list.filter((s) => s.waiterId === user.id);
		return [...list].sort((a, b) => a.at < b.at ? 1 : -1);
	}, [
		snap.sales,
		scope,
		from,
		user,
		ownSalesOnly
	]);
	const revenue = rows.reduce((s, r) => s + r.total, 0);
	const pays = rows.reduce((acc, s) => {
		const p = salePayments(s);
		acc.cash += p.cash;
		acc.card += p.card;
		acc.qr += p.qr;
		return acc;
	}, {
		cash: 0,
		card: 0,
		qr: 0
	});
	const dishes = topDishes(rows, 6);
	const open = scope === "all" ? null : openShiftFor(snap.shifts, scope);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Кипер + ручные чеки",
			title: "Продажи",
			description: "Чеки филиала, выручка и структура оплат. Импорт Z-отчёта кипера — в один шаг.",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
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
					}),
					canImportKeeper(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						onClick: () => {
							if (!open) {
								toast.error("Откройте смену, затем импортируйте отчёт кипера");
								return;
							}
							const mapped = mapKeeperReceipts(demoKeeperZReport(), snap.recipes, session.userId);
							const n = importKeeperSales(mapped);
							toast.success(`Забрано ${n} чеков из кипера`);
						},
						children: "Импорт кипера"
					}) : null,
					canCreateSale(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ManualSaleDialog, {
						recipes: snap.recipes,
						onSubmit: addManualSale,
						disabled: !open
					}) : null
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Выручка",
					value: rub(revenue),
					hint: `${rows.length} чеков`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Наличные",
					value: rub(pays.cash)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Карта",
					value: rub(pays.card)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "QR",
					value: rub(pays.qr)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "overflow-hidden p-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-b border-border px-5 py-4 text-sm font-medium",
					children: "Чеки"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-[520px] overflow-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "sticky top-0 bg-surface text-xs text-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-5 py-2 font-medium",
									children: "Чек"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Время"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Оплата"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-5 py-2 text-right font-medium",
									children: "Сумма"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.slice(0, 80).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-5 py-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium",
										children: s.number
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted",
										children: s.items.map((i) => i.name).join(", ")
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5 whitespace-nowrap text-muted",
									children: ruDateTime(s.at)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: PAYMENT_LABEL[s.payments[0]?.type ?? "card"] }), s.source === "keeper" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-[10px] tracking-wide text-subtle uppercase",
										children: "кипер"
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-5 py-2.5 text-right font-mono tabular-nums",
									children: rub(s.total)
								})
							]
						}, s.id)) })]
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 text-sm font-medium",
				children: "Состав продаж"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: dishes.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-muted tabular-nums",
						children: [
							d.qty,
							" · ",
							pct(d.sum / (revenue || 1) * 100, 0)
						]
					})]
				}, d.name))
			})] })]
		})
	] });
}
function ManualSaleDialog({ recipes, onSubmit, disabled }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [recipeId, setRecipeId] = (0, import_react.useState)(recipes[0]?.id ?? "");
	const [qty, setQty] = (0, import_react.useState)(1);
	const [items, setItems] = (0, import_react.useState)([]);
	const [pay, setPay] = (0, import_react.useState)("card");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				disabled,
				children: "Ручной чек"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
			title: "Чек без кипера",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-[1fr_88px] gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
							value: recipeId,
							onChange: (e) => setRecipeId(e.target.value),
							children: recipes.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: r.id,
								children: r.name
							}, r.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
							value: String(qty),
							onChange: (e) => setQty(Number(e.target.value)),
							children: [
								1,
								2,
								3,
								4
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: n,
								children: n
							}, n))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						className: "w-full",
						onClick: () => {
							const r = recipes.find((x) => x.id === recipeId);
							if (!r) return;
							setItems((prev) => [...prev, {
								recipeId: r.id,
								name: r.name,
								qty,
								price: r.price,
								sum: r.price * qty
							}]);
						},
						children: "Добавить позицию"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1 text-sm",
						children: items.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								it.name,
								" × ",
								it.qty
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: rub(it.sum)
							})]
						}, i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Оплата",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
							value: pay,
							onChange: (e) => setPay(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "cash",
									children: "Наличные"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "card",
									children: "Карта"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "qr",
									children: "QR"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "w-full",
						disabled: items.length === 0,
						onClick: () => {
							onSubmit(items, pay);
							setItems([]);
							setOpen(false);
							toast.success("Чек проведён, склад списан по техкарте");
						},
						children: ["Провести ", rub(items.reduce((s, i) => s + i.sum, 0))]
					})
				]
			})
		})]
	});
}
//#endregion
export { SalesPage as component };
