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

export function canSelfOnboard(snap: Snapshot) {
  return snap.users.length === 0 && Boolean(snap.settings.paymentSimulatedAt);
}

export function billingPublic(snap: Snapshot) {
  return {
    onboarded: snap.users.length > 0 && snap.branches.length > 0,
    tariff: snap.settings.tariff,
    paymentSimulatedAt: snap.settings.paymentSimulatedAt,
    paid: Boolean(snap.settings.paymentSimulatedAt),
    canCreateNetwork: canSelfOnboard(snap),
  };
}
