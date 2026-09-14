import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AuditJournal } from "@/components/admin/audit-journal";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { scopedAudit } from "@/lib/domain/audit-labels";
import { stopListHistory } from "@/lib/domain/analytics";
import { STOP_REASON_LABEL, today } from "@/lib/domain/types";
import { addDays, ruDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/quality")({ component: JournalsPage });

function JournalsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const [tab, setTab] = useState("audit");
  const monthStart = today().slice(0, 7) + "-01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today());
  const branchId = session.branchId;

  const audit = useMemo(() => {
    const scoped = scopedAudit(snap.audit, { role: user.role, sessionBranchId: branchId });
    return scoped.filter((e) => e.at.slice(0, 10) >= addDays(from, -1) && e.at.slice(0, 10) <= addDays(to, 1));
  }, [snap.audit, branchId, from, to, user.role]);
  const stops = useMemo(() => stopListHistory(snap, branchId, from, to), [snap, branchId, from, to]);

  return (
    <div>
      <PageHeader
        eyebrow="Этап 2"
        title="Журналы"
        description="Аудит действий и история стоп-листа за месяц. Журналы ХАССП и претензий зала — вне этого контура."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "audit", label: "Аудит" },
            { value: "stop", label: "Стоп-лист" },
          ]}
        />
        <div className="flex gap-2">
          <Field label="С">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="По">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </div>

      {tab === "audit" ? (
        <AuditJournal
          entries={audit}
          users={snap.users}
          branches={snap.branches}
          limit={80}
          empty="Записей нет. Они появляются после смен, закупок, ревизий, списаний, перемещений и учёток."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          {stops.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">За выбранный месяц стоп-листа нет.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Блюдо</th>
                  <th className="px-3 py-2 font-medium">Причина</th>
                  <th className="px-3 py-2 font-medium">Поставлен</th>
                  <th className="px-5 py-2 font-medium">Снят</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-5 py-2.5">
                      {snap.recipes.find((r) => r.id === e.recipeId)?.name ?? e.recipeId}
                      {e.note ? <div className="text-xs text-muted">{e.note}</div> : null}
                    </td>
                    <td className="px-3 py-2.5">{STOP_REASON_LABEL[e.reason]}</td>
                    <td className="px-3 py-2.5 text-muted">{ruDateTime(e.createdAt)}</td>
                    <td className="px-5 py-2.5 text-muted">{e.clearedAt ? ruDateTime(e.clearedAt) : "ещё на стопе"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
