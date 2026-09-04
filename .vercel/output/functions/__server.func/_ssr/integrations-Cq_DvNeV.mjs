import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { O as ruDateTime } from "./seed-C4rObjht.mjs";
import { i as useOps, o as useSync, t as getOpsStatus } from "./store-Bknmh7t3.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as Button, o as Card } from "./router-DjPwU5Qt.mjs";
import { n as Input, t as Field } from "./input-BghYMfst.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
import { t as defaultKeeperConfig } from "./keeper-zc8Y9rwx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/integrations-Cq_DvNeV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function IntegrationsPage() {
	const resetDemo = useOps((s) => s.resetDemo);
	const sync = useSync();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		getOpsStatus().then(setStatus).catch(() => setStatus(null));
	}, [sync.updatedAt]);
	const source = status?.source ?? sync.source;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		eyebrow: "Подключения",
		title: "Интеграции",
		description: "Касса, база и операционные сигналы — рабочие точки, без заготовок."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs tracking-wide text-muted uppercase",
						children: "База"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 text-lg font-medium",
						children: source === "neon" ? "Neon Postgres" : "Postgres (локальный контур)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-sm text-muted",
						children: "Склад, чеки, смены и банкеты пишутся в Postgres. На проде это Neon; в превью — тот же движок, чтобы ничего не расходилось."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: status?.ready || sync.status === "ok" ? "success" : "warning",
					children: sync.status === "saving" ? "запись" : status?.ready || sync.status === "ok" ? "онлайн" : "ожидание"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-4 grid gap-3 text-sm sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Чеков в базе"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-0.5 font-mono tabular-nums",
						children: status?.sales ?? sync.sales
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Последняя запись"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-0.5 text-sm",
						children: status?.updatedAt ? ruDateTime(status.updatedAt) : sync.updatedAt ? ruDateTime(sync.updatedAt) : "—"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Движок"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-0.5 font-mono text-sm",
						children: source ?? "—"
					})] })
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs tracking-wide text-muted uppercase",
						children: "Касса"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 text-lg font-medium",
						children: "r_keeper"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-sm text-muted",
						children: "Z-отчёт мапится в чеки и сразу списывает склад по техкартам. Импорт — на экране продаж, при открытой смене."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: "success",
					children: "работает"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "URL терминала",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						defaultValue: defaultKeeperConfig.baseUrl,
						readOnly: true
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "ID кассы",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						defaultValue: defaultKeeperConfig.terminalId,
						readOnly: true
					})
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs tracking-wide text-muted uppercase",
						children: "Сигналы"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 text-lg font-medium",
						children: "Операционный советник"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-sm text-muted",
						children: "На обзоре считаются аномалии: фудкост, списания, касса, дефицит, паттерн повара. Внешний ключ модели не нужен — контур уже подсказывает по фактам сети."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: "success",
					children: "в работе"
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium",
					children: "Стартовый срез"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Вернуть сеть «Очаг» к срезу 2 сентября 2026. Текущие правки в базе заменятся."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					disabled: busy,
					onClick: () => {
						setBusy(true);
						resetDemo().then(() => toast.success("Срез восстановлен")).catch(() => toast.error("Не удалось записать в базу")).finally(() => setBusy(false));
					},
					children: "Восстановить срез"
				})]
			})
		]
	})] });
}
//#endregion
export { IntegrationsPage as component };
