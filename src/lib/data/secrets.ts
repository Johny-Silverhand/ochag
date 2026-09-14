import type { Snapshot, StaffUser } from "../domain/types.ts";

function sameLogin(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function withKeptSecret(next: StaffUser, prev: Pick<StaffUser, "password" | "pin"> | undefined): StaffUser {
  if (!prev) return next;
  return {
    ...next,
    password: next.password || prev.password,
    pin: next.pin || prev.pin,
  };
}

function findPeer(users: StaffUser[], user: StaffUser) {
  return users.find((p) => p.id === user.id) ?? users.find((p) => sameLogin(p.email, user.email));
}

/** Seed logins that publicSnapshot may blank. Never used to overwrite a live custom password. */
export const SEED_LOGIN_PEERS: StaffUser[] = [
  {
    id: "u-tech",
    name: "Виктор Мост",
    email: "admin",
    password: "ochag",
    pin: "0001",
    role: "tech_admin",
    position: "Администратор-техник",
    branchId: null,
    shiftPay: 0,
    salesPercent: 0,
    phone: "+7 918 000-00-00",
  },
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
    phone: "+7 918 000-00-01",
  },
];

/** Client/API payloads strip password and PIN. Never let a blank overwrite a live secret. */
export function retainSecrets(prev: Snapshot, next: Snapshot): Snapshot {
  return {
    ...next,
    users: next.users.map((u) => withKeptSecret(u, findPeer(prev.users, u))),
  };
}

export function hasBlankSecrets(snap: Snapshot): boolean {
  return snap.users.some((u) => !u.password || !u.pin);
}

/**
 * Restore blank PIN/password from seed peers.
 * Known seed ids (u-tech, u-owner) heal even if sampleLoaded was lost.
 * Email matching stays sample-only so a commercial «owner» login is not overwritten.
 */
export function rematerializeSeedSecrets(snap: Snapshot, seedUsers: StaffUser[]): Snapshot {
  if (!hasBlankSecrets(snap)) return snap;
  const sample = Boolean(snap.settings?.sampleLoaded);
  return {
    ...snap,
    users: snap.users.map((u) => {
      if (u.password && u.pin) return u;
      const byId = seedUsers.find((p) => p.id === u.id);
      if (byId) return withKeptSecret(u, byId);
      if (!sample) return u;
      return withKeptSecret(u, findPeer(seedUsers, u));
    }),
  };
}

/** Merge a public API snapshot without wiping live or training credentials. */
export function applyPublicState(prev: Snapshot, incoming: Snapshot, seedUsers: StaffUser[]): Snapshot {
  return rematerializeSeedSecrets(retainSecrets(prev, incoming), seedUsers);
}

/** Training snapshot must keep working owner credentials even if the API stripped them. */
export function ensureSampleCredentials(
  snap: Snapshot,
  seedUsers: StaffUser[],
  fallback: () => Snapshot,
): Snapshot {
  const filled = rematerializeSeedSecrets(snap, seedUsers);
  if (!filled.settings?.sampleLoaded) return filled;
  const owner = filled.users.find((u) => sameLogin(u.email, "owner"));
  if (owner?.password && owner?.pin) return filled;
  return fallback();
}

export function matchLocalPassword(
  snap: Snapshot,
  email: string,
  password: string,
  seedUsers: StaffUser[],
): { snap: Snapshot; user: StaffUser | undefined } {
  const ready = rematerializeSeedSecrets(snap, seedUsers);
  return {
    snap: ready,
    user: ready.users.find((u) => sameLogin(u.email, email) && u.password === password),
  };
}

export function matchLocalPin(
  snap: Snapshot,
  email: string,
  pin: string,
  seedUsers: StaffUser[],
): { snap: Snapshot; user: StaffUser | undefined } {
  const ready = rematerializeSeedSecrets(snap, seedUsers);
  return {
    snap: ready,
    user: ready.users.find((u) => sameLogin(u.email, email) && u.pin === pin),
  };
}
