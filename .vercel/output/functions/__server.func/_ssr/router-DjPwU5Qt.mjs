import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as createRootRoute, b as useRouter, g as createFileRoute, h as lazyRouteComponent, l as Scripts, m as Outlet, p as createRouter, u as HeadContent, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { h as Plus, o as TriangleAlert, s as Smartphone, u as Share } from "../_libs/lucide-react.mjs";
import { b as Slot } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-CLz0lWWu.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/prefs-CNh2dHNQ.js
var APP_NAME = "test v1.0";
var NETWORK_NAME = "Очаг";
var LABS_NAME = "Victimok Labs";
var LABS_LINE = "Разработано в Victimok Labs";
var LABS_RIGHTS = "Все права защищены";
var LABS_YEAR = 2026;
var LABS_CREDIT = `${LABS_LINE}. ${LABS_RIGHTS}.`;
`${LABS_YEAR}${LABS_NAME}${LABS_RIGHTS}`;
var INSTALL_DIR_DEFAULT = "C:\\Program Files\\Victimok Labs\\test v1.0";
var SETUP_EXE = "test v1.0 Setup.exe";
var THEME_IDS = [
	"hearth",
	"night",
	"ember",
	"wine",
	"slate",
	"linen",
	"copper"
];
var THEMES = [
	{
		id: "hearth",
		label: "Очаг",
		hint: "Кремовый зал и хвойный контур",
		scheme: "light",
		group: "light",
		preview: {
			bg: "#f3f1ec",
			sidebar: "#17352b",
			primary: "#1e4336",
			surface: "#fcfbf8"
		}
	},
	{
		id: "wine",
		label: "Вино",
		hint: "Бордо на бумаге меню",
		scheme: "light",
		group: "light",
		preview: {
			bg: "#f6f1ef",
			sidebar: "#3d1c20",
			primary: "#6b2d32",
			surface: "#fcf8f6"
		}
	},
	{
		id: "linen",
		label: "Лён",
		hint: "Светлый высокий контраст",
		scheme: "light",
		group: "light",
		preview: {
			bg: "#f4f1ea",
			sidebar: "#2a2420",
			primary: "#2c2a27",
			surface: "#fbfaf6"
		}
	},
	{
		id: "copper",
		label: "Медь",
		hint: "Мангал и тёплый латунный акцент",
		scheme: "light",
		group: "light",
		preview: {
			bg: "#f4efe8",
			sidebar: "#2c1e14",
			primary: "#8a5a32",
			surface: "#fbf7f1"
		}
	},
	{
		id: "night",
		label: "Ночь",
		hint: "Тёмная смена, спокойный Sage",
		scheme: "dark",
		group: "dark",
		preview: {
			bg: "#121614",
			sidebar: "#0d1210",
			primary: "#8fbfa6",
			surface: "#1a201d"
		}
	},
	{
		id: "ember",
		label: "Угли",
		hint: "Тёплый зал после закрытия",
		scheme: "dark",
		group: "dark",
		preview: {
			bg: "#14110f",
			sidebar: "#1a1411",
			primary: "#c46a4a",
			surface: "#1c1815"
		}
	},
	{
		id: "slate",
		label: "Сланец",
		hint: "Холодный операционный контур",
		scheme: "dark",
		group: "dark",
		preview: {
			bg: "#0f1418",
			sidebar: "#0b1014",
			primary: "#5b8a8a",
			surface: "#161c22"
		}
	}
];
var DEFAULT_THEME = "hearth";
var DARK_THEMES = THEMES.filter((t) => t.scheme === "dark").map((t) => t.id);
function isThemeId(value) {
	return typeof value === "string" && THEME_IDS.includes(value);
}
function themeMeta(id) {
	return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
/** Paint the document chrome immediately — must not wait for React. */
function applyThemeChrome(theme, density = "comfortable", motion = "system", typeScale = "normal") {
	if (typeof document === "undefined") return;
	const id = isThemeId(theme) ? theme : DEFAULT_THEME;
	const meta = themeMeta(id);
	const root = document.documentElement;
	root.setAttribute("data-theme", id);
	root.setAttribute("data-density", density === "compact" ? "compact" : "comfortable");
	root.setAttribute("data-motion", motion === "reduce" ? "reduce" : "system");
	root.setAttribute("data-type", typeScale === "large" ? "large" : "normal");
	root.classList.toggle("dark", meta.scheme === "dark");
	root.style.colorScheme = meta.scheme;
	const color = document.querySelector("meta[name=\"theme-color\"]");
	if (color) color.setAttribute("content", meta.preview.sidebar);
}
var PREFS_STORAGE_KEY = "ochag-prefs-v1";
function readStoredChrome() {
	const fallback = {
		theme: DEFAULT_THEME,
		density: "comfortable",
		motion: "system",
		typeScale: "normal"
	};
	if (typeof window === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(PREFS_STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw);
		const st = parsed.state ?? parsed;
		return {
			theme: isThemeId(st.theme) ? st.theme : fallback.theme,
			density: st.density === "compact" ? "compact" : "comfortable",
			motion: st.motion === "reduce" ? "reduce" : "system",
			typeScale: st.typeScale === "large" ? "large" : "normal"
		};
	} catch {
		return fallback;
	}
}
if (typeof document !== "undefined") {
	const boot = readStoredChrome();
	applyThemeChrome(boot.theme, boot.density, boot.motion, boot.typeScale);
}
var WRITEOFF_REASONS = [
	"spoilage",
	"staff_meal",
	"error",
	"theft",
	"revision"
];
function isWriteoffReason(value) {
	return typeof value === "string" && WRITEOFF_REASONS.includes(value);
}
var DEFAULT_INSTALL = {
	path: INSTALL_DIR_DEFAULT,
	desktopShortcut: true,
	startMenu: true,
	autoStart: false,
	sampleData: true,
	banquetModule: true
};
function paint(state) {
	applyThemeChrome(state.theme, state.density, state.motion, state.typeScale);
}
var stored = readStoredChrome();
var usePrefs = create()(persist((set, get) => ({
	theme: stored.theme,
	density: stored.density,
	motion: stored.motion,
	typeScale: stored.typeScale,
	notifyStock: true,
	notifyShift: true,
	notifyBanquet: true,
	notifyPayroll: true,
	notifyWriteoff: true,
	notifySound: false,
	defaultPeriod: "7d",
	kitchenPinLowStock: true,
	showFoodCost: true,
	defaultWriteoffReason: "spoilage",
	waiterOwnSalesOnly: true,
	requireWriteoffNote: false,
	showAdvisor: true,
	setupComplete: false,
	install: DEFAULT_INSTALL,
	setTheme: (theme) => {
		set({ theme });
		paint(get());
	},
	setDensity: (density) => {
		set({ density });
		paint(get());
	},
	setMotion: (motion) => {
		set({ motion });
		paint(get());
	},
	setTypeScale: (typeScale) => {
		set({ typeScale });
		paint(get());
	},
	setNotify: (key, value) => set({ [key]: value }),
	setDefaultPeriod: (defaultPeriod) => set({ defaultPeriod }),
	setKitchenPinLowStock: (kitchenPinLowStock) => set({ kitchenPinLowStock }),
	setShowFoodCost: (showFoodCost) => set({ showFoodCost }),
	setDefaultWriteoffReason: (defaultWriteoffReason) => set({ defaultWriteoffReason }),
	setWaiterOwnSalesOnly: (waiterOwnSalesOnly) => set({ waiterOwnSalesOnly }),
	setRequireWriteoffNote: (requireWriteoffNote) => set({ requireWriteoffNote }),
	setShowAdvisor: (showAdvisor) => set({ showAdvisor }),
	completeSetup: (install) => set({
		setupComplete: true,
		install
	}),
	resetSetup: () => set({
		setupComplete: false,
		install: DEFAULT_INSTALL
	})
}), {
	name: PREFS_STORAGE_KEY,
	version: 4,
	partialize: (s) => ({
		theme: s.theme,
		density: s.density,
		motion: s.motion,
		typeScale: s.typeScale,
		notifyStock: s.notifyStock,
		notifyShift: s.notifyShift,
		notifyBanquet: s.notifyBanquet,
		notifyPayroll: s.notifyPayroll,
		notifyWriteoff: s.notifyWriteoff,
		notifySound: s.notifySound,
		defaultPeriod: s.defaultPeriod,
		kitchenPinLowStock: s.kitchenPinLowStock,
		showFoodCost: s.showFoodCost,
		defaultWriteoffReason: s.defaultWriteoffReason,
		waiterOwnSalesOnly: s.waiterOwnSalesOnly,
		requireWriteoffNote: s.requireWriteoffNote,
		showAdvisor: s.showAdvisor,
		setupComplete: s.setupComplete,
		install: s.install
	}),
	merge: (persisted, current) => {
		const p = persisted ?? {};
		return {
			...current,
			...p,
			theme: isThemeId(p.theme) ? p.theme : current.theme,
			density: p.density === "compact" ? "compact" : current.density,
			motion: p.motion === "reduce" ? "reduce" : current.motion,
			typeScale: p.typeScale === "large" ? "large" : current.typeScale,
			defaultWriteoffReason: isWriteoffReason(p.defaultWriteoffReason) ? p.defaultWriteoffReason : current.defaultWriteoffReason,
			install: {
				...DEFAULT_INSTALL,
				...p.install ?? {}
			},
			setupComplete: Boolean(p.setupComplete)
		};
	},
	onRehydrateStorage: () => (state) => {
		if (state) paint(state);
	}
}));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-DjPwU5Qt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LabsMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className,
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			width: "32",
			height: "32",
			rx: "8",
			fill: "currentColor",
			opacity: "0.12"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M9 9h6.2c2.7 0 4.4 1.6 4.4 3.9 0 1.7-1 3-2.6 3.5L21.4 23h-3.2l-4.1-6.2H12V23H9V9Zm3 7.4h2.8c1.4 0 2.2-.7 2.2-1.7s-.8-1.6-2.2-1.6H12v3.3Z",
			fill: "currentColor"
		})]
	});
}
function LabsCredit({ className, align = "center", tone = "muted", compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("select-none", align === "center" ? "text-center" : "text-left", tone === "sidebar" ? "text-sidebar-muted" : "text-subtle", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("flex items-center gap-2", align === "center" && "justify-center"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsMark, { className: "size-5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] leading-snug tracking-wide",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: LABS_LINE
					})
				}), compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[10px] tracking-wide opacity-80",
					children: [
						LABS_RIGHTS,
						" © ",
						LABS_YEAR
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[10px] tracking-wide opacity-80",
					children: [
						LABS_RIGHTS,
						" © ",
						LABS_YEAR,
						" · ",
						LABS_NAME
					]
				})]
			})]
		})
	});
}
function LabsFooter({ className, tone = "muted" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("border-t pt-5", tone === "sidebar" ? "border-sidebar-fg/10" : "border-border", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, { tone })
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-[opacity,transform,background-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-fg shadow-(--shadow-border) hover:opacity-90",
			secondary: "bg-elevated text-fg shadow-(--shadow-border) hover:bg-surface",
			outline: "bg-transparent text-fg shadow-(--shadow-border) hover:bg-surface",
			ghost: "bg-transparent text-fg hover:bg-bg",
			danger: "bg-danger text-primary-fg hover:opacity-90",
			inverse: "bg-sidebar-fg text-sidebar hover:opacity-90"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 px-3 text-xs",
			lg: "h-12 px-5",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-danger",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Что-то пошло не так"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: error.message || "Непредвиденная ошибка. Обновите страницу."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				variant: "secondary",
				className: "mt-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					children: "На вход"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, { className: "absolute inset-x-0 bottom-8" })
		]
	});
}
function AppNotFound() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs tracking-[0.22em] text-muted uppercase",
				children: APP_NAME
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Страница не найдена"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm text-muted",
				children: "Такого экрана в контуре нет. Вернитесь на обзор или вход."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				className: "mt-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/dashboard",
					children: "На обзор"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabsCredit, { className: "absolute inset-x-0 bottom-8" })
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
function ThemeProvider({ children }) {
	const theme = usePrefs((s) => s.theme);
	const density = usePrefs((s) => s.density);
	const motion = usePrefs((s) => s.motion);
	const typeScale = usePrefs((s) => s.typeScale);
	(0, import_react.useLayoutEffect)(() => {
		applyThemeChrome(theme, density, motion, typeScale);
	}, [
		theme,
		density,
		motion,
		typeScale
	]);
	return children;
}
var THEME_BOOT_SCRIPT = `(function(){try{var raw=localStorage.getItem("${PREFS_STORAGE_KEY}");var t="hearth";var d="comfortable";var m="system";var s="normal";if(raw){var p=JSON.parse(raw);var st=p.state||p;if(st.theme)t=st.theme;if(st.density)d=st.density;if(st.motion)m=st.motion;if(st.typeScale)s=st.typeScale;}var el=document.documentElement;el.setAttribute("data-theme",t);el.setAttribute("data-density",d);el.setAttribute("data-motion",m);el.setAttribute("data-type",s);var dark=[${DARK_THEMES.map((id) => `"${id}"`).join(",")}].indexOf(t)>=0;el.classList.toggle("dark",dark);el.style.colorScheme=dark?"dark":"light";}catch(e){document.documentElement.setAttribute("data-theme","hearth");}})();`;
function isAppleDevice() {
	if (typeof navigator === "undefined") return false;
	const ua = navigator.userAgent;
	if (/iPhone|iPad|iPod/i.test(ua)) return true;
	return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
function isStandaloneApp() {
	if (typeof window === "undefined") return false;
	return window.navigator.standalone === true;
}
var APPLE_SPLASH = [
	{
		href: "/splash/iphone-15-pro-max.png",
		media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-15-pro.png",
		media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-14.png",
		media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-14-plus.png",
		media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-11.png",
		media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-11-pro-max.png",
		media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-x.png",
		media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
	},
	{
		href: "/splash/iphone-se.png",
		media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
	},
	{
		href: "/splash/ipad-pro-12.png",
		media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
	},
	{
		href: "/splash/ipad-pro-11.png",
		media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
	},
	{
		href: "/splash/ipad.png",
		media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
	}
];
function Card({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rounded-xl bg-surface p-card text-fg shadow-(--shadow-border)", className),
		...props
	});
}
function CardHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mb-4 flex items-start justify-between gap-3", className),
		...props
	});
}
function CardTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: cn("text-sm font-medium tracking-tight", className),
		...props
	});
}
function IosRuntime() {
	(0, import_react.useEffect)(() => {
		const root = document.documentElement;
		const applyFlags = () => {
			root.classList.toggle("ios-device", isAppleDevice());
			root.classList.toggle("ios-standalone", isStandaloneApp());
			root.classList.toggle("coarse", window.matchMedia("(pointer: coarse)").matches);
		};
		applyFlags();
		const vv = window.visualViewport;
		const syncViewport = () => {
			const height = vv?.height ?? window.innerHeight;
			const offsetTop = vv?.offsetTop ?? 0;
			const keyboard = Math.max(0, window.innerHeight - height - offsetTop);
			root.style.setProperty("--app-height", `${Math.round(height)}px`);
			root.style.setProperty("--kb-offset", `${Math.round(keyboard)}px`);
			root.classList.toggle("keyboard-open", keyboard > 72);
		};
		syncViewport();
		vv?.addEventListener("resize", syncViewport);
		vv?.addEventListener("scroll", syncViewport);
		window.addEventListener("orientationchange", syncViewport);
		window.addEventListener("resize", syncViewport);
		const mode = window.matchMedia("(display-mode: standalone)");
		mode.addEventListener("change", applyFlags);
		return () => {
			vv?.removeEventListener("resize", syncViewport);
			vv?.removeEventListener("scroll", syncViewport);
			window.removeEventListener("orientationchange", syncViewport);
			window.removeEventListener("resize", syncViewport);
			mode.removeEventListener("change", applyFlags);
		};
	}, []);
	return null;
}
function useIosInstall() {
	const [apple, setApple] = (0, import_react.useState)(() => isAppleDevice());
	const [standalone, setStandalone] = (0, import_react.useState)(() => isStandaloneApp());
	(0, import_react.useEffect)(() => {
		setApple(isAppleDevice());
		setStandalone(isStandaloneApp());
	}, []);
	return {
		apple,
		standalone,
		showGuide: apple && !standalone
	};
}
function IosInstallCard({ compact = false, forceGuide = false }) {
	const { showGuide, standalone, apple } = useIosInstall();
	if (!apple && !forceGuide) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [standalone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "border-success/20 bg-success-soft",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, {
					className: "mt-0.5 size-5 text-success",
					strokeWidth: 1.75
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium text-success",
					children: "Стоит на экране Домой"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted",
					children: [NETWORK_NAME, " открывается как приложение: без строки Safari, с вырезом и своей иконкой."]
				})] })]
			})
		}) : null, !standalone || forceGuide ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, {
				className: "mt-0.5 size-5 text-primary",
				strokeWidth: 1.75
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: "Поставить на iPhone и iPad"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: compact ? "Safari → Поделиться → На экран «Домой». Дальше открывайте иконку «Очаг», не вкладку." : "Safari → «Поделиться» → «На экран Домой». Иконка «Очаг» появится рядом с камерой. Дальше открывайте её, не вкладку браузера."
					}),
					compact ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "mt-3 space-y-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex size-6 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] text-muted",
									children: "1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Нажмите",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share, {
										className: "mx-0.5 inline size-3.5 align-[-2px] text-primary",
										strokeWidth: 2
									}),
									" Поделиться внизу Safari"
								] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex size-6 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] text-muted",
									children: "2"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Пролистайте и выберите",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
										className: "mx-0.5 inline size-3.5 align-[-2px] text-primary",
										strokeWidth: 2
									}),
									" На экран «Домой»"
								] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex size-6 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] text-muted",
									children: "3"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Подтвердите имя «Очаг» и откройте иконку с рабочего стола" })]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-[11px] leading-relaxed text-subtle",
						children: [
							"Так ставится приложение на iOS без App Store. Издатель — ",
							LABS_NAME,
							"."
						]
					})
				]
			})]
		}) }) : null]
	});
}
var styles_default = "/assets/styles-D4Yarxpp.css";
var Route$16 = createRootRoute({
	errorComponent: AppErrorComponent,
	notFoundComponent: AppNotFound,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "theme-color",
				content: "#17352b"
			},
			{
				name: "description",
				content: "Операционный контур общепита: товароучёт, смены, банкеты и прибыль."
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-title",
				content: NETWORK_NAME
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent"
			},
			{
				name: "format-detection",
				content: "telephone=no"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png"
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
			},
			...APPLE_SPLASH.map((item) => ({
				rel: "apple-touch-startup-image",
				href: item.href,
				media: item.media
			}))
		]
	}),
	component: RootDocument
});
function RootDocument() {
	const theme = usePrefs((s) => s.theme);
	const density = usePrefs((s) => s.density);
	const motion = usePrefs((s) => s.motion);
	const typeScale = usePrefs((s) => s.typeScale);
	const scheme = themeMeta(theme).scheme;
	const shell = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IosRuntime, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ThemeProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			theme: scheme,
			position: "top-center",
			offset: "calc(env(safe-area-inset-top) + 12px)",
			toastOptions: { className: "font-sans text-sm" }
		})] }) })
	] });
	if (typeof window !== "undefined" && window.__VL_DESKTOP__) return shell;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "ru",
		className: scheme === "dark" ? "dark antialiased" : "antialiased",
		"data-theme": theme,
		"data-density": density,
		"data-motion": motion,
		"data-type": typeScale,
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { dangerouslySetInnerHTML: { __html: THEME_BOOT_SCRIPT } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "min-h-dvh bg-bg text-fg antialiased",
			suppressHydrationWarning: true,
			children: [shell, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})]
		})]
	});
}
var $$splitComponentImporter$15 = () => import("./routes-DHbv6ebK.mjs");
var Route$15 = createFileRoute("/")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("../_app-DSGpioPa.mjs");
var Route$14 = createFileRoute("/_app")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./setup-BCEYzUme.mjs");
var Route$13 = createFileRoute("/setup")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
var $$splitComponentImporter$12 = () => import("./banquets-CSMeGr1z.mjs");
var Route$12 = createFileRoute("/_app/banquets")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./dashboard-BqEXPVE2.mjs");
var Route$11 = createFileRoute("/_app/dashboard")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./integrations-Cq_DvNeV.mjs");
var Route$10 = createFileRoute("/_app/integrations")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./inventory-DXA4JyDt.mjs");
var Route$9 = createFileRoute("/_app/inventory")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./procurement-BVfOKL_o.mjs");
var Route$8 = createFileRoute("/_app/procurement")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./recipes-Wl1RNGHc.mjs");
var Route$7 = createFileRoute("/_app/recipes")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./reports-DLK_7ztK.mjs");
var Route$6 = createFileRoute("/_app/reports")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./sales-Dp7tnZdh.mjs");
var Route$5 = createFileRoute("/_app/sales")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./settings-Go5sROk4.mjs");
var Route$4 = createFileRoute("/_app/settings")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./shifts-BHO5dxqU.mjs");
var Route$3 = createFileRoute("/_app/shifts")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./staff-BumODUar.mjs");
var Route$2 = createFileRoute("/_app/staff")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./banquets._id-BTHXmHzx.mjs");
var Route$1 = createFileRoute("/_app/banquets/$id")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./print.banquet._id--BshG92w.mjs");
var Route = createFileRoute("/print/banquet/$id")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$15.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$16
});
var AppRoute = Route$14.update({
	id: "/_app",
	getParentRoute: () => Route$16
});
var SetupRoute = Route$13.update({
	id: "/setup",
	path: "/setup",
	getParentRoute: () => Route$16
});
var AppBanquetsRoute = Route$12.update({
	id: "/banquets",
	path: "/banquets",
	getParentRoute: () => AppRoute
});
var AppDashboardRoute = Route$11.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AppRoute
});
var AppIntegrationsRoute = Route$10.update({
	id: "/integrations",
	path: "/integrations",
	getParentRoute: () => AppRoute
});
var AppInventoryRoute = Route$9.update({
	id: "/inventory",
	path: "/inventory",
	getParentRoute: () => AppRoute
});
var AppProcurementRoute = Route$8.update({
	id: "/procurement",
	path: "/procurement",
	getParentRoute: () => AppRoute
});
var AppRecipesRoute = Route$7.update({
	id: "/recipes",
	path: "/recipes",
	getParentRoute: () => AppRoute
});
var AppReportsRoute = Route$6.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => AppRoute
});
var AppSalesRoute = Route$5.update({
	id: "/sales",
	path: "/sales",
	getParentRoute: () => AppRoute
});
var AppSettingsRoute = Route$4.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AppRoute
});
var AppShiftsRoute = Route$3.update({
	id: "/shifts",
	path: "/shifts",
	getParentRoute: () => AppRoute
});
var AppStaffRoute = Route$2.update({
	id: "/staff",
	path: "/staff",
	getParentRoute: () => AppRoute
});
var AppBanquetsIdRoute = Route$1.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AppBanquetsRoute
});
var PrintBanquetIdRoute = Route.update({
	id: "/print/banquet/$id",
	path: "/print/banquet/$id",
	getParentRoute: () => Route$16
});
var AppBanquetsRouteChildren = { AppBanquetsIdRoute };
var AppRouteChildren = {
	AppBanquetsRoute: AppBanquetsRoute._addFileChildren(AppBanquetsRouteChildren),
	AppDashboardRoute,
	AppIntegrationsRoute,
	AppInventoryRoute,
	AppProcurementRoute,
	AppRecipesRoute,
	AppReportsRoute,
	AppSalesRoute,
	AppSettingsRoute,
	AppShiftsRoute,
	AppStaffRoute
};
var rootRouteChildren = {
	IndexRoute,
	AppRoute: AppRoute._addFileChildren(AppRouteChildren),
	SetupRoute,
	PrintBanquetIdRoute
};
var routeTree = Route$16._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { uid as C, cn as S, SETUP_EXE as _, useIosInstall as a, themeMeta as b, CardTitle as c, LabsFooter as d, LabsMark as f, LABS_YEAR as g, LABS_NAME as h, IosInstallCard as i, Button as l, LABS_CREDIT as m, Route as n, Card as o, APP_NAME as p, Route$1 as r, CardHeader as s, router_exports as t, LabsCredit as u, THEMES as v, usePrefs as x, applyThemeChrome as y };
