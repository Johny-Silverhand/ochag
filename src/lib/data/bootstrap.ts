/**
 * First tech admin from OCHAG_BOOTSTRAP_*.
 * Empty store stays empty so commercial «Создать сеть» can run after sim pay;
 * technician on a blank snapshot is POST /api/v1/auth/bootstrap.
 * A leftover sample network (no technician) gets the env admin inserted;
 * existing users are kept. Never resets a live technician's password,
 * and never injects into a commercially onboarded network.
 */
import type { OpsRepository } from "../repo/types.ts";
import type { Snapshot, StaffUser } from "../domain/types.ts";
import { rematerializeSeedSecrets } from "./secrets.ts";

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

export type BootstrapInput = NonNullable<ReturnType<typeof envBootstrapInput>>;

const SEED_SECRET_PEERS: StaffUser[] = [
  {
    id: "u-owner",
    name: "Кирилл Сорокин",
    email: "owner",
    password: "ochag",
    pin: "1001",
    role: "owner",
    position: "Собственник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "",
  },
];

function looksLikeSeedNetwork(snap: Snapshot) {
  return snap.settings.sampleLoaded || snap.users.some((u) => u.id === "u-owner");
}

/** Fill blank PIN/password on leftover training rows without touching real secrets. */
export function repairLegacySnapshot(snap: Snapshot): Snapshot {
  if (!looksLikeSeedNetwork(snap)) return snap;
  const flagged: Snapshot = {
    ...snap,
    settings: { ...snap.settings, sampleLoaded: true },
  };
  return rematerializeSeedSecrets(flagged, SEED_SECRET_PEERS);
}

function enabledTechAdmins(snap: Snapshot) {
  return snap.users.filter((u) => u.role === "tech_admin" && !u.disabled);
}

function sameLogin(user: StaffUser, login: string) {
  return user.email.trim().toLowerCase() === login;
}

function makeAdmin(input: BootstrapInput): StaffUser {
  const login = input.login.trim().toLowerCase();
  return {
    id: `u-boot-${login.replace(/[^a-z0-9]+/g, "").slice(0, 12) || "tech"}`,
    name: input.name.trim() || "Администратор-техник",
    email: login,
    password: input.password,
    pin: input.pin,
    role: "tech_admin",
    position: "Администратор-техник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "",
    disabled: false,
  };
}

/**
 * Pure snapshot transform. Audit/ops log is applied in ensureEnvBootstrap
 * so this file stays importable from node:test.
 */
export function applyEnsureBootstrap(
  snap: Snapshot,
  input: BootstrapInput | null,
  _applyBootstrap: (snap: Snapshot, input: BootstrapInput) => Snapshot,
): Snapshot {
  const repaired = repairLegacySnapshot(snap);
  if (!input) return repaired;

  const login = input.login.trim().toLowerCase();
  const techs = enabledTechAdmins(repaired);
  if (techs.length > 0) {
    const match = techs.find((u) => sameLogin(u, login));
    if (!match || (match.password && match.pin)) return repaired;
    const filled: StaffUser = {
      ...match,
      password: match.password || input.password,
      pin: match.pin || input.pin,
    };
    return { ...repaired, users: repaired.users.map((u) => (u.id === match.id ? filled : u)) };
  }

  const taken = repaired.users.find((u) => sameLogin(u, login));
  if (taken) {
    if (taken.role === "tech_admin") {
      return {
        ...repaired,
        users: repaired.users.map((u) =>
          u.id === taken.id
            ? { ...u, disabled: false, password: u.password || input.password, pin: u.pin || input.pin }
            : u,
        ),
      };
    }
    return repaired;
  }

  // Do not steal commercial onboard: empty snapshots wait for sim pay + «Создать сеть».
  if (repaired.users.length === 0) return repaired;
  // Only leftover training rows get an injected technician — not a paid owner network.
  if (!looksLikeSeedNetwork(repaired)) return repaired;

  const admin = makeAdmin(input);
  let branches = repaired.branches;
  if (branches.length === 0) {
    branches = [
      {
        id: "br-boot-1",
        name: input.branchName.trim() || "Филиал 1",
        short: (input.branchName.trim() || "Филиал").slice(0, 16),
        city: input.city.trim() || "—",
        address: input.address.trim() || "—",
        seats: 40,
        phone: "",
      },
    ];
  }
  return { ...repaired, branches, users: [admin, ...repaired.users] };
}

export function bootstrapChanged(prev: Snapshot, next: Snapshot) {
  if (prev.users.length !== next.users.length) return true;
  if (prev.settings.sampleLoaded !== next.settings.sampleLoaded) return true;
  return prev.users.some((u, i) => {
    const n = next.users[i];
    return !n || u.password !== n.password || u.pin !== n.pin || u.role !== n.role || Boolean(u.disabled) !== Boolean(n.disabled);
  });
}

export function shouldSkipEnvBootstrap(snap: Snapshot) {
  return Boolean(snap.settings.paymentSimulatedAt) && snap.users.length === 0;
}

export async function ensureEnvBootstrap(repo: OpsRepository): Promise<Snapshot> {
  const snap = await repo.load();
  if (shouldSkipEnvBootstrap(snap)) return snap;
  const input = envBootstrapInput();
  const { applyBootstrap } = await import("../domain/mutations");
  const next = applyEnsureBootstrap(snap, input, applyBootstrap);
  if (!bootstrapChanged(snap, next)) return next;
  const admin = next.users.find((u) => u.role === "tech_admin");
  if (admin && !snap.users.some((u) => u.id === admin.id)) {
    const { actorFrom } = await import("../authz/actor");
    const { appendAudit } = await import("../domain/audit");
    const { appendOpsLog } = await import("../domain/ops-log");
    const actor = actorFrom(admin, { userId: admin.id, branchId: "all" });
    const logged = appendOpsLog(
      appendAudit(next, actor, "bootstrap", "network", `техник ${admin.email}`),
      { level: "info", event: "bootstrap", detail: `создан ${admin.email}`, userId: admin.id, login: admin.email },
    );
    await repo.save(logged);
    return logged;
  }
  await repo.save(next);
  return next;
}
