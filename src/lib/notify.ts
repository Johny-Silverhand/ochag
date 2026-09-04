import { toast } from "sonner";
import { usePrefs } from "./prefs";

export type NotifyKind = "stock" | "shift" | "banquet" | "payroll" | "writeoff";

const FLAG: Record<NotifyKind, "notifyStock" | "notifyShift" | "notifyBanquet" | "notifyPayroll" | "notifyWriteoff"> = {
  stock: "notifyStock",
  shift: "notifyShift",
  banquet: "notifyBanquet",
  payroll: "notifyPayroll",
  writeoff: "notifyWriteoff",
};

function playTick() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 784;
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    /* ignore: no audio context */
  }
}

export function notify(kind: NotifyKind, message: string, tone: "ok" | "warn" | "bad" = "ok") {
  const prefs = usePrefs.getState();
  if (!prefs[FLAG[kind]]) return;
  if (tone === "bad") toast.error(message);
  else if (tone === "warn") toast.warning(message);
  else toast.success(message);
  if (prefs.notifySound) playTick();
}
