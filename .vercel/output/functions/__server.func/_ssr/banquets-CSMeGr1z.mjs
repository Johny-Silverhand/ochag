import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { D as ruDate, k as rub, l as addDays, s as TODAY, t as BANQUET_LABEL } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps } from "./store-Bknmh7t3.mjs";
import { C as uid, l as Button, o as Card } from "./router-DjPwU5Qt.mjs";
import { r as canEditBanquet } from "./permissions-DdHKqKg8.mjs";
import { n as Input, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { t as notify } from "./notify-BupvC7sZ.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-b23vXdEV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/banquets-CSMeGr1z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TONE = {
	inquiry: "muted",
	confirmed: "primary",
	deposit_paid: "success",
	done: "muted",
	cancelled: "danger"
};
function BanquetsPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const user = useSessionUser();
	const upsertBanquet = useOps((s) => s.upsertBanquet);
	const scope = session.branchId;
	const rows = snap.banquets.filter((b) => scope === "all" || b.branchId === scope).slice().sort((a, b) => a.date > b.date ? 1 : -1);
	const [cursor, setCursor] = (0, import_react.useState)(TODAY.slice(0, 7));
	const days = (0, import_react.useMemo)(() => monthCells(cursor), [cursor]);
	const byDay = /* @__PURE__ */ new Map();
	for (const b of rows) {
		const list = byDay.get(b.date) ?? [];
		list.push(b);
		byDay.set(b.date, list);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Банкетный стол",
			title: "Банкеты",
			description: "Календарь, залог и комплект листов: официантам, шашлычнику и на кухню — из одной карточки.",
			actions: canEditBanquet(user.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewBanquet, {
				onCreate: upsertBanquet,
				branchId: scope === "all" ? "br-embank" : scope
			}) : null
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center justify-between",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => setCursor(shiftMonth(cursor, -1)),
					children: "Назад"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium capitalize",
					children: monthTitle(cursor)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => setCursor(shiftMonth(cursor, 1)),
					children: "Вперёд"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "overflow-hidden p-3 sm:p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-7 gap-1 text-center text-[11px] text-muted",
				children: [
					"пн",
					"вт",
					"ср",
					"чт",
					"пт",
					"сб",
					"вс"
				].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "py-1",
					children: d
				}, d))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 grid grid-cols-7 gap-1",
				children: days.map((d) => {
					const items = d ? byDay.get(d) ?? [] : [];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `min-h-16 rounded-md p-1 sm:min-h-20 ${d ? "bg-bg" : ""} ${d === "2026-09-02" ? "ring-1 ring-primary/30" : ""}`,
						children: [d ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted",
							children: Number(d.slice(-2))
						}) : null, items.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/banquets/$id",
							params: { id: b.id },
							className: "mt-0.5 block truncate rounded-xs bg-primary/10 px-1 py-0.5 text-[10px] text-primary sm:text-xs",
							children: b.title
						}, b.id))]
					}, d ?? Math.random());
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 space-y-2",
			children: rows.filter((b) => b.date >= TODAY).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/banquets/$id",
				params: { id: b.id },
				className: "block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex flex-wrap items-center justify-between gap-3 p-4 transition-[box-shadow] duration-150 hover:shadow-(--shadow-border-hover)",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: b.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-muted",
						children: [
							ruDate(b.date, {
								day: "numeric",
								month: "long",
								weekday: "short"
							}),
							" · ",
							b.startTime,
							" · ",
							b.guests,
							" гостей · ",
							b.clientName
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-sm tabular-nums",
							children: rub(b.total)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: TONE[b.status],
							children: BANQUET_LABEL[b.status]
						})]
					})]
				})
			}, b.id))
		})
	] });
}
function monthCells(ym) {
	const [y, m] = ym.split("-").map(Number);
	const startPad = (new Date(y, (m ?? 1) - 1, 1).getDay() + 6) % 7;
	const last = new Date(y, m ?? 1, 0).getDate();
	const cells = [];
	for (let i = 0; i < startPad; i++) cells.push(null);
	for (let d = 1; d <= last; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
	while (cells.length % 7) cells.push(null);
	return cells;
}
function monthTitle(ym) {
	const [y, m] = ym.split("-").map(Number);
	return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric"
	});
}
function shiftMonth(ym, delta) {
	const [y, m] = ym.split("-").map(Number);
	const d = new Date(y, (m ?? 1) - 1 + delta, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function NewBanquet({ onCreate, branchId }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [client, setClient] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [date, setDate] = (0, import_react.useState)(addDays(TODAY, 7));
	const [guests, setGuests] = (0, import_react.useState)("24");
	const [total, setTotal] = (0, import_react.useState)("80000");
	const [deposit, setDeposit] = (0, import_react.useState)("20000");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Новый банкет" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
			title: "Карточка банкета",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Название",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: title,
							onChange: (e) => setTitle(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Клиент",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: client,
								onChange: (e) => setClient(e.target.value)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Телефон",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: phone,
								onChange: (e) => setPhone(e.target.value)
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Дата",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: date,
									onChange: (e) => setDate(e.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Гостей",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: guests,
									onChange: (e) => setGuests(e.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Сумма",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: total,
									onChange: (e) => setTotal(e.target.value)
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Залог",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: deposit,
							onChange: (e) => setDeposit(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => {
							if (!title || !client) return;
							onCreate({
								id: uid("bn"),
								number: `БН-${Math.floor(Math.random() * 80 + 110)}`,
								branchId,
								title,
								clientName: client,
								clientPhone: phone,
								date,
								startTime: "18:00",
								endTime: "23:00",
								guests: Number(guests) || 0,
								hall: "Основной зал",
								total: Number(total) || 0,
								deposit: Number(deposit) || 0,
								depositPaid: false,
								status: "inquiry",
								notes: "",
								waiterNotes: "",
								grillItems: [{
									name: "Шашлык свинина",
									qty: Math.round((Number(guests) || 0) * .25),
									unit: "кг",
									readyBy: "18:30"
								}],
								kitchenItems: [{
									name: "Салат свежий",
									qty: Number(guests) || 0,
									unit: "порц",
									readyBy: "17:40"
								}],
								serviceItems: [{
									name: "Приборы",
									qty: Number(guests) || 0,
									unit: "шт"
								}],
								timeline: [{
									time: "16:00",
									action: "Зал"
								}, {
									time: "18:00",
									action: "Встреча гостей"
								}]
							});
							setOpen(false);
							notify("banquet", "Банкет в календаре");
						},
						children: "Сохранить"
					})
				]
			})
		})]
	});
}
//#endregion
export { BanquetsPage as component };
