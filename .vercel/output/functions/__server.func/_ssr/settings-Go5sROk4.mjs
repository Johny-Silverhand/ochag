import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { c as WRITEOFF_LABEL, o as ROLE_LABEL } from "./seed-C4rObjht.mjs";
import { a as useSessionUser, i as useOps, n as useActiveBranch } from "./store-Bknmh7t3.mjs";
import { C as ChefHat, T as Bell, a as UserRound, b as Info, g as Palette, l as Shield, r as UtensilsCrossed, s as Smartphone, v as LogOut } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { S as cn, _ as SETUP_EXE, a as useIosInstall, f as LabsMark, g as LABS_YEAR, h as LABS_NAME, i as IosInstallCard, l as Button, o as Card, p as APP_NAME, u as LabsCredit, v as THEMES, x as usePrefs, y as applyThemeChrome } from "./router-DjPwU5Qt.mjs";
import { a as canResetDemo } from "./permissions-DdHKqKg8.mjs";
import { n as Input, r as NativeSelect, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-b23vXdEV.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-Go5sROk4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Switch({ checked, onCheckedChange, disabled, className, id }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
		id,
		checked,
		onCheckedChange,
		disabled,
		className: cn("inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border-strong transition-[background-color,opacity] duration-150 ease-[var(--ease-out-smooth)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40 data-[state=checked]:bg-primary", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: "block size-5 translate-x-0.5 rounded-full bg-elevated shadow-(--shadow-border) transition-transform duration-150 ease-[var(--ease-out-smooth)] data-[state=checked]:translate-x-5" })
	});
}
function Separator({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("h-px w-full bg-border", className) });
}
function xml(value) {
	const amp = String.fromCharCode(38);
	return Array.from(value).map((ch) => {
		if (ch === "&") return `${amp}amp;`;
		if (ch === "<") return `${amp}lt;`;
		if (ch === ">") return `${amp}gt;`;
		if (ch === "\"") return `${amp}quot;`;
		return ch;
	}).join("");
}
function buildWebClipProfile(opts) {
	const label = opts.label ?? "Очаг";
	return [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">",
		"<plist version=\"1.0\">",
		"<dict>",
		"  <key>PayloadContent</key>",
		"  <array>",
		"    <dict>",
		"      <key>FullScreen</key>",
		"      <true/>",
		"      <key>Icon</key>",
		`      <data>${opts.iconPngBase64}</data>`,
		"      <key>IsRemovable</key>",
		"      <true/>",
		"      <key>Label</key>",
		`      <string>${xml(label)}</string>`,
		"      <key>PayloadDescription</key>",
		"      <string>Иконка контура Очаг на экране Домой</string>",
		"      <key>PayloadDisplayName</key>",
		`      <string>${xml(label)}</string>`,
		"      <key>PayloadIdentifier</key>",
		"      <string>labs.victimok.ochag.webclip</string>",
		"      <key>PayloadType</key>",
		"      <string>com.apple.webClip.managed</string>",
		"      <key>PayloadUUID</key>",
		`      <string>A3E1C0B2-7D44-4F1A-9B11-0C8A6E2F4D70</string>`,
		"      <key>PayloadVersion</key>",
		"      <integer>1</integer>",
		"      <key>Precomposed</key>",
		"      <true/>",
		"      <key>URL</key>",
		`      <string>${xml(opts.url)}</string>`,
		"    </dict>",
		"  </array>",
		"  <key>PayloadDescription</key>",
		"  <string>Ставит Очаг на экран Домой. Victimok Labs.</string>",
		"  <key>PayloadDisplayName</key>",
		"  <string>Очаг — Victimok Labs</string>",
		"  <key>PayloadIdentifier</key>",
		"  <string>labs.victimok.ochag</string>",
		"  <key>PayloadOrganization</key>",
		"  <string>Victimok Labs</string>",
		"  <key>PayloadRemovalDisallowed</key>",
		"  <false/>",
		"  <key>PayloadType</key>",
		"  <string>Configuration</string>",
		"  <key>PayloadUUID</key>",
		`  <string>B4F2D1C3-8E55-402B-8C22-1D9B7F3E5E81</string>`,
		"  <key>PayloadVersion</key>",
		"  <integer>1</integer>",
		"</dict>",
		"</plist>",
		""
	].join("\n");
}
async function downloadWebClip(origin = window.location.origin) {
	const buf = await (await fetch("/apple-touch-icon.png")).arrayBuffer();
	const bytes = new Uint8Array(buf);
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
	const xmlDoc = buildWebClipProfile({
		url: origin,
		iconPngBase64: btoa(binary)
	});
	const blob = new Blob([xmlDoc], { type: "application/x-apple-aspen-config" });
	const href = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = href;
	a.download = "Ochag.mobileconfig";
	a.click();
	URL.revokeObjectURL(href);
}
function sectionsFor(role) {
	const items = [
		{
			id: "appearance",
			label: "Внешний вид",
			icon: Palette
		},
		{
			id: "profile",
			label: "Профиль",
			icon: UserRound
		},
		{
			id: "alerts",
			label: "Сигналы",
			icon: Bell
		}
	];
	if (role === "cook") items.push({
		id: "role",
		label: "Кухня",
		icon: ChefHat
	});
	if (role === "waiter") items.push({
		id: "role",
		label: "Зал",
		icon: UtensilsCrossed
	});
	if (role === "owner" || role === "manager") items.push({
		id: "workspace",
		label: "Сеть",
		icon: Shield
	});
	items.push({
		id: "iphone",
		label: "iPhone",
		icon: Smartphone
	});
	items.push({
		id: "about",
		label: "О программе",
		icon: Info
	});
	return items;
}
function SettingsPage() {
	const role = useSessionUser().role;
	const nav = sectionsFor(role);
	const [section, setSection] = (0, import_react.useState)("appearance");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		eyebrow: "Контур",
		title: "Настройки",
		description: "Тема, профиль и сигналы — у каждой роли. Дальше страница сужается под вашу смену."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
			className: "no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0",
			children: nav.map((item) => {
				const active = section === item.id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setSection(item.id),
					className: cn("flex h-11 shrink-0 items-center gap-2 rounded-sm px-3 text-sm transition-colors duration-150", active ? "bg-surface text-fg shadow-(--shadow-border)" : "text-muted hover:bg-surface/70 hover:text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
						className: "size-4",
						strokeWidth: 1.75
					}), item.label]
				}, item.id);
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [
				section === "appearance" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearancePanel, {}) : null,
				section === "profile" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfilePanel, {}) : null,
				section === "alerts" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertsPanel, { role }) : null,
				section === "role" && role === "cook" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KitchenPanel, {}) : null,
				section === "role" && role === "waiter" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServicePanel, {}) : null,
				section === "workspace" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspacePanel, { role }) : null,
				section === "iphone" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IphonePanel, {}) : null,
				section === "about" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AboutPanel, {}) : null
			]
		})]
	})] });
}
function AppearancePanel() {
	const theme = usePrefs((s) => s.theme);
	const setTheme = usePrefs((s) => s.setTheme);
	const density = usePrefs((s) => s.density);
	const setDensity = usePrefs((s) => s.setDensity);
	const motion = usePrefs((s) => s.motion);
	const setMotion = usePrefs((s) => s.setMotion);
	const typeScale = usePrefs((s) => s.typeScale);
	const setTypeScale = usePrefs((s) => s.setTypeScale);
	const light = THEMES.filter((t) => t.group === "light");
	const dark = THEMES.filter((t) => t.group === "dark");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Цветовая тема"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Семь палитр под зал, ночную смену и отчёты. Меняется сразу на всём контуре."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeGroup, {
				title: "Светлые",
				items: light,
				active: theme,
				onSelect: setTheme
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeGroup, {
				title: "Тёмные",
				items: dark,
				active: theme,
				onSelect: setTheme,
				className: "mt-5"
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-sm font-medium tracking-tight",
			children: "Плотность и чтение"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 divide-y divide-border",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Компактный вид",
					hint: "Меньше воздуха в карточках — удобно на планшете у кассы.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: density === "compact",
						onCheckedChange: (v) => setDensity(v ? "compact" : "comfortable")
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Крупный шрифт",
					hint: "Для зала при плохом свете и для кухни с планшета на стене.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: typeScale === "large",
						onCheckedChange: (v) => setTypeScale(v ? "large" : "normal")
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Меньше анимации",
					hint: "Отключает появление блоков, если мешает на слабом устройстве.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: motion === "reduce",
						onCheckedChange: (v) => setMotion(v ? "reduce" : "system")
					})
				})
			]
		})] })]
	});
}
function ThemeGroup({ title, items, active, onSelect, className }) {
	const density = usePrefs((s) => s.density);
	const motion = usePrefs((s) => s.motion);
	const typeScale = usePrefs((s) => s.typeScale);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-2 text-xs font-medium tracking-wide text-muted uppercase",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
			children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeSwatch, {
				id: item.id,
				label: item.label,
				hint: item.hint,
				bg: item.preview.bg,
				sidebar: item.preview.sidebar,
				primary: item.preview.primary,
				surface: item.preview.surface,
				active: active === item.id,
				onSelect: () => {
					applyThemeChrome(item.id, density, motion, typeScale);
					onSelect(item.id);
				}
			}, item.id))
		})]
	});
}
function ThemeSwatch({ label, hint, bg, sidebar, primary, surface, active, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onPointerDown: () => onSelect(),
		onClick: onSelect,
		"aria-pressed": active,
		"aria-label": label,
		className: cn("rounded-xl p-2 text-left transition-[box-shadow,transform] duration-150 ease-[var(--ease-out-smooth)] active:scale-[0.99]", active ? "shadow-(--shadow-border-hover) ring-2 ring-ring/50" : "shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-hidden rounded-md",
			style: { background: bg },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-16",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-7",
					style: { background: sidebar }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-1 flex-col gap-1.5 p-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-6 rounded-sm shadow-(--shadow-border)",
						style: { background: surface }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-2 w-8 rounded-full",
							style: { background: primary }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-2 w-5 rounded-full opacity-40",
							style: { background: sidebar }
						})]
					})]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 px-0.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium",
					children: label
				}), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: "primary",
					className: "px-1.5 py-0 text-[10px]",
					children: "сейчас"
				}) : null]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-[11px] leading-snug text-muted",
				children: hint
			})]
		})]
	});
}
function ProfilePanel() {
	const user = useSessionUser();
	const session = useOps((s) => s.session);
	const branch = useActiveBranch();
	const updateProfile = useOps((s) => s.updateProfile);
	const logout = useOps((s) => s.logout);
	const navigate = useNavigate();
	const [name, setName] = (0, import_react.useState)(user.name);
	const [phone, setPhone] = (0, import_react.useState)(user.phone);
	const [current, setCurrent] = (0, import_react.useState)("");
	const [next, setNext] = (0, import_react.useState)("");
	const [again, setAgain] = (0, import_react.useState)("");
	const dirty = name !== user.name || phone !== user.phone;
	function saveProfile() {
		const trimmed = name.trim();
		if (trimmed.length < 2) {
			toast.error("Укажите имя");
			return;
		}
		updateProfile({
			name: trimmed,
			phone: phone.trim()
		});
		toast.success("Профиль сохранён");
	}
	function savePassword() {
		if (current !== user.password) {
			toast.error("Текущий пароль не совпал");
			return;
		}
		if (next.length < 4) {
			toast.error("Новый пароль — минимум 4 символа");
			return;
		}
		if (next !== again) {
			toast.error("Подтверждение не совпало");
			return;
		}
		updateProfile({ password: next });
		setCurrent("");
		setNext("");
		setAgain("");
		toast.success("Пароль обновлён");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Учётная запись"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted",
					children: [
						ROLE_LABEL[user.role],
						" · ",
						user.position,
						session?.branchId && session.branchId !== "all" && branch ? ` · ${branch.short}` : user.role === "owner" ? " · вся сеть" : ""
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-3 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Имя",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: name,
								onChange: (e) => setName(e.target.value),
								autoComplete: "name"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Телефон",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: phone,
								onChange: (e) => setPhone(e.target.value),
								autoComplete: "tel"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Логин",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: user.email,
								readOnly: true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Роль",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: ROLE_LABEL[user.role],
								readOnly: true
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: !dirty,
						onClick: saveProfile,
						children: "Сохранить"
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Пароль"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Пароль пишется в базу сети. Для стартовых учёток — ochag."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-3 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Текущий",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "password",
								value: current,
								onChange: (e) => setCurrent(e.target.value),
								autoComplete: "current-password"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Новый",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "password",
								value: next,
								onChange: (e) => setNext(e.target.value),
								autoComplete: "new-password"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Ещё раз",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "password",
								value: again,
								onChange: (e) => setAgain(e.target.value),
								autoComplete: "new-password"
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "secondary",
						onClick: savePassword,
						children: "Сменить пароль"
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Сессия"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Выход возвращает на экран входа. Операции остаются в базе."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "ghost",
						onClick: () => {
							logout();
							navigate({ to: "/" });
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" }), "Выйти"]
					})
				})
			] })
		]
	});
}
function AlertsPanel({ role }) {
	const prefs = usePrefs();
	const showStock = role !== "waiter";
	const showPayroll = role === "owner" || role === "manager";
	const showWriteoff = role !== "waiter";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-sm font-medium tracking-tight",
			children: "Что приходит в контур"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: "Сигналы на обзоре и в тостах. На этом срезе они живут в устройстве, без сервера."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 divide-y divide-border",
			children: [
				showStock ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Остатки ниже минимума",
					hint: "Когда мясо, соусы или хлеб уходят за красную черту.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: prefs.notifyStock,
						onCheckedChange: (v) => prefs.setNotify("notifyStock", v)
					})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Смена",
					hint: "Открытие, закрытие и расхождение кассы.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: prefs.notifyShift,
						onCheckedChange: (v) => prefs.setNotify("notifyShift", v)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Банкеты",
					hint: "Подтверждение, залог и листы на кухню/зал.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: prefs.notifyBanquet,
						onCheckedChange: (v) => prefs.setNotify("notifyBanquet", v)
					})
				}),
				showWriteoff ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Списания",
					hint: "Порча, питание персонала и недостача.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: prefs.notifyWriteoff,
						onCheckedChange: (v) => prefs.setNotify("notifyWriteoff", v)
					})
				}) : null,
				showPayroll ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Начисления ФОТ",
					hint: "После закрытия кассы — ставка и процент официанта.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: prefs.notifyPayroll,
						onCheckedChange: (v) => prefs.setNotify("notifyPayroll", v)
					})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Звук",
					hint: "Короткий сигнал на событие. По умолчанию выключен в зале.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: prefs.notifySound,
						onCheckedChange: (v) => prefs.setNotify("notifySound", v)
					})
				})
			]
		})
	] });
}
function KitchenPanel() {
	const pin = usePrefs((s) => s.kitchenPinLowStock);
	const setPin = usePrefs((s) => s.setKitchenPinLowStock);
	const showCost = usePrefs((s) => s.showFoodCost);
	const setShowCost = usePrefs((s) => s.setShowFoodCost);
	const reason = usePrefs((s) => s.defaultWriteoffReason);
	const setReason = usePrefs((s) => s.setDefaultWriteoffReason);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium tracking-tight",
				children: "Кухня"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Как шеф и шашлычник видят склад и техкарты."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 divide-y divide-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Держать дефицит сверху",
					hint: "Позиции ниже минимума не прячутся за выручкой.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: pin,
						onCheckedChange: setPin
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
					title: "Себестоимость в техкартах",
					hint: "Фудкост блюда. Можно скрыть, если на планшете работает стажёр.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: showCost,
						onCheckedChange: setShowCost
					})
				})]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium tracking-tight",
				children: "Списание по умолчанию"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Причина, которая сразу стоит в форме списания."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 max-w-xs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NativeSelect, {
					value: reason,
					onChange: (e) => setReason(e.target.value),
					children: Object.entries(WRITEOFF_LABEL).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: k,
						children: v
					}, k))
				})
			})
		] })]
	});
}
function ServicePanel() {
	const own = usePrefs((s) => s.waiterOwnSalesOnly);
	const setOwn = usePrefs((s) => s.setWaiterOwnSalesOnly);
	const typeScale = usePrefs((s) => s.typeScale);
	const setTypeScale = usePrefs((s) => s.setTypeScale);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-sm font-medium tracking-tight",
			children: "Зал"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: "Чеки официанта и размер шрифта на планшете у кассы."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 divide-y divide-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
				title: "Только мои продажи",
				hint: "На экране продаж остаются чеки, закрытые вашей рукой.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: own,
					onCheckedChange: setOwn
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
				title: "Крупный шрифт в зале",
				hint: "То же, что в «Внешний вид» — здесь дубль для быстрой смены.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: typeScale === "large",
					onCheckedChange: (v) => setTypeScale(v ? "large" : "normal")
				})
			})]
		})
	] });
}
function WorkspacePanel({ role }) {
	const branches = useOps((s) => s.branches);
	const users = useOps((s) => s.users);
	const resetDemo = useOps((s) => s.resetDemo);
	const snap = useOps((s) => s);
	const period = usePrefs((s) => s.defaultPeriod);
	const setDefaultPeriod = usePrefs((s) => s.setDefaultPeriod);
	const setPeriod = useOps((s) => s.setPeriod);
	const requireNote = usePrefs((s) => s.requireWriteoffNote);
	const setRequireNote = usePrefs((s) => s.setRequireWriteoffNote);
	const showAdvisor = usePrefs((s) => s.showAdvisor);
	const setShowAdvisor = usePrefs((s) => s.setShowAdvisor);
	const [confirmReset, setConfirmReset] = (0, import_react.useState)(false);
	const staffCount = users.filter((u) => u.role !== "owner").length;
	function applyPeriod(next) {
		setDefaultPeriod(next);
		setPeriod(next);
		toast.success("Период обзора обновлён");
	}
	function exportJson() {
		const payload = {
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			app: APP_NAME,
			version: "1.0",
			studio: LABS_NAME,
			branches: snap.branches,
			users: snap.users.map(({ password: _p, ...u }) => u),
			products: snap.products,
			recipes: snap.recipes,
			stock: snap.stock,
			movements: snap.movements,
			invoices: snap.invoices,
			sales: snap.sales,
			shifts: snap.shifts,
			requests: snap.requests,
			banquets: snap.banquets,
			expenses: snap.expenses,
			payroll: snap.payroll,
			revisions: snap.revisions
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ochag-export-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Снимок выгружен");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Филиалы"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted",
					children: [
						staffCount,
						" сотрудников · ",
						branches.length,
						" точки"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 divide-y divide-border",
					children: branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium",
							children: b.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted",
							children: [
								b.address,
								" · ",
								b.seats,
								" мест"
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs text-subtle tabular-nums",
							children: b.phone
						})]
					}, b.id))
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Обзор и склад"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Период дашборда и правила списаний для управляющих."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 max-w-xs",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Период по умолчанию",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(NativeSelect, {
							value: period,
							onChange: (e) => applyPeriod(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "today",
									children: "Сегодня"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "7d",
									children: "7 дней"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "30d",
									children: "30 дней"
								})
							]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 divide-y divide-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
						title: "Комментарий к списанию обязателен",
						hint: "Повар не проведёт порчу без короткой причины.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: requireNote,
							onCheckedChange: setRequireNote
						})
					}), role === "owner" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrefRow, {
						title: "Сигналы контура на обзоре",
						hint: "Аномалии списаний, фудкост и касса на обзоре владельца.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: showAdvisor,
							onCheckedChange: setShowAdvisor
						})
					}) : null]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Данные"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Выгрузка без паролей. Восстановление возвращает сеть «Очаг» к срезу 2 сентября 2026 и записывает его в базу."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "secondary",
						onClick: exportJson,
						children: "Выгрузить JSON"
					}), canResetDemo(role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "danger",
						onClick: () => setConfirmReset(true),
						children: "Восстановить срез"
					}) : null]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: confirmReset,
				onOpenChange: setConfirmReset,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					title: "Восстановить стартовый срез?",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Чеки, списания и банкеты, которые вы внесли, заменятся исходным срезом сети. Тема на этом устройстве останется."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => setConfirmReset(false),
							children: "Отмена"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "danger",
							onClick: () => {
								resetDemo().then(() => {
									setConfirmReset(false);
									toast.success("Срез восстановлен");
								});
							},
							children: "Сбросить"
						})]
					})]
				})
			})
		]
	});
}
function IphonePanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IosInstallCard, { forceGuide: true }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Профиль на Домой"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "iPhone ставит иконку сам, без App Store. Откройте файл в Safari и подтвердите установку профиля."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					className: "mt-4",
					onClick: () => {
						downloadWebClip().then(() => toast.success("Файл профиля скачан"));
					},
					children: "Скачать Ochag.mobileconfig"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium tracking-tight",
					children: "Файл .ipa"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "iPhone принимает .ipa только с подписью Apple Developer. Без сертификата пакет выглядит как приложение, но система его не пустит — это ограничение Apple, не контура."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm text-muted",
					children: [
						"Нативная оболочка Xcode уже собрана: тот же контур внутри WKWebView, bundle",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs",
							children: "labs.victimok.ochag"
						}),
						". Из неё архивируется настоящий .ipa, когда появится команда разработчика."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/downloads/Ochag-iOS-Xcode.zip",
					download: true,
					className: "mt-4 inline-flex h-11 items-center rounded-sm bg-primary px-4 text-sm text-primary-fg",
					children: "Скачать проект Xcode"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium tracking-tight",
				children: "Как удобнее на смене"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-2 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Горизонтальный iPad — боковое меню, как на компьютере." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "iPhone — нижние вкладки под большой палец, вырез не перекрывает шапку." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Клавиатура на чеке прячет панель вкладок, чтобы сумма не уезжала." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Печать банкетных листов — через «Поделиться» → Принтер." })
				]
			})] })
		]
	});
}
function AboutPanel() {
	const user = useSessionUser();
	const year = LABS_YEAR;
	const ios = useIosInstall();
	const modules = (0, import_react.useMemo)(() => {
		if (user.role === "owner") return "10 модулей, вся сеть";
		if (user.role === "manager") return "филиал, касса, склад, банкеты";
		if (user.role === "cook") return "склад, техкарты, банкетные листы";
		return "касса, смена, банкеты зала";
	}, [user.role]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsMark, { className: "size-11 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs tracking-[0.22em] text-muted uppercase",
						children: APP_NAME
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 text-lg font-medium tracking-tight",
						children: "Операционный контур общепита"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 max-w-lg text-sm text-muted",
						children: [
							"Версия ",
							"1.0",
							". Ваш доступ: ",
							ROLE_LABEL[user.role],
							" — ",
							modules,
							"."
						]
					}),
					ios.apple ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-muted",
						children: "Установка на iPhone — в разделе «iPhone» слева. App Store не нужен."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: "/downloads/test-v1.0-Setup.exe",
						download: true,
						className: "mt-4 inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm text-primary-fg",
						children: ["Скачать ", SETUP_EXE]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-muted",
						children: [
							"Установщик Windows: ярлыки, «Программы и компоненты», подпись ",
							LABS_NAME,
							"."
						]
					})] })
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "my-5" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid gap-3 text-sm sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Студия"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-0.5 font-medium",
						children: LABS_NAME
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Год"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-0.5 font-mono tabular-nums",
						children: year
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Права"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-0.5",
						children: "защищены"
					})] })
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "bg-sidebar text-sidebar-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, {
				tone: "sidebar",
				align: "left"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-xs leading-relaxed text-sidebar-muted",
				children: [
					"Товарный знак и код контура «Очаг» принадлежат ",
					LABS_NAME,
					". Копирование, разбор и перепродажа — только с письменного согласия."
				]
			})]
		})]
	});
}
function PrefRow({ title, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium",
				children: title
			}), hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs leading-relaxed text-muted",
				children: hint
			}) : null]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "shrink-0",
			children
		})]
	});
}
//#endregion
export { SettingsPage as component };
