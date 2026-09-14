import { uid } from "../utils.ts";
import type { OpsLogEntry, OpsLogEvent, OpsLogLevel, Snapshot, StaffUser } from "./types.ts";

export const ACCOUNT_BLOCKED_MSG = "Аккаунт заблокирован";
export const AUTH_BAD_CREDENTIALS_MSG = "Неверный логин или PIN";

export const OPS_EVENT_LABEL: Record<OpsLogEvent, string> = {
  login: "Вход",
  login_fail: "Отказ во входе",
  account_create: "Учётка создана",
  account_edit: "Учётка изменена",
  account_block: "Учётка заблокирована",
  account_unblock: "Учётка разблокирована",
  account_delete: "Учётка удалена",
  settings: "Настройки",
  bootstrap: "Bootstrap",
  sample: "Учебная сеть",
  api: "API",
  outbox: "Очередь",
};

export const OPS_LEVEL_LABEL: Record<OpsLogLevel, string> = {
  info: "инфо",
  warn: "важно",
  error: "ошибка",
};

export function appendOpsLog(
  snap: Snapshot,
  input: Omit<OpsLogEntry, "id" | "at"> & { at?: string },
): Snapshot {
  const row: OpsLogEntry = {
    id: uid("log"),
    at: input.at ?? new Date().toISOString(),
    level: input.level,
    event: input.event,
    detail: input.detail,
    userId: input.userId,
    login: input.login,
    path: input.path,
  };
  return { ...snap, opsLogs: [row, ...(snap.opsLogs ?? [])].slice(0, 2000) };
}

export function isAccountBlocked(user: { disabled?: boolean } | undefined) {
  return Boolean(user?.disabled);
}

export function resolveStaffAuth(input: {
  user?: Pick<StaffUser, "id" | "disabled">;
  credentialsOk: boolean;
}): { ok: boolean; reason?: string } {
  if (!input.user || !input.credentialsOk) {
    return { ok: false, reason: AUTH_BAD_CREDENTIALS_MSG };
  }
  if (isAccountBlocked(input.user)) {
    return { ok: false, reason: ACCOUNT_BLOCKED_MSG };
  }
  return { ok: true };
}

export function recordAuthAttempt(
  snap: Snapshot,
  input: {
    login: string;
    via: "password" | "pin";
    user?: { id: string; disabled?: boolean };
    ok: boolean;
    reason?: string;
  },
): { snap: Snapshot; ok: boolean; reason?: string } {
  const login = input.login.trim().toLowerCase();
  if (!input.ok) {
    return {
      snap: appendOpsLog(snap, {
        level: "warn",
        event: "login_fail",
        detail: input.reason ?? "отказ",
        login,
        userId: input.user?.id,
      }),
      ok: false,
      reason: input.reason,
    };
  }
  const at = new Date().toISOString();
  const withLogin = input.user?.id
    ? {
        ...snap,
        users: (snap.users ?? []).map((u) => (u.id === input.user!.id ? { ...u, lastLoginAt: at } : u)),
      }
    : snap;
  return {
    snap: appendOpsLog(withLogin, {
      level: "info",
      event: "login",
      detail: input.via === "pin" ? "PIN" : "пароль",
      login,
      userId: input.user?.id,
    }),
    ok: true,
  };
}
