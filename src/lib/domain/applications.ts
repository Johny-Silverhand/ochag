import { AuthzError } from "../authz/error.ts";
import type { Actor } from "../authz/actor.ts";
import { hasAbsoluteAccess } from "./permissions.ts";
import { applyOnboard } from "./onboard.ts";
import { parseHalls, type NetworkApplication, type Snapshot } from "./types.ts";
import { isTariffId, type TariffId } from "../billing/plans.ts";
import { uid } from "../utils.ts";
import { appendAudit } from "./audit.ts";

export type ApplicationInput = {
  ownerName: string;
  login: string;
  password: string;
  pin: string;
  phone?: string;
  branchName: string;
  city: string;
  address: string;
  seats?: number;
  halls?: string[];
  tariff?: TariffId | null;
  payerName?: string;
  note?: string;
};

function publicLogin(login: string) {
  return login.trim().toLowerCase();
}

export function applySubmitNetworkApplication(snap: Snapshot, input: ApplicationInput): { snap: Snapshot; application: NetworkApplication } {
  const login = publicLogin(input.login);
  if (!login || input.password.length < 4 || !/^\d{4}$/.test(input.pin)) {
    throw new AuthzError("Логин, пароль (от 4 знаков) и PIN из 4 цифр обязательны", 400);
  }
  if (snap.users.some((u) => u.email.trim().toLowerCase() === login)) {
    throw new AuthzError("Этот логин уже занят", 400);
  }
  const pending = snap.pendingNetworks ?? [];
  if (pending.some((a) => a.status === "pending" && publicLogin(a.login) === login)) {
    throw new AuthzError("Заявка с этим логином уже ожидает подключения", 400);
  }
  const halls = (input.halls ?? []).map((h) => h.trim()).filter(Boolean);
  const row: NetworkApplication = {
    id: uid("app"),
    status: "pending",
    createdAt: new Date().toISOString(),
    ownerName: input.ownerName.trim() || "Владелец",
    login,
    password: input.password,
    pin: input.pin,
    phone: (input.phone ?? "").trim(),
    branchName: input.branchName.trim() || "Филиал 1",
    city: input.city.trim() || "—",
    address: input.address.trim() || "—",
    seats: Math.max(0, Math.round(Number(input.seats) || 0)) || 40,
    halls: halls.length ? halls : parseHalls(""),
    tariff: input.tariff && isTariffId(input.tariff) ? input.tariff : null,
    payerName: (input.payerName ?? "").trim(),
    note: (input.note ?? "").trim(),
  };
  return { snap: { ...snap, pendingNetworks: [row, ...pending] }, application: row };
}

export function applyApproveNetworkApplication(
  snap: Snapshot,
  actor: Actor,
  input: { id: string; tariff?: TariffId | null; paid?: boolean },
): Snapshot {
  if (!hasAbsoluteAccess(actor.role)) throw new AuthzError("Заявки подтверждает только администратор-техник");
  const pending = snap.pendingNetworks ?? [];
  const row = pending.find((a) => a.id === input.id);
  if (!row) throw new AuthzError("Заявка не найдена", 404);
  if (row.status !== "pending") throw new AuthzError("Заявка уже обработана", 400);
  const tariff = input.tariff && isTariffId(input.tariff) ? input.tariff : row.tariff;
  let next = applyOnboard(snap, {
    ownerName: row.ownerName,
    login: row.login,
    password: row.password,
    pin: row.pin,
    branchName: row.branchName,
    city: row.city,
    address: row.address,
    seats: row.seats,
    halls: row.halls,
  });
  const owner = next.users.find((u) => u.email.trim().toLowerCase() === publicLogin(row.login));
  if (owner && row.phone) {
    next = { ...next, users: next.users.map((u) => (u.id === owner.id ? { ...u, phone: row.phone } : u)) };
  }
  const at = new Date().toISOString();
  next = {
    ...next,
    settings: {
      ...next.settings,
      tariff: tariff ?? next.settings.tariff,
      paymentSimulatedAt: input.paid === false ? next.settings.paymentSimulatedAt : at,
    },
    pendingNetworks: pending.map((a) =>
      a.id === row.id
        ? {
            ...a,
            status: "approved" as const,
            decidedAt: at,
            decidedBy: actor.userId,
            tariff: tariff ?? a.tariff,
            ownerUserId: owner?.id,
            password: "",
          }
        : a,
    ),
  };
  return appendAudit(next, actor, "network_approve", "network", `${row.login} · ${row.ownerName}`);
}

export function applyRejectNetworkApplication(
  snap: Snapshot,
  actor: Actor,
  input: { id: string; reason?: string },
): Snapshot {
  if (!hasAbsoluteAccess(actor.role)) throw new AuthzError("Заявки отклоняет только администратор-техник");
  const pending = snap.pendingNetworks ?? [];
  const row = pending.find((a) => a.id === input.id);
  if (!row) throw new AuthzError("Заявка не найдена", 404);
  if (row.status !== "pending") throw new AuthzError("Заявка уже обработана", 400);
  const at = new Date().toISOString();
  const next: Snapshot = {
    ...snap,
    pendingNetworks: pending.map((a) =>
      a.id === row.id
        ? {
            ...a,
            status: "rejected" as const,
            decidedAt: at,
            decidedBy: actor.userId,
            rejectReason: (input.reason ?? "").trim(),
            password: "",
          }
        : a,
    ),
  };
  return appendAudit(next, actor, "network_reject", "network", `${row.login} · ${row.ownerName}`);
}

export function publicApplications(rows: NetworkApplication[] | undefined) {
  return (rows ?? []).map((a) => ({ ...a, password: "" }));
}
