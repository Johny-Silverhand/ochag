import { o as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { y as useNavigate } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "./_libs/radix-ui__react-context+react.mjs";
import { i as useOps, r as useHydrated } from "./_ssr/store-Bknmh7t3.mjs";
import { n as BootScreen, t as AppShell } from "./_ssr/app-shell-CE7FS4oW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app-DSGpioPa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppGate() {
	const hydrated = useHydrated();
	const session = useOps((s) => s.session);
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (hydrated && !session) navigate({ to: "/" });
	}, [
		hydrated,
		session,
		navigate
	]);
	if (!hydrated || !session) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BootScreen, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { AppGate as component };
