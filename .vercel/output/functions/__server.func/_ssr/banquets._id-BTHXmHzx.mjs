import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { D as ruDate, d as banquetBalance, k as rub, t as BANQUET_LABEL } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps } from "./store-Bknmh7t3.mjs";
import { p as Printer } from "../_libs/lucide-react.mjs";
import { l as Button, o as Card, r as Route$1 } from "./router-DjPwU5Qt.mjs";
import { r as canEditBanquet } from "./permissions-DdHKqKg8.mjs";
import { i as Textarea, r as NativeSelect } from "./input-BghYMfst.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { t as notify } from "./notify-BupvC7sZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/banquets._id-BTHXmHzx.js
var import_jsx_runtime = require_jsx_runtime();
function BanquetDetail() {
	const { id } = Route$1.useParams();
	const banquet = useOps((s) => s.banquets.find((b) => b.id === id));
	const branch = useOps((s) => s.branches.find((b) => b.id === banquet?.branchId));
	const setBanquetStatus = useOps((s) => s.setBanquetStatus);
	const upsertBanquet = useOps((s) => s.upsertBanquet);
	const user = useSessionUser();
	if (!banquet) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Банкет не найден."
	});
	const rest = banquetBalance(banquet);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: banquet.number,
			title: banquet.title,
			description: `${ruDate(banquet.date, {
				weekday: "long",
				day: "numeric",
				month: "long"
			})} · ${banquet.startTime}–${banquet.endTime} · ${branch?.name}`,
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/print/banquet/$id",
						params: { id: banquet.id },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-4" }), "Печать комплекта"]
					})
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 lg:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: "Клиент"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 font-medium",
						children: banquet.clientName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm text-muted",
						children: banquet.clientPhone
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 text-xs text-muted",
						children: "Зал"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm",
						children: banquet.hall
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 text-xs text-muted",
						children: "Гостей"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-mono text-lg tabular-nums",
						children: banquet.guests
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: "Сумма / залог"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 font-mono text-2xl tabular-nums",
						children: rub(banquet.total)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 text-sm",
						children: [
							"Залог ",
							rub(banquet.deposit),
							" · ",
							banquet.depositPaid ? "внесён" : "не внесён"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 text-sm text-muted",
						children: ["К доплате ", rub(rest)]
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted",
					children: "Статус"
				}), canEditBanquet(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
					className: "mt-2",
					value: banquet.status,
					onChange: (e) => {
						const status = e.target.value;
						setBanquetStatus(banquet.id, status);
						if (status === "deposit_paid") upsertBanquet({
							...banquet,
							status,
							depositPaid: true
						});
						notify("banquet", "Статус банкета обновлён");
					},
					children: Object.entries(BANQUET_LABEL).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: k,
						children: v
					}, k))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: BANQUET_LABEL[banquet.status] })
				})] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetCard, {
					title: "Официантам",
					items: banquet.serviceItems,
					extra: banquet.waiterNotes
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetCard, {
					title: "Шашлычнику",
					items: banquet.grillItems
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetCard, {
					title: "На кухню",
					items: banquet.kitchenItems
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium",
					children: "Тайминг"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: banquet.timeline.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex gap-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-14 font-mono text-muted tabular-nums",
							children: t.time
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.action })]
					}, t.time))
				}),
				canEditBanquet(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					className: "mt-4",
					value: banquet.notes,
					onChange: (e) => upsertBanquet({
						...banquet,
						notes: e.target.value
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: banquet.notes
				})
			]
		})
	] });
}
function SheetCard({ title, items, extra }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-sm font-medium",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 space-y-2 text-sm",
			children: items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					it.name,
					it.readyBy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "block text-xs text-muted",
						children: ["к ", it.readyBy]
					}) : null,
					it.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-subtle",
						children: it.notes
					}) : null
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono tabular-nums whitespace-nowrap",
					children: [
						it.qty,
						" ",
						it.unit
					]
				})]
			}, it.name))
		}),
		extra ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-xs text-muted",
			children: extra
		}) : null
	] });
}
//#endregion
export { BanquetDetail as component };
