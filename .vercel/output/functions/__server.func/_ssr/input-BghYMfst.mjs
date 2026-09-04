import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { S as cn } from "./router-DjPwU5Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/input-BghYMfst.js
var import_jsx_runtime = require_jsx_runtime();
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("h-11 w-full rounded-sm border border-border bg-elevated px-3 text-base text-fg outline-none transition-[box-shadow] duration-150 placeholder:text-subtle focus:ring-2 focus:ring-ring/25 md:text-sm", className),
		...props
	});
}
function Textarea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("min-h-24 w-full rounded-md border border-border bg-elevated px-3 py-2 text-base text-fg outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring/25 md:text-sm", className),
		...props
	});
}
function NativeSelect({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		className: cn("h-11 w-full rounded-sm border border-border bg-elevated px-3 text-base text-fg outline-none focus:ring-2 focus:ring-ring/25 md:text-sm", className),
		...props
	});
}
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: cn("mb-1.5 block text-xs font-medium text-muted", className),
		...props
	});
}
function Field({ label, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), children]
	});
}
//#endregion
export { Textarea as i, Input as n, NativeSelect as r, Field as t };
