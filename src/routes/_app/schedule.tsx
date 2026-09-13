import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useOps } from "@/lib/data/store";
import { today } from "@/lib/domain/types";
import { addDays, ruDate } from "@/lib/format";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";

export const Route = createFileRoute("/_app/schedule")({ component: PeriodPage });

function PeriodPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const closePeriod = useOps((s) => s.closePeriod);
  const canWrite = isWriteScope(session.branchId);
  const branchId = canWrite ? session.branchId : "";
  const revisions = snap.revisions.filter((r) => r.status === "done" && (!canWrite || r.branchId === branchId));
  const closed = snap.closedPeriods.filter((p) => !canWrite || p.branchId === branchId);
  const [from, setFrom] = useState(addDays(today(), -7));
  const [to, setTo] = useState(today());
  const [revisionId, setRevisionId] = useState(revisions[0]?.id ?? "");

  return (
    <div>
      <PageHeader
        eyebrow="Этап 2"
        title="Закрытие периода"
        description="После ревизии период запирается. Правка задним числом отклоняется с объяснением — не тихим отказом."
      />
      {!canWrite ? <p className="mb-3 text-xs text-muted">{WRITE_SCOPE_HINT}</p> : null}

      <Card className="mb-4">
        <div className="text-sm font-medium">Закрыть период филиала</div>
        <p className="mt-1 text-sm text-muted">Нужна закрытая ревизия внутри выбранных дат. Табель смен сюда не подмешиваем.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="С">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="По">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Ревизия">
            <NativeSelect value={revisionId} onChange={(e) => setRevisionId(e.target.value)}>
              <option value="">—</option>
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.date} · {snap.branches.find((b) => b.id === r.branchId)?.short} · {r.note || "ревизия"}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Button
          className="mt-4"
          disabled={!canWrite}
          onClick={() => {
            if (!canWrite) {
              toast.error(WRITE_SCOPE_HINT);
              return;
            }
            if (!revisionId) {
              toast.error("Сначала закройте ревизию на складе");
              return;
            }
            try {
              closePeriod({ from, to, revisionId });
              toast.success("Период закрыт. Задние правки будут отклонены.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Не закрыто");
            }
          }}
        >
          Закрыть период
        </Button>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">Закрытые периоды</div>
        {closed.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Пока нет. После закрытия чек, накладная и списание на эти даты получат отказ с текстом.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Период</th>
                <th className="px-3 py-2 font-medium">Филиал</th>
                <th className="px-5 py-2 font-medium">Ревизия</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-5 py-2.5">
                    {ruDate(p.from)} — {ruDate(p.to)}
                    <div className="text-xs text-muted">закрыт {ruDate(p.closedAt)}</div>
                  </td>
                  <td className="px-3 py-2.5">{snap.branches.find((b) => b.id === p.branchId)?.short}</td>
                  <td className="px-5 py-2.5">
                    <Badge>{snap.revisions.find((r) => r.id === p.revisionId)?.date ?? p.revisionId}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
