import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AuditJournal } from "@/components/admin/audit-journal";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { auditGroup, type AuditGroup } from "@/lib/domain/audit-labels";
import { hasAbsoluteAccess } from "@/lib/domain/permissions";
import { today } from "@/lib/domain/types";
import { addDays } from "@/lib/format";

export const Route = createFileRoute("/_app/journal")({ component: JournalPage });

function JournalPage() {
  const user = useSessionUser()!;
  const snap = useOps((s) => s);
  const monthStart = today().slice(0, 7) + "-01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today());
  const [group, setGroup] = useState<AuditGroup>("all");

  const rows = useMemo(() => {
    return (snap.audit ?? []).filter((e) => {
      const day = e.at.slice(0, 10);
      if (day < addDays(from, 0) || day > addDays(to, 0)) return false;
      if (group !== "all" && auditGroup(e.action) !== group) return false;
      return true;
    });
  }, [snap.audit, from, to, group]);

  if (!hasAbsoluteAccess(user.role)) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Админка"
        title="Журнал"
        description="Кто что сделал по всей сети: склад, списания, перемещения, ФОТ, смены и учётки. Без фильтра филиала."
      />
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Segmented
            value={group}
            onChange={(v) => setGroup(v as AuditGroup)}
            options={[
              { value: "all", label: "Все" },
              { value: "users", label: "Учётки" },
              { value: "stock", label: "Склад" },
              { value: "ops", label: "Смены" },
              { value: "other", label: "Прочее" },
            ]}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Field label="С">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="По">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>
      <AuditJournal
        entries={rows}
        users={snap.users}
        branches={snap.branches}
        empty="Записей нет. Они появляются после учёток, смен, списаний, перемещений, ревизий и ФОТ."
      />
    </div>
  );
}
