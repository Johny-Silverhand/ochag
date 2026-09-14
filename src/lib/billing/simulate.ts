import { looksLikeSeedNetwork } from "../data/bootstrap.ts";
import { emptySnapshot } from "../data/empty.ts";
import type { Snapshot } from "../domain/types.ts";
import { isTariffId, type TariffId } from "./plans.ts";

export function applySimulatePayment(snap: Snapshot, tariff: TariffId, at = new Date().toISOString()): Snapshot {
  if (!isTariffId(tariff)) throw new Error("Неизвестный тариф");
  return {
    ...snap,
    settings: {
      ...snap.settings,
      tariff,
      paymentSimulatedAt: at,
    },
  };
}

/**
 * Login commercial CTAs stay up until a real network exists.
 * Empty store, mid-flow tariff/pay, and leftover учебная сеть all keep the entry.
 */
export function showCommercialEntry(snap: Snapshot) {
  if (snap.users.length === 0) return true;
  return looksLikeSeedNetwork(snap);
}

export function canSelfOnboard(snap: Snapshot) {
  if (!snap.settings.paymentSimulatedAt) return false;
  if (snap.users.length === 0) return true;
  return looksLikeSeedNetwork(snap);
}

/** Drop leftover training rows so «Создать сеть» can replace them. Keep tariff/pay and technicians. */
export function snapshotForCommercialOnboard(snap: Snapshot): Snapshot {
  if (snap.users.length === 0) return snap;
  if (!looksLikeSeedNetwork(snap)) return snap;
  const blank = emptySnapshot();
  const techs = snap.users.filter((u) => u.role === "tech_admin");
  return {
    ...blank,
    users: techs,
    settings: {
      ...blank.settings,
      tariff: snap.settings.tariff,
      paymentSimulatedAt: snap.settings.paymentSimulatedAt,
    },
  };
}

export function billingPublic(snap: Snapshot) {
  return {
    onboarded: snap.users.length > 0 && snap.branches.length > 0,
    tariff: snap.settings.tariff,
    paymentSimulatedAt: snap.settings.paymentSimulatedAt,
    paid: Boolean(snap.settings.paymentSimulatedAt),
    canCreateNetwork: canSelfOnboard(snap),
    commercialEntry: showCommercialEntry(snap),
  };
}
