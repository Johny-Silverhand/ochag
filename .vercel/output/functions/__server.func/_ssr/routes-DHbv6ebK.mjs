import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as DEMO_ACCOUNTS } from "./seed-C4rObjht.mjs";
import { i as useOps, r as useHydrated } from "./store-Bknmh7t3.mjs";
import { a as useIosInstall, h as LABS_NAME, i as IosInstallCard, l as Button, p as APP_NAME, u as LabsCredit, x as usePrefs } from "./router-DjPwU5Qt.mjs";
import { n as Input, t as Field } from "./input-BghYMfst.mjs";
import { n as BootScreen } from "./app-shell-CE7FS4oW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DHbv6ebK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const hydrated = useHydrated();
	const session = useOps((s) => s.session);
	const login = useOps((s) => s.login);
	const loginAs = useOps((s) => s.loginAs);
	const setPeriod = useOps((s) => s.setPeriod);
	const defaultPeriod = usePrefs((s) => s.defaultPeriod);
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)("owner");
	const [password, setPassword] = (0, import_react.useState)("ochag");
	const [error, setError] = (0, import_react.useState)("");
	const ios = useIosInstall();
	(0, import_react.useEffect)(() => {
		if (hydrated && session) navigate({ to: "/dashboard" });
	}, [
		hydrated,
		session,
		navigate
	]);
	if (hydrated && session) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BootScreen, {});
	function enter(nextEmail, nextPassword = "ochag") {
		if (!(nextPassword ? login(nextEmail, nextPassword) : loginAs(nextEmail))) {
			setError("Неверный логин или пароль");
			return;
		}
		setPeriod(defaultPeriod);
		navigate({ to: "/dashboard" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-dvh bg-bg text-fg lg:grid lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 pt-[max(3rem,env(safe-area-inset-top))] pb-12 text-sidebar-fg lg:flex",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs font-medium tracking-[0.28em] text-sidebar-muted uppercase",
					children: APP_NAME
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-6 max-w-md text-5xl leading-tight font-medium tracking-tight",
					children: "Контур смены, склада и прибыли. Без таблиц, которые сбивают к пятнице."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 max-w-md text-sm leading-relaxed text-sidebar-muted",
					children: "Товароучёт, кипер, касса, зарплаты и банкетные листы — без таблиц, которые кто-то сбивает к пятнице."
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid max-w-lg grid-cols-3 gap-6 border-t border-sidebar-fg/10 pt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-sidebar-muted",
						children: "Филиалы"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-2xl tabular-nums",
						children: "3"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-sidebar-muted",
						children: "Роли"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-2xl tabular-nums",
						children: "4"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-sidebar-muted",
						children: "Модули MVP"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-2xl tabular-nums",
						children: "8"
					})] })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, {
				tone: "sidebar",
				align: "left",
				className: "mt-8"
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative flex min-h-dvh flex-col justify-center px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10",
			children: [
				!ios.apple ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/win-setup/index.html",
					className: "absolute top-5 right-5 text-[11px] tracking-[0.16em] text-muted uppercase hover:text-fg sm:top-8 sm:right-10",
					children: "Windows Setup"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto w-full max-w-md pb-16",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-8 lg:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-medium tracking-[0.28em] text-muted uppercase",
								children: APP_NAME
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-2 text-3xl font-medium tracking-tight",
								children: "Вход в контур"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden lg:block",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs font-medium tracking-[0.28em] text-muted uppercase",
									children: [
										APP_NAME,
										" · ",
										"1.0"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-2 text-3xl font-medium tracking-tight",
									children: "Выберите роль"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted",
									children: [
										"Вход сотрудников. Пароль для всех учёток — ochag. Издатель — ",
										LABS_NAME,
										"."
									]
								})
							]
						}),
						ios.apple ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IosInstallCard, { compact: true })
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 grid gap-2",
							children: DEMO_ACCOUNTS.map((acc) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => enter(acc.email),
								className: "flex min-h-14 items-start justify-between rounded-xl bg-surface px-4 py-3.5 text-left shadow-(--shadow-border) transition-[box-shadow,transform] duration-150 hover:shadow-(--shadow-border-hover) active:scale-[0.99]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-sm font-medium",
									children: acc.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-0.5 block text-xs text-muted",
									children: acc.hint
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-subtle",
									children: acc.role
								})]
							}, acc.email))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "mt-8 space-y-3",
							onSubmit: (e) => {
								e.preventDefault();
								enter(email, password);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Логин",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: email,
										onChange: (e) => setEmail(e.target.value),
										autoComplete: "username",
										autoCapitalize: "none",
										autoCorrect: "off",
										spellCheck: false,
										enterKeyHint: "next"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Пароль",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "password",
										value: password,
										onChange: (e) => setPassword(e.target.value),
										autoComplete: "current-password",
										enterKeyHint: "go"
									})
								}),
								error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-danger",
									children: error
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									className: "w-full",
									children: "Войти"
								})
							]
						}),
						!ios.apple ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/downloads/test-v1.0-Setup.exe",
							download: true,
							className: "mt-4 flex h-11 items-center justify-center border border-border text-sm text-muted transition-colors hover:border-border-strong hover:text-fg",
							children: "Скачать test v1.0 Setup.exe"
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] px-5 sm:px-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, {})
				})
			]
		})]
	});
}
//#endregion
export { LoginPage as component };
