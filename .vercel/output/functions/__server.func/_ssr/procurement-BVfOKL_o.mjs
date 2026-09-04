import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { D as ruDate, a as REQUEST_LABEL, k as rub, s as TODAY, w as qty, y as needToBuy } from "./seed-C4rObjht.mjs";
import { i as useOps } from "./store-Bknmh7t3.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as Button, o as Card } from "./router-DjPwU5Qt.mjs";
import { n as Input, r as NativeSelect, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-b23vXdEV.mjs";
import { t as Segmented } from "./tabs-rt-h79IP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/procurement-BVfOKL_o.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProcurementPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const createRequestFromNeed = useOps((s) => s.createRequestFromNeed);
	const setRequestStatus = useOps((s) => s.setRequestStatus);
	const addInvoice = useOps((s) => s.addInvoice);
	const branchId = session.branchId === "all" ? "br-pushkin" : session.branchId;
	const need = needToBuy(snap, branchId);
	const [tab, setTab] = (0, import_react.useState)("need");
	const requests = snap.requests.filter((r) => r.branchId === branchId);
	const invoices = snap.invoices.filter((r) => r.branchId === branchId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Снабжение",
			title: "Закупки",
			description: "Минимальные остатки собирают заявку сами. Накладная ставит товар на приход и обновляет среднюю цену.",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					onClick: () => {
						if (!need.length) {
							toast.message("Всё в норме — заявку собирать не из чего");
							return;
						}
						createRequestFromNeed();
						toast.success("Заявка собрана из дефицита");
					},
					children: "Собрать заявку"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvoiceDialog, {
					products: snap.products,
					onSave: (data) => {
						addInvoice(data);
						toast.success("Накладная оприходована");
					}
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
			className: "mb-4",
			value: tab,
			onChange: setTab,
			options: [
				{
					value: "need",
					label: "Необходимо купить"
				},
				{
					value: "req",
					label: "Заявки"
				},
				{
					value: "inv",
					label: "Накладные"
				}
			]
		}),
		tab === "need" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "overflow-hidden p-0",
			children: need.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-5 py-8 text-sm text-muted",
				children: "Дефицита нет."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
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
							children: "Есть"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Мин."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 font-medium",
							children: "Докупить"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: need.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5",
							children: n.product.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2.5 font-mono tabular-nums",
							children: qty(n.have, n.product.unit)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2.5 font-mono tabular-nums",
							children: qty(n.min, n.product.unit)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono text-danger tabular-nums",
							children: qty(n.deficit, n.product.unit)
						})
					]
				}, n.product.id)) })]
			})
		}) : null,
		tab === "req" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: requests.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-sm font-medium",
						children: [
							r.number,
							" · ",
							ruDate(r.date)
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: r.note || `${r.lines.length} позиций`
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: r.status === "received" ? "success" : r.status === "sent" ? "primary" : "muted",
						children: REQUEST_LABEL[r.status]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-1 text-sm",
					children: r.lines.map((l) => {
						const p = snap.products.find((x) => x.id === l.productId);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p?.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono tabular-nums",
								children: qty(l.qty, p?.unit)
							})]
						}, l.productId);
					})
				}),
				r.status === "draft" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					className: "mt-3",
					onClick: () => setRequestStatus(r.id, "sent"),
					children: "Отправить поставщику"
				}) : null
			] }, r.id))
		}) : null,
		tab === "inv" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-bg text-xs text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 font-medium",
							children: "Накладная"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Поставщик"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Дата"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-2 text-right font-medium",
							children: "Сумма"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: invoices.map((inv) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-medium",
							children: inv.number
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2.5",
							children: inv.supplier
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2.5 text-muted",
							children: ruDate(inv.date)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 text-right font-mono tabular-nums",
							children: rub(inv.total)
						})
					]
				}, inv.id)) })]
			})
		}) : null
	] });
}
function InvoiceDialog({ products, onSave }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [supplier, setSupplier] = (0, import_react.useState)("Мясоопт Юг");
	const [number, setNumber] = (0, import_react.useState)("НФ-");
	const [productId, setProductId] = (0, import_react.useState)(products[0]?.id ?? "");
	const [q, setQ] = (0, import_react.useState)("10");
	const [price, setPrice] = (0, import_react.useState)("420");
	const [lines, setLines] = (0, import_react.useState)([]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Накладная" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			title: "Приход по накладной",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Поставщик",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: supplier,
							onChange: (e) => setSupplier(e.target.value)
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Номер",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: number,
							onChange: (e) => setNumber(e.target.value)
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid grid-cols-[1fr_70px_90px] gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
							value: productId,
							onChange: (e) => setProductId(e.target.value),
							children: products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: p.id,
								children: p.name
							}, p.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => setQ(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: price,
							onChange: (e) => setPrice(e.target.value)
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "mt-2 w-full",
					onClick: () => setLines((prev) => [...prev, {
						productId,
						qty: Number(q),
						price: Number(price)
					}]),
					children: "Строка"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 space-y-1 text-sm",
					children: lines.map((l, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: products.find((p) => p.id === l.productId)?.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: rub(l.qty * l.price)
						})]
					}, i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4 w-full",
					disabled: !lines.length,
					onClick: () => {
						onSave({
							supplier,
							number,
							date: TODAY,
							lines
						});
						setLines([]);
						setOpen(false);
					},
					children: "Поставить на приход"
				})
			]
		})]
	});
}
//#endregion
export { ProcurementPage as component };
