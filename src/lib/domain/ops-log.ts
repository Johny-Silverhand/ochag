import { uid } from "../utils.ts";
import type { OpsLogEntry, OpsLogEvent, OpsLogLevel, Snapshot } from "./types.ts";

export const OPS_EVENT_LABEL: Record<OpsLogEvent, string> = {
  login: "Вход",
  login_fail: "Отказ во входе",
  account_create: "Учётка создана",
  account_edit: "Учётка изменена",
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
  return {
    snap: appendOpsLog(snap, {
      level: "info",
      event: "login",
      detail: input.via === "pin" ? "PIN" : "пароль",
      login,
      userId: input.user?.id,
    }),
    ok: true,
  };
}
