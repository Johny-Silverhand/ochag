import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { S as cn } from "./router-DjPwU5Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tabs-rt-h79IP.js
var import_jsx_runtime = require_jsx_runtime();
function Segmented({ value, onChange, options, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("inline-flex rounded-md bg-bg p-1 shadow-(--shadow-border)", className),
		children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onChange(o.value),
			className: cn("min-h-11 rounded-sm px-3 text-xs font-medium transition-colors duration-150 md:h-9 md:min-h-0", value === o.value ? "bg-elevated text-fg shadow-(--shadow-border)" : "text-muted hover:text-fg"),
			children: o.label
		}, o.value))
	});
}
//#endregion
export { Segmented as t };
