import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useOps } from "@/lib/data/store";
import { hasAbsoluteAccess } from "@/lib/domain/permissions";
import { ROLE_LABEL, type Role } from "@/lib/domain/types";
import { ruDateTime } from "@/lib/format";

type Row = {
  id: string;
  userId: string;
  userName: string;
  role: Role | null;
  deviceLabel: string;
  ip: string;
  createdAt: string;
  lastActivityAt: string;
};

export function DeviceSessionsCard() {
  const session = useOps((s) => s.session);
  const user = useOps((s) => s.users.find((u) => u.id === s.session?.userId));
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState("");
  const role = user?.role;
  const inspecting = Boolean(role && hasAbsoluteAccess(role) && session?.actingOwnerId);
  const showNames = role === "owner" || inspecting;

  function load() {
    void api<{ rows: Row[]; currentId?: string }>("session/list")
      .then((res) => setRows(res.rows ?? []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    load();
  }, [session?.sessionId, session?.actingOwnerId]);

  async function revoke(id: string) {
    setBusy(id);
    try {
      await api("session/revoke", { method: "POST", body: { sessionId: id } });
      toast.success("Сессия отозвана");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отозвать");
    } finally {
      setBusy("");
    }
  }

  async function revokeOthers() {
    setBusy("others");
    try {
      await api("session/revoke-others", { method: "POST" });
      toast.success("Другие ваши устройства отключены");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отозвать");
    } finally {
      setBusy("");
    }
  }

  const hint = inspecting
    ? "Сессии выбранного контура: владелец и сотрудники. Отзыв сразу гасит этот JWT."
    : role === "owner"
      ? "Можно быть в системе сразу на нескольких телефонах. Видны ваши входы и входы сотрудников."
      : "Можно войти с нескольких устройств. Отзыв выкидывает только выбранное.";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Устройства</h2>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => void revokeOthers()}>
          {busy === "others" ? "…" : "Отозвать остальные"}
        </Button>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const current = row.id === session?.sessionId;
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {row.deviceLabel || "устройство"}
                  {current ? <span className="ml-2 text-xs font-normal text-muted">это устройство</span> : null}
                </div>
                {showNames ? (
                  <p className="text-xs text-muted">
                    {row.userName}
                    {row.role ? ` · ${ROLE_LABEL[row.role]}` : ""}
                  </p>
                ) : null}
                <p className="text-xs text-muted">
                  {row.ip || "IP —"} · вход {ruDateTime(row.createdAt)} · активность {ruDateTime(row.lastActivityAt)}
                </p>
              </div>
              {!current ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  disabled={busy === row.id}
                  onClick={() => void revoke(row.id)}
                >
                  Отозвать
                </Button>
              ) : null}
            </li>
          );
        })}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Пока нет записей — войдите заново, чтобы увидеть это устройство.</p>
        ) : null}
      </ul>
    </Card>
  );
}
