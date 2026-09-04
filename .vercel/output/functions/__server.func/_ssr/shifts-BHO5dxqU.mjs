import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { D as ruDate, M as shiftTotals, N as signedRub, O as ruDateTime, P as staffName, b as openShiftFor, k as rub } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps } from "./store-Bknmh7t3.mjs";
import { l as Button, o as Card } from "./router-DjPwU5Qt.mjs";
import { n as Input, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader, t as Kpi } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { t as notify } from "./notify-BupvC7sZ.mjs";
import { n as DialogContent, r as DialogTrigger, t as Dialog } from "./dialog-b23vXdEV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/shifts-BHO5dxqU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ShiftsPage() {
	const snap = useOps((s) => s);
	const session = useOps((s) => s.session);
	const user = useSessionUser();
	const openShift = useOps((s) => s.openShift);
	const closeShift = useOps((s) => s.closeShift);
	const branchId = session.branchId === "all" ? "br-pushkin" : session.branchId;
	const current = openShiftFor(snap.shifts, branchId);
	const totals = current ? shiftTotals(current, snap.sales) : null;
	const history = snap.shifts.filter((s) => s.branchId === branchId).slice().sort((a, b) => a.date < b.date ? 1 : -1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Касса",
			title: "Смены",
			description: "Открытие с разменном, закрытие без ручного подсчёта повара: система считает ожидаемую кассу из чеков.",
			actions: current ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseDialog, {
				expected: totals?.expected ?? 0,
				onClose: (closeCash, note) => {
					closeShift({
						closeCash,
						note
					});
					notify("shift", "Смена закрыта, зарплата начислена");
					notify("payroll", "ФОТ начислен по ставке и проценту");
				}
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenDialog, {
				staff: snap.users.filter((u) => u.branchId === branchId),
				defaultStaff: snap.users.filter((u) => u.branchId === branchId).map((u) => u.id),
				onOpen: (openCash, staffIds) => {
					openShift({
						openCash,
						staffIds
					});
					notify("shift", "Смена открыта");
				}
			})
		}),
		current && totals ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-muted",
					children: ["Текущая смена · ", ruDateTime(current.openedAt)]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-lg font-medium",
					children: ["Открыл ", staffName(snap.users, current.openedBy)]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: "success",
					children: "открыта"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Размен",
						value: rub(current.openCash)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Нал по чекам",
						value: rub(totals.cash)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Безнал",
						value: rub(totals.card + totals.qr)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Ожидается в кассе",
						value: rub(totals.expected),
						hint: `${totals.checks} чеков`
					})
				]
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "mb-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Смена на этом филиале закрыта. Откройте перед первым чеком."
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "overflow-hidden p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border px-5 py-4 text-sm font-medium",
				children: "История"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Дата"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Выручка"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Ожид. нал"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Факт"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Расхождение"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: history.map((s) => {
						const t = shiftTotals(s, snap.sales);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-5 py-2.5",
									children: [ruDate(s.date, {
										day: "numeric",
										month: "short",
										weekday: "short"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted",
										children: s.status === "open" ? "открыта" : "закрыта"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5 font-mono tabular-nums",
									children: rub(t.revenue)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5 font-mono tabular-nums",
									children: rub(s.expectedCash ?? t.expected)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2.5 font-mono tabular-nums",
									children: s.closeCash != null ? rub(s.closeCash) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-5 py-2.5 font-mono tabular-nums",
									children: s.discrepancy != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: s.discrepancy === 0 ? "text-success" : "text-danger",
										children: signedRub(s.discrepancy)
									}) : "—"
								})
							]
						}, s.id);
					}) })]
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-xs text-subtle",
			children: user.role === "cook" ? "Повару не нужно считать кассу: закрывает управляющий, ФОТ считается сам." : "При закрытии каждому в смене начисляется ставка + процент с выручки (если задан)."
		})
	] });
}
function OpenDialog({ staff, defaultStaff, onOpen }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [cash, setCash] = (0, import_react.useState)("15000");
	const [ids, setIds] = (0, import_react.useState)(defaultStaff);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Открыть смену" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
			title: "Открытие смены",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Наличные в кассе, ₽",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: cash,
							onChange: (e) => setCash(e.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1.5 text-xs font-medium text-muted",
						children: "Кто в смене"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1",
						children: staff.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex h-11 items-center gap-2 rounded-sm px-2 hover:bg-bg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: ids.includes(u.id),
								onChange: (e) => setIds((prev) => e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-sm",
								children: [
									u.name,
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted",
										children: ["· ", u.position]
									})
								]
							})]
						}) }, u.id))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "w-full",
						onClick: () => {
							onOpen(Number(cash) || 0, ids);
							setOpen(false);
						},
						children: "Открыть"
					})
				]
			})
		})]
	});
}
function CloseDialog({ expected, onClose }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [cash, setCash] = (0, import_react.useState)(String(Math.round(expected)));
	const [note, setNote] = (0, import_react.useState)("");
	const disc = (Number(cash) || 0) - expected;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Закрыть смену" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			title: "Закрытие кассы",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mb-3 text-sm text-muted",
					children: ["По чекам в ящике должно быть ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-fg",
						children: rub(expected)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Пересчёт наличных, ₽",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: cash,
						onChange: (e) => setCash(e.target.value),
						inputMode: "numeric"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: `mt-2 text-sm ${disc === 0 ? "text-success" : "text-danger"}`,
					children: ["Расхождение: ", signedRub(disc)]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Комментарий",
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: note,
						onChange: (e) => setNote(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4 w-full",
					onClick: () => {
						onClose(Number(cash) || 0, note);
						setOpen(false);
					},
					children: "Закрыть и начислить зарплату"
				})
			]
		})]
	});
}
//#endregion
export { ShiftsPage as component };
