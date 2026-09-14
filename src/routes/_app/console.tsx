import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OpsLogList } from "@/components/admin/ops-log-list";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { hasAbsoluteAccess } from "@/lib/domain/permissions";
import type { OpsLogLevel } from "@/lib/domain/types";
import { today } from "@/lib/domain/types";
import { addDays } from "@/lib/format";

export const Route = createFileRoute("/_app/console")({ component: ConsolePage });

function ConsolePage() {
  const user = useSessionUser()!;
  const snap = useOps((s) => s);
  const monthStart = today().slice(0, 7) + "-01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today());
  const [level, setLevel] = useState<"all" | OpsLogLevel>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (snap.opsLogs ?? []).filter((e) => {
      if (level !== "all" && e.level !== level) return false;
      const day = e.at.slice(0, 10);
      if (day < addDays(from, 0) || day > addDays(to, 0)) return false;
      if (!needle) return true;
      return [e.detail, e.login, e.path, e.event].join(" ").toLowerCase().includes(needle);
    });
  }, [snap.opsLogs, from, to, level, q]);

  if (!hasAbsoluteAccess(user.role)) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Админка"
        title="Консоль"
        description="Входы, отказы, учётки, настройки, bootstrap и ошибки очереди. Не складской журнал — операционный лог сети."
      />
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Segmented
            value={level}
            onChange={(v) => setLevel(v as "all" | OpsLogLevel)}
            options={[
              { value: "all", label: "Все" },
              { value: "info", label: "Инфо" },
              { value: "warn", label: "Важно" },
              { value: "error", label: "Ошибки" },
            ]}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Field label="С">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="По">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="Поиск" className="mt-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="логин, событие, текст" />
        </Field>
      </Card>
      <OpsLogList
        entries={rows}
        users={snap.users}
        empty="Пока тихо. Входы, отказы во входе, создание учёток и ошибки очереди появятся здесь."
      />
    </div>
  );
}
