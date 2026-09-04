import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { E as recipeFoodCostPct, S as pct, T as recipeCost, k as rub, w as qty } from "./seed-C4rObjht.mjs";
import { i as useOps } from "./store-Bknmh7t3.mjs";
import { o as Card, x as usePrefs } from "./router-DjPwU5Qt.mjs";
import { n as PageHeader } from "./page-Dq1WwIZy.mjs";
import { t as Badge } from "./badge-BB_w0gb7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/recipes-Wl1RNGHc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RecipesPage() {
	const recipes = useOps((s) => s.recipes);
	const products = useOps((s) => s.products);
	const [id, setId] = (0, import_react.useState)(recipes[0]?.id ?? "");
	const showFoodCost = usePrefs((s) => s.showFoodCost);
	const recipe = recipes.find((r) => r.id === id) ?? recipes[0];
	if (!recipe) return null;
	const cost = recipeCost(recipe, products);
	const fc = recipeFoodCostPct(recipe, products);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		eyebrow: "Калькуляция",
		title: "Техкарты",
		description: "Себестоимость блюда считается из закупочных цен. Продажа списывает ингредиенты автоматически."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[240px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "p-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: recipes.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setId(r.id),
				className: `flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm ${r.id === recipe.id ? "bg-bg font-medium" : "text-muted hover:text-fg"}`,
				children: [r.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs tabular-nums",
					children: rub(r.price)
				})]
			}) }, r.id)) })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted",
					children: recipe.category
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl font-medium tracking-tight",
					children: recipe.name
				})] }), showFoodCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					tone: fc > 32 ? "warning" : "success",
					children: ["FC ", pct(fc)]
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: `mt-5 grid gap-3 text-sm ${showFoodCost ? "grid-cols-3" : "grid-cols-1"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md bg-bg p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Цена"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-lg tabular-nums",
						children: rub(recipe.price)
					})]
				}), showFoodCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md bg-bg p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Себестоимость"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-lg tabular-nums",
						children: rub(cost, true)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md bg-bg p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs text-muted",
						children: "Маржа"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 font-mono text-lg tabular-nums",
						children: rub(recipe.price - cost, true)
					})]
				})] }) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "mt-6 w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-xs text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "pb-2 font-medium",
							children: "Ингредиент"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "pb-2 font-medium",
							children: "Норма"
						}),
						showFoodCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "pb-2 text-right font-medium",
							children: "Сумма"
						}) : null
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: recipe.items.map((it) => {
					const p = products.find((x) => x.id === it.productId);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2",
								children: p?.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 font-mono tabular-nums",
								children: qty(it.qty, p?.unit)
							}),
							showFoodCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 text-right font-mono tabular-nums",
								children: rub((p?.avgCost ?? 0) * it.qty, true)
							}) : null
						]
					}, it.productId);
				}) })]
			})
		] })]
	})] });
}
//#endregion
export { RecipesPage as component };
