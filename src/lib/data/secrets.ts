import type { Snapshot } from "../domain/types";

/** Client/API payloads strip password and PIN. Never let a blank overwrite a live secret. */
export function retainSecrets(prev: Snapshot, next: Snapshot): Snapshot {
  return {
    ...next,
    users: next.users.map((u) => {
      const old = prev.users.find((p) => p.id === u.id);
      if (!old) return u;
      return {
        ...u,
        password: u.password || old.password,
        pin: u.pin || old.pin,
      };
    }),
  };
}
