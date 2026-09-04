import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { F as stockOf, O as ruDateTime, c as WRITEOFF_LABEL, k as rub, r as MOVEMENT_LABEL, w as qty } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps } from "./store-Bknmh7t3.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as Button, o as Card, x as usePrefs } from "./router-DjPwU5Qt.mjs";
import { s as canWriteoff } from "./permissions-DdHKqKg8.mjs";
import { i as Textarea, n as Input, r as NativeSelect, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { t as notify } from "./notify-BupvC7sZ.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-b23vXdEV.mjs";
import { t as Segmented } from "./tabs-rt-h79IP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/inventory-DXA4JyDt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function InventoryPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const user = useSessionUser();
	const addWriteoff = useOps((s) => s.addWriteoff);
	const completeRevision = useOps((s) => s.completeRevision);
	const showFoodCost = usePrefs((s) => s.showFoodCost);
	const branchId = session.branchId === "all" ? "br-pushkin" : session.branchId;
	const [tab, setTab] = (0, import_react.useState)("stock");
	const [q, setQ] = (0, import_react.useState)("");
	const stockRows = (0, import_react.useMemo)(() => {
		return snap.products.map((p) => {
			const have = stockOf(snap.stock, branchId, p.id);
			return {
				p,
				have,
				status: have < p.minQty * .4 ? "crit" : have < p.minQty ? "low" : "ok"
			};
		}).filter((r) => r.p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.have / a.p.minQty - b.have / b.p.minQty);
	}, [
		snap,
		branchId,
		q
	]);
	const movs = snap.movements.filter((m) => m.branchId === branchId).slice().sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 60);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Товароучёт",
			title: "Склад",
			description: "Остатки, списания и ревизия. Продажа автоматически списывает ингредиенты по техкарте.",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [canWriteoff(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WriteoffDialog, {
					products: snap.products,
					onSubmit: (input) => {
						addWriteoff(input);
						notify("writeoff", "Списание проведено");
					}
				}) : null, canWriteoff(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RevisionDialog, {
					rows: stockRows.map((r) => ({
						id: r.p.id,
						name: r.p.name,
						unit: r.p.unit,
						have: r.have
					})),
					onSubmit: (lines) => {
						completeRevision(lines, "Ревизия с планшета");
						toast.success("Ревизия закрыта, расхождения проведены");
					}
				}) : null]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
				value: tab,
				onChange: setTab,
				options: [{
					value: "stock",
					label: "Остатки"
				}, {
					value: "mov",
					label: "Движения"
				}]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				className: "max-w-xs",
				placeholder: "Поиск продукта",
				value: q,
				onChange: (e) => setQ(e.target.value)
			})]
		}),
		tab === "stock" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-bg text-xs text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Продукт"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Остаток"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Мин."
							}),
							showFoodCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Себест."
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Статус"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: stockRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-5 py-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: r.p.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted",
									children: r.p.category
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2.5 font-mono tabular-nums",
								children: qty(r.have, r.p.unit)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2.5 font-mono text-muted tabular-nums",
								children: qty(r.p.minQty, r.p.unit)
							}),
							showFoodCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2.5 font-mono tabular-nums",
								children: rub(r.p.avgCost)
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									tone: r.status === "ok" ? "success" : r.status === "low" ? "warning" : "danger",
									children: r.status === "ok" ? "норма" : r.status === "low" ? "закуп" : "критично"
								})
							})
						]
					}, r.p.id)) })]
				})
			})
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-bg text-xs text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 font-medium",
							children: "Когда"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Тип"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Продукт"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 text-right font-medium",
							children: "Кол-во"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: movs.map((m) => {
					const p = snap.products.find((x) => x.id === m.productId);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-2.5 text-muted",
								children: ruDateTime(m.at)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-3 py-2.5",
								children: [MOVEMENT_LABEL[m.type], m.reason ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-subtle",
									children: WRITEOFF_LABEL[m.reason]
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2.5",
								children: p?.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: `px-5 py-2.5 text-right font-mono tabular-nums ${m.qty < 0 ? "text-danger" : "text-success"}`,
								children: [m.qty > 0 ? "+" : "", qty(m.qty, p?.unit)]
							})
						]
					}, m.id);
				}) })]
			})
		})
	] });
}
function WriteoffDialog({ products, onSubmit }) {
	const requireNote = usePrefs((s) => s.requireWriteoffNote);
	const defaultReason = usePrefs((s) => s.defaultWriteoffReason);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [productId, setProductId] = (0, import_react.useState)(products[0]?.id ?? "");
	const [qtyV, setQtyV] = (0, import_react.useState)("1");
	const [reason, setReason] = (0, import_react.useState)(defaultReason);
	const [note, setNote] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (next) => {
			setOpen(next);
			if (next) setReason(defaultReason);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				children: "Списание"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
			title: "Списать продукт",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Продукт",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
							value: productId,
							onChange: (e) => setProductId(e.target.value),
							children: products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: p.id,
								children: p.name
							}, p.id))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Количество",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.1",
							value: qtyV,
							onChange: (e) => setQtyV(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Причина",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
							value: reason,
							onChange: (e) => setReason(e.target.value),
							children: Object.entries(WRITEOFF_LABEL).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: k,
								children: v
							}, k))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: requireNote ? "Комментарий (обязательно)" : "Комментарий",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: note,
							onChange: (e) => setNote(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "w-full",
						onClick: () => {
							if (requireNote && note.trim().length < 2) {
								toast.error("Укажите комментарий к списанию");
								return;
							}
							onSubmit({
								productId,
								qty: Number(qtyV),
								reason,
								note
							});
							setOpen(false);
							setNote("");
						},
						children: "Провести списание"
					})
				]
			})
		})]
	});
}
function RevisionDialog({ rows, onSubmit }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [facts, setFacts] = (0, import_react.useState)({});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Ревизия" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			title: "Снять фактические остатки",
			className: "max-w-xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-h-80 space-y-2 overflow-auto pr-1",
				children: rows.slice(0, 12).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-[1fr_90px_90px] items-center gap-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [r.name, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted",
							children: ["книга ", qty(r.have, r.unit)]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-right font-mono text-xs text-muted tabular-nums",
							children: r.have
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: facts[r.id] ?? String(r.have),
							onChange: (e) => setFacts((f) => ({
								...f,
								[r.id]: e.target.value
							}))
						})
					]
				}, r.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-4 w-full",
				onClick: () => {
					onSubmit(rows.slice(0, 12).map((r) => ({
						productId: r.id,
						bookQty: r.have,
						factQty: Number(facts[r.id] ?? r.have)
					})));
					setOpen(false);
				},
				children: "Закрыть ревизию"
			})]
		})]
	});
}
//#endregion
export { InventoryPage as component };
