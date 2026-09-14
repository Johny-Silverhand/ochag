import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { api } from "@/lib/api/client";

export type OwnerRow = {
  id: string;
  name: string;
  email: string;
  disabled?: boolean;
  branches?: number;
  staff?: number;
};

export function useOwnerRows(refreshKey?: string | number) {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const load = useCallback(() => {
    void api<{ rows: OwnerRow[] }>("owners")
      .then((res) => setOwners(res.rows ?? []))
      .catch(() => setOwners([]));
  }, []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  return { owners, reload: load };
}

export function OwnerContourSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (ownerId: string | null) => Promise<void>;
}) {
  const { owners, reload } = useOwnerRows(value);
  return (
    <NativeSelect
      className="h-11 w-[min(10rem,42vw)] min-w-0 shrink bg-surface sm:w-52 md:h-10"
      value={value}
      onFocus={() => reload()}
      onChange={(e) => {
        void onChange(e.target.value || null);
      }}
      aria-label="Контур владельца"
    >
      <option value="">Все владельцы</option>
      {owners.map((o) => (
        <option key={o.id} value={o.id}>
          {o.disabled ? `${o.name} (блок)` : o.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function OwnerContourPanel({
  actingOwnerId,
  onSelectOwner,
  branches,
  sessionBranchId,
  onSelectBranch,
}: {
  actingOwnerId?: string | null;
  onSelectOwner: (ownerId: string | null) => Promise<void>;
  branches: Array<{ id: string; short: string; name: string }>;
  sessionBranchId: string;
  onSelectBranch: (branchId: string) => void;
}) {
  const { owners, reload } = useOwnerRows(actingOwnerId ?? "");
  const current = owners.find((o) => o.id === actingOwnerId);
  const [busy, setBusy] = useState<string | null>(null);

  async function pick(id: string | null) {
    setBusy(id ?? "all");
    try {
      await onSelectOwner(id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось переключить контур");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs tracking-wide text-muted uppercase">Контур владельца</div>
          <h2 className="mt-1 text-lg font-medium">
            {current ? current.name : "Вся админка"}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {current
              ? "Склад, сотрудники, чеки и филиалы — только этой сети. Пользователи, консоль и журнал остаются у техника."
              : "Список всех владельцев (саморегистрация и приглашённые). Откройте контур, чтобы работать в его сети без повторного входа."}
          </p>
        </div>
        {current ? (
          <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => void pick(null)}>
            {busy === "all" ? "…" : "Сбросить контур"}
          </Button>
        ) : null}
      </div>

      {current ? (
        <div className="mt-4 max-w-xs">
          <div className="mb-1 text-xs text-muted">Филиалы этого владельца</div>
          <NativeSelect value={sessionBranchId} onChange={(e) => onSelectBranch(e.target.value)}>
            <option value="all">Все филиалы владельца</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.short || b.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      <ul className="mt-4 divide-y divide-border">
        {owners.map((o) => {
          const active = o.id === actingOwnerId;
          return (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.name}</span>
                  {active ? <Badge tone="primary">открыт</Badge> : null}
                  {o.disabled ? <Badge tone="danger">блок</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {o.email} · филиалов {o.branches ?? 0} · сотрудников {o.staff ?? 0}
                </p>
              </div>
              <Button
                variant={active ? "secondary" : "default"}
                size="sm"
                disabled={busy !== null}
                onClick={() => void pick(active ? null : o.id)}
              >
                {busy === o.id ? "…" : active ? "Закрыть" : "Открыть"}
              </Button>
            </li>
          );
        })}
        {owners.length === 0 ? (
          <li className="py-6 text-sm text-muted">Владельцев пока нет — саморегистрация с тарифа или приглашение в этом разделе.</li>
        ) : null}
      </ul>
    </Card>
  );
}
