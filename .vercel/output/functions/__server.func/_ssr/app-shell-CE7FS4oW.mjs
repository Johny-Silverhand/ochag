import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { d as useRouterState, m as Outlet, v as Link, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { o as ROLE_LABEL } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps, n as useActiveBranch, o as useSync } from "./store-Bknmh7t3.mjs";
import { C as ChefHat, S as ClipboardList, _ as Package, c as ShoppingCart, d as Settings, f as Receipt, g as Palette, i as Users, m as Plug, n as Wallet, v as LogOut, w as CalendarDays, x as Ellipsis, y as LayoutDashboard } from "../_libs/lucide-react.mjs";
import { S as cn, b as themeMeta, d as LabsFooter, p as APP_NAME, u as LabsCredit, v as THEMES, x as usePrefs, y as applyThemeChrome } from "./router-DjPwU5Qt.mjs";
import { o as canSeeAllBranches, t as can } from "./permissions-DdHKqKg8.mjs";
import { r as NativeSelect } from "./input-BghYMfst.mjs";
import { i as Trigger, n as Portal, r as Root2, t as Content2 } from "../_libs/@radix-ui/react-popover+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-CE7FS4oW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Popover = Root2;
var PopoverTrigger = Trigger;
function PopoverContent({ className, align = "end", sideOffset = 8, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		align,
		sideOffset,
		className: cn("z-50 w-72 rounded-xl bg-surface p-3 text-fg shadow-(--shadow-border) outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className),
		...props,
		children
	}) });
}
function ThemeSwitcher({ className }) {
	const theme = usePrefs((s) => s.theme);
	const setTheme = usePrefs((s) => s.setTheme);
	const density = usePrefs((s) => s.density);
	const motion = usePrefs((s) => s.motion);
	const typeScale = usePrefs((s) => s.typeScale);
	const current = themeMeta(theme);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			"aria-label": "Сменить тему",
			className: cn("flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-fg md:size-9", className),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "size-4 rounded-full shadow-(--shadow-border)",
				style: { background: current.preview.primary }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "sr-only",
				children: ["Тема: ", current.label]
			})]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
		className: "w-64",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center gap-2 px-0.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Palette, {
				className: "size-3.5 text-muted",
				strokeWidth: 1.75
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs font-medium tracking-wide text-muted uppercase",
				children: "Тема"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-4 gap-1.5",
			children: THEMES.map((item) => {
				const active = theme === item.id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onPointerDown: () => {
						applyThemeChrome(item.id, density, motion, typeScale);
						setTheme(item.id);
					},
					onClick: () => setTheme(item.id),
					"aria-pressed": active,
					className: cn("flex flex-col items-center gap-1.5 rounded-md p-1.5 text-center transition-colors duration-150", active ? "bg-bg" : "hover:bg-bg/70"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: cn("flex size-8 overflow-hidden rounded-full shadow-(--shadow-border)", active && "ring-2 ring-ring/60 ring-offset-2 ring-offset-surface"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-2/5",
							style: { background: item.preview.sidebar }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex-1",
							style: { background: item.preview.bg }
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] leading-none text-muted",
						children: item.label
					})]
				}, item.id);
			})
		})]
	})] });
}
var NAV = [
	{
		to: "/dashboard",
		label: "Обзор",
		icon: LayoutDashboard,
		module: "dashboard"
	},
	{
		to: "/sales",
		label: "Продажи",
		icon: Receipt,
		module: "sales"
	},
	{
		to: "/inventory",
		label: "Склад",
		icon: Package,
		module: "inventory"
	},
	{
		to: "/recipes",
		label: "Техкарты",
		icon: ChefHat,
		module: "recipes"
	},
	{
		to: "/shifts",
		label: "Смены",
		icon: Wallet,
		module: "shifts"
	},
	{
		to: "/procurement",
		label: "Закупки",
		icon: ShoppingCart,
		module: "procurement"
	},
	{
		to: "/banquets",
		label: "Банкеты",
		icon: CalendarDays,
		module: "banquets"
	},
	{
		to: "/staff",
		label: "Сотрудники",
		icon: Users,
		module: "staff"
	},
	{
		to: "/reports",
		label: "Отчёты",
		icon: ClipboardList,
		module: "reports"
	},
	{
		to: "/integrations",
		label: "Интеграции",
		icon: Plug,
		module: "integrations"
	}
];
var SETTINGS_ITEM = {
	to: "/settings",
	label: "Настройки",
	icon: Settings,
	module: "settings"
};
function mobilePrimary(role, items) {
	return (role === "cook" ? [
		"/dashboard",
		"/inventory",
		"/shifts",
		"/banquets"
	] : [
		"/dashboard",
		"/sales",
		"/shifts",
		"/banquets"
	]).map((to) => items.find((i) => i.to === to)).filter((i) => Boolean(i));
}
function Mark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "32",
				height: "32",
				rx: "8",
				fill: "currentColor",
				opacity: "0.12"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M8 22.5c0-6 4-11 8-13.5 4 2.5 8 7.5 8 13.5 0 1.8-1.6 3-4 3H12c-2.4 0-4-1.2-4-3Z",
				fill: "currentColor"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M12.5 22.5c.6-3.2 2.2-5.4 3.5-6.6 1.3 1.2 2.9 3.4 3.5 6.6",
				stroke: "currentColor",
				strokeWidth: "1.2",
				fill: "none",
				opacity: "0.55"
			})
		]
	});
}
function NavLink({ item, pathname, className, activeClass, idleClass }) {
	const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: item.to,
		className: cn(className, active ? activeClass : idleClass),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
			className: "size-4",
			strokeWidth: 1.75
		}), item.label]
	});
}
function AppShell() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const user = useSessionUser();
	const branch = useActiveBranch();
	const session = useOps((s) => s.session);
	const branches = useOps((s) => s.branches);
	const setBranch = useOps((s) => s.setBranch);
	const logout = useOps((s) => s.logout);
	const navigate = useNavigate();
	const role = user?.role ?? "waiter";
	const [moreOpen, setMoreOpen] = (0, import_react.useState)(false);
	const items = NAV.filter((n) => can(role, n.module));
	const primary = mobilePrimary(role, items);
	const moreItems = [...items.filter((i) => !primary.some((p) => p.to === i.to)), SETTINGS_ITEM];
	const current = [...NAV, SETTINGS_ITEM].find((n) => pathname === n.to || n.to !== "/dashboard" && pathname.startsWith(`${n.to}/`));
	(0, import_react.useEffect)(() => {
		if (current && !can(role, current.module)) navigate({ to: "/dashboard" });
	}, [
		current,
		role,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		setMoreOpen(false);
	}, [pathname]);
	const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
	const moreActive = moreOpen || moreItems.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
	const sync = useSync();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "app-frame min-h-dvh bg-bg text-fg md:grid md:h-dvh md:grid-cols-[220px_1fr] md:overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "no-print hidden bg-sidebar text-sidebar-fg md:flex md:h-full md:flex-col md:overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5 px-5 pt-6 pb-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-8 text-sidebar-fg" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold tracking-wide",
							children: APP_NAME
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-sidebar-muted",
							children: "Victimok Labs"
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 scroll-touch",
						children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
							item,
							pathname,
							className: "flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm transition-colors duration-150",
							activeClass: "bg-sidebar-fg/12 text-sidebar-fg",
							idleClass: "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
						}, item.to))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto px-3 pb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavLink, {
							item: SETTINGS_ITEM,
							pathname,
							className: "flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm transition-colors duration-150",
							activeClass: "bg-sidebar-fg/12 text-sidebar-fg",
							idleClass: "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-sidebar-fg/10 p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/settings",
								className: "block rounded-sm py-0.5 hover:opacity-90",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm font-medium",
									children: user?.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-sidebar-muted",
									children: ROLE_LABEL[role]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									logout();
									navigate({ to: "/" });
								},
								className: "mt-3 flex h-9 items-center gap-2 text-xs text-sidebar-muted hover:text-sidebar-fg",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-3.5" }), "Выйти"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, {
								tone: "sidebar",
								align: "left",
								compact: true,
								className: "mt-4"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 min-w-0 flex-col overflow-y-auto pb-[calc(5.25rem+env(safe-area-inset-bottom))] scroll-touch md:h-full md:overflow-hidden md:pb-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 md:hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-7 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-semibold tracking-wide",
							children: APP_NAME
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2",
						children: [
							canSeeAllBranches(role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
								className: "h-11 w-36 bg-surface sm:w-52 md:h-9",
								value: session?.branchId ?? "all",
								onChange: (e) => setBranch(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "all",
									children: "Все филиалы"
								}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: b.id,
									children: b.short
								}, b.id))]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-sm text-muted",
								children: branch?.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: cn("hidden items-center gap-1.5 rounded-full px-2 py-1 text-[11px] sm:inline-flex", sync.status === "error" ? "bg-danger-soft text-danger" : "bg-surface text-muted"),
								title: sync.source === "neon" ? "Neon Postgres" : "Postgres",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", sync.status === "saving" ? "bg-warning" : sync.status === "error" ? "bg-danger" : "bg-success") }), sync.status === "saving" ? "запись" : sync.status === "error" ? "база" : "база"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeSwitcher, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/settings",
								"aria-label": "Настройки",
								className: cn("flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-fg md:size-9", settingsActive && "bg-surface text-primary"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
									className: "size-4",
									strokeWidth: 1.75
								})
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 py-5 scroll-touch sm:px-6 sm:py-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsFooter, { className: "mt-12 mb-1" })]
				})]
			}),
			moreOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-0 z-50 md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "absolute inset-0 bg-fg/35",
					"aria-label": "Закрыть",
					onClick: () => setMoreOpen(false)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-(--shadow-border)",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs font-medium tracking-wide text-muted uppercase",
							children: "Ещё"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "grid grid-cols-2 gap-1.5",
							children: moreItems.map((item) => {
								const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: item.to,
									className: cn("flex h-14 items-center gap-2.5 rounded-md px-3 text-sm", active ? "bg-bg text-fg" : "text-muted hover:bg-bg hover:text-fg"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
										className: "size-4",
										strokeWidth: 1.75
									}), item.label]
								}, item.to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, {
							className: "mt-4",
							compact: true
						})
					]
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "ios-tabbar no-print fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-surface/95 backdrop-blur-sm md:hidden",
				style: { gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` },
				children: [primary.map((item) => {
					const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.to,
						className: cn("flex min-h-14 flex-col items-center justify-center gap-1 pt-1.5 text-[11px]", active ? "text-primary" : "text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
							className: "size-5",
							strokeWidth: 1.75
						}), item.label]
					}, item.to);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setMoreOpen(true),
					className: cn("flex min-h-14 flex-col items-center justify-center gap-1 pt-1.5 text-[11px]", moreActive ? "text-primary" : "text-muted"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {
						className: "size-5",
						strokeWidth: 1.75
					}), "Ещё"]
				})]
			})
		]
	});
}
function BootScreen() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-semibold tracking-[0.22em]",
				children: "ОЧАГ"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 text-xs text-muted",
				children: "Загрузка контура…"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, { className: "absolute inset-x-0 bottom-8" })]
	});
}
//#endregion
export { BootScreen as n, AppShell as t };
