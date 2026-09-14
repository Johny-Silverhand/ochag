/**
 * Per-device PIN convenience: first entry on a browser is always login+password.
 * After a successful password login (or registration) the device may opt in to PIN re-entry.
 */
const STORAGE_KEY = "ochag-pin-gate-v1";

export type PinGateState = {
  /** Logins that already passed password (or registration) on this device. */
  unlocked: string[];
  /** Logins the person asked to re-enter by PIN. */
  enabled: string[];
};

const EMPTY: PinGateState = { unlocked: [], enabled: [] };

function normalizeLogin(login: string) {
  return login.trim().toLowerCase();
}

function readRaw(): PinGateState {
  if (typeof window === "undefined") return { ...EMPTY, unlocked: [], enabled: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: [], enabled: [] };
    const parsed = JSON.parse(raw) as Partial<PinGateState>;
    return {
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked.map(normalizeLogin).filter(Boolean) : [],
      enabled: Array.isArray(parsed.enabled) ? parsed.enabled.map(normalizeLogin).filter(Boolean) : [],
    };
  } catch {
    return { unlocked: [], enabled: [] };
  }
}

function writeRaw(state: PinGateState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function readPinGate(): PinGateState {
  return readRaw();
}

export function markPasswordUnlock(login: string, state: PinGateState = readRaw()): PinGateState {
  const key = normalizeLogin(login);
  if (!key) return state;
  const unlocked = state.unlocked.includes(key) ? state.unlocked : [...state.unlocked, key];
  const next = { ...state, unlocked };
  writeRaw(next);
  return next;
}

export function setPinEnabled(login: string, enabled: boolean, state: PinGateState = readRaw()): PinGateState {
  const key = normalizeLogin(login);
  if (!key) return state;
  if (enabled && !state.unlocked.includes(key)) return state;
  const list = enabled
    ? state.enabled.includes(key)
      ? state.enabled
      : [...state.enabled, key]
    : state.enabled.filter((item) => item !== key);
  const next = { ...state, enabled: list };
  writeRaw(next);
  return next;
}

export function canOfferPin(login: string, state: PinGateState = readRaw()): boolean {
  const key = normalizeLogin(login);
  return Boolean(key) && state.unlocked.includes(key);
}

export function canEnterWithPin(login: string, state: PinGateState = readRaw()): boolean {
  const key = normalizeLogin(login);
  return Boolean(key) && state.unlocked.includes(key) && state.enabled.includes(key);
}

/** After a password login: unlock the device, offer PIN only the first time on it. */
export function pinOfferAfterPassword(
  login: string,
  state: PinGateState = readRaw(),
): { state: PinGateState; offer: boolean } {
  const firstOnDevice = !canOfferPin(login, state);
  const next = markPasswordUnlock(login, state);
  return { state: next, offer: firstOnDevice && !canEnterWithPin(login, next) };
}

export const PIN_OFFER_KEY = "ochag-pin-offer";

export function queuePinOffer(login: string) {
  if (typeof window === "undefined") return;
  const { offer } = pinOfferAfterPassword(login);
  if (!offer) return;
  try {
    window.sessionStorage.setItem(PIN_OFFER_KEY, normalizeLogin(login));
  } catch {
    /* private mode */
  }
}

export function takeQueuedPinOffer(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PIN_OFFER_KEY);
  } catch {
    return null;
  }
}

export function clearQueuedPinOffer() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PIN_OFFER_KEY);
  } catch {
    /* ignore */
  }
}

export function pinGateFromState(state: PinGateState) {
  return {
    canOfferPin: (login: string) => canOfferPin(login, state),
    canEnterWithPin: (login: string) => canEnterWithPin(login, state),
  };
}
