import { looksLikeSeedNetwork } from "../data/bootstrap.ts";
import { emptySnapshot } from "../data/empty.ts";
import type { Snapshot } from "../domain/types.ts";
import { isTariffId, type TariffId } from "./plans.ts";

export function hasTechAdmin(snap: Snapshot) {
  return snap.users.some((u) => u.role === "tech_admin");
}

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
 * Login commercial CTAs stay up until a real network exists, or while a
 * technician can accept another self-registered owner (single ops_state).
 * Empty store, mid-flow tariff/pay, leftover учебная сеть, and tech_admin all keep the entry.
 *
 * Billing (`settings.tariff` / `paymentSimulatedAt`) stays global on that one
 * document — a second «Создать сеть» reuses the already simulated payment.
 */
export function showCommercialEntry(snap: Snapshot) {
  if (snap.users.length === 0) return true;
  if (hasTechAdmin(snap)) return true;
  return looksLikeSeedNetwork(snap);
}

export function canSelfOnboard(snap: Snapshot) {
  if (!snap.settings.paymentSimulatedAt) return false;
  if (snap.users.length === 0) return true;
  if (hasTechAdmin(snap)) return true;
  return looksLikeSeedNetwork(snap);
}

/**
 * Drop leftover training rows so «Создать сеть» can replace them.
 * Always keep every tech_admin (and their secrets). Live commercial users
 * are not in a seed leftover — they stay on the snapshot and applyOnboard adds.
 */
export function snapshotForCommercialOnboard(snap: Snapshot): Snapshot {
  if (snap.users.length === 0) return snap;
  if (!looksLikeSeedNetwork(snap)) return snap;
  const blank = emptySnapshot();
  const techs = snap.users.filter((u) => u.role === "tech_admin").map((u) => ({ ...u }));
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
