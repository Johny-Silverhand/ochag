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

/** When sampleLoaded but publicSnapshot wiped pin/password, restore from seed users by id/email. */
export function rematerializeSeedSecrets(snap: Snapshot, seedUsers: StaffUser[]): Snapshot {
  if (!snap.settings?.sampleLoaded) return snap;
  if (!hasBlankSecrets(snap)) return snap;
  return {
    ...snap,
    users: snap.users.map((u) => withKeptSecret(u, findPeer(seedUsers, u))),
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
