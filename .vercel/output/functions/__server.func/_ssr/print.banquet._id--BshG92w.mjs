import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { D as ruDate, k as rub } from "./seed-C4rObjht.mjs";
import { i as useOps, r as useHydrated } from "./store-Bknmh7t3.mjs";
import { l as Button, m as LABS_CREDIT, n as Route, p as APP_NAME } from "./router-DjPwU5Qt.mjs";
import { n as BootScreen } from "./app-shell-CE7FS4oW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/print.banquet._id--BshG92w.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PrintBanquet() {
	const { id } = Route.useParams();
	const hydrated = useHydrated();
	const banquet = useOps((s) => s.banquets.find((b) => b.id === id));
	const branch = useOps((s) => s.branches.find((b) => b.id === banquet?.branchId));
	(0, import_react.useEffect)(() => {
		if (hydrated && banquet) {
			const t = window.setTimeout(() => window.print(), 400);
			return () => window.clearTimeout(t);
		}
	}, [hydrated, banquet]);
	if (!hydrated) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BootScreen, {});
	if (!banquet) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "p-8 text-sm",
		children: "Банкет не найден."
	});
	const sheets = [
		{
			role: "Официантам",
			hint: "На холодильник в сервисной",
			lines: banquet.serviceItems,
			notes: banquet.waiterNotes
		},
		{
			role: "Шашлычнику",
			hint: "На мангал",
			lines: banquet.grillItems,
			notes: ""
		},
		{
			role: "На кухню",
			hint: "Холодный и горячий цех",
			lines: banquet.kitchenItems,
			notes: banquet.notes
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "no-print flex items-center justify-between px-6 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/banquets/$id",
					params: { id },
					children: "Назад"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => window.print(),
				children: "Печать"
			})]
		}), sheets.map((sheet) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "print-page mx-auto max-w-2xl bg-elevated px-10 py-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between border-b border-fg/15 pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs tracking-[0.22em] uppercase",
							children: [
								APP_NAME,
								" · ",
								branch?.short
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-2 text-3xl font-medium tracking-tight",
							children: sheet.role
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: sheet.hint
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-right text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: banquet.number
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: ruDate(banquet.date, {
								day: "numeric",
								month: "long"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								banquet.startTime,
								"–",
								banquet.endTime
							] })
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-5 grid grid-cols-3 gap-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "Событие"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-medium",
							children: banquet.title
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "Гостей"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-mono text-lg",
							children: banquet.guests
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "Зал"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: banquet.hall })] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "mt-6 w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-fg/15 text-xs text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-medium",
								children: "Позиция"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-medium",
								children: "Кол-во"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-medium",
								children: "К"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-medium",
								children: "Заметка"
							})
						]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: sheet.lines.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-fg/10",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2.5",
								children: l.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "py-2.5 font-mono",
								children: [
									l.qty,
									" ",
									l.unit
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2.5",
								children: l.readyBy ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2.5 text-muted",
								children: l.notes ?? ""
							})
						]
					}, l.name)) })]
				}),
				banquet.timeline.length > 0 && sheet.role === "Официантам" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs tracking-wide text-muted uppercase",
						children: "Тайминг"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-1 text-sm",
						children: banquet.timeline.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: t.time
							}),
							" — ",
							t.action
						] }, t.time))
					})]
				}) : null,
				sheet.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-sm",
					children: sheet.notes
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-10 flex justify-between text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Клиент: ", banquet.clientName] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"Сумма ",
						rub(banquet.total),
						" · залог ",
						banquet.depositPaid ? "есть" : "нет"
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-8 text-[10px] tracking-wide text-subtle",
					children: LABS_CREDIT
				})
			]
		}, sheet.role))]
	});
}
//#endregion
export { PrintBanquet as component };
