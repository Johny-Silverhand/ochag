import { n as toast } from "../_libs/sonner.mjs";
import { x as usePrefs } from "./router-DjPwU5Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notify-BupvC7sZ.js
var FLAG = {
	stock: "notifyStock",
	shift: "notifyShift",
	banquet: "notifyBanquet",
	payroll: "notifyPayroll",
	writeoff: "notifyWriteoff"
};
function playTick() {
	try {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = 784;
		gain.gain.value = .035;
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12);
		osc.stop(ctx.currentTime + .13);
	} catch {}
}
function notify(kind, message, tone = "ok") {
	const prefs = usePrefs.getState();
	if (!prefs[FLAG[kind]]) return;
	if (tone === "bad") toast.error(message);
	else if (tone === "warn") toast.warning(message);
	else toast.success(message);
	if (prefs.notifySound) playTick();
}
//#endregion
export { notify as t };
