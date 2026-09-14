import type { OpsRepository } from "../repo/types";
import type { Snapshot } from "../domain/types";

export function readBootstrapEnv() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return {
    login: env?.OCHAG_BOOTSTRAP_LOGIN?.trim().toLowerCase() ?? "",
    password: env?.OCHAG_BOOTSTRAP_PASSWORD ?? "",
    pin: env?.OCHAG_BOOTSTRAP_PIN?.trim() ?? "",
    name: env?.OCHAG_BOOTSTRAP_NAME?.trim() || "Администратор-техник",
    branchName: env?.OCHAG_BOOTSTRAP_BRANCH?.trim() || "Филиал 1",
    city: env?.OCHAG_BOOTSTRAP_CITY?.trim() || "—",
    address: env?.OCHAG_BOOTSTRAP_ADDRESS?.trim() || "—",
    token: env?.OCHAG_BOOTSTRAP_TOKEN?.trim() ?? "",
  };
}

export function envBootstrapInput() {
  const e = readBootstrapEnv();
  if (!e.login || e.password.length < 4 || !/^\d{4}$/.test(e.pin)) return null;
  return {
    name: e.name,
    login: e.login,
    password: e.password,
    pin: e.pin,
    branchName: e.branchName,
    city: e.city,
    address: e.address,
  };
}

export async function ensureEnvBootstrap(repo: OpsRepository): Promise<Snapshot> {
  const snap = await repo.load();
  if (snap.users.length > 0) return snap;
  const input = envBootstrapInput();
  if (!input) return snap;
  const { applyBootstrap } = await import("../domain/mutations");
  const next = applyBootstrap(snap, input);
  await repo.save(next);
  return next;
}
