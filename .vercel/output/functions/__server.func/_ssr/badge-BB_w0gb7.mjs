import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { S as cn } from "./router-DjPwU5Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/badge-BB_w0gb7.js
var import_jsx_runtime = require_jsx_runtime();
var badge = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
	variants: { tone: {
		muted: "bg-bg text-muted",
		primary: "bg-primary/10 text-primary",
		success: "bg-success-soft text-success",
		warning: "bg-warning-soft text-warning",
		danger: "bg-danger-soft text-danger"
	} },
	defaultVariants: { tone: "muted" }
});
function Badge({ className, tone, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badge({ tone }), className),
		...props
	});
}
//#endregion
export { Badge as t };
