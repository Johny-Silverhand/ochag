import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useOps, useSessionUser } from "@/lib/data/store";
import { openShiftFor, shiftTotals, staffName } from "@/lib/domain/engine";
import { ruDate, ruDateTime, rub, signedRub } from "@/lib/format";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/_app/shifts")({ component: ShiftsPage });

function ShiftsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const openShift = useOps((s) => s.openShift);
  const closeShift = useOps((s) => s.closeShift);
  const branchId = session.branchId === "all" ? "br-pushkin" : session.branchId;
  const current = openShiftFor(snap.shifts, branchId);
  const totals = current ? shiftTotals(current, snap.sales) : null;
  const history = snap.shifts
    .filter((s) => s.branchId === branchId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <PageHeader
        eyebrow="Касса"
        title="Смены"
        description="Открытие с разменном, закрытие без ручного подсчёта повара: система считает ожидаемую кассу из чеков."
        actions={
          current ? (
            <CloseDialog
              expected={totals?.expected ?? 0}
              onClose={(closeCash, note) => {
                closeShift({ closeCash, note });
                notify("shift", "Смена закрыта, зарплата начислена");
                notify("payroll", "ФОТ начислен по ставке и проценту");
              }}
            />
          ) : (
            <OpenDialog
              staff={snap.users.filter((u) => u.branchId === branchId)}
              defaultStaff={snap.users.filter((u) => u.branchId === branchId).map((u) => u.id)}
              onOpen={(openCash, staffIds) => {
                openShift({ openCash, staffIds });
                notify("shift", "Смена открыта");
              }}
            />
          )
        }
      />

      {current && totals ? (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted">Текущая смена · {ruDateTime(current.openedAt)}</div>
              <div className="text-lg font-medium">Открыл {staffName(snap.users, current.openedBy)}</div>
            </div>
            <Badge tone="success">открыта</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Размен" value={rub(current.openCash)} />
            <Kpi label="Нал по чекам" value={rub(totals.cash)} />
            <Kpi label="Безнал" value={rub(totals.card + totals.qr)} />
            <Kpi label="Ожидается в кассе" value={rub(totals.expected)} hint={`${totals.checks} чеков`} />
          </div>
        </Card>
      ) : (
        <Card className="mb-4">
          <p className="text-sm text-muted">Смена на этом филиале закрыта. Откройте перед первым чеком.</p>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4 text-sm font-medium">История</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Выручка</th>
                <th className="px-3 py-2 font-medium">Ожид. нал</th>
                <th className="px-3 py-2 font-medium">Факт</th>
                <th className="px-5 py-2 font-medium">Расхождение</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => {
                const t = shiftTotals(s, snap.sales);
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-5 py-2.5">
                      {ruDate(s.date, { day: "numeric", month: "short", weekday: "short" })}
                      <div className="text-xs text-muted">{s.status === "open" ? "открыта" : "закрыта"}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{rub(t.revenue)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{rub(s.expectedCash ?? t.expected)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{s.closeCash != null ? rub(s.closeCash) : "—"}</td>
                    <td className="px-5 py-2.5 font-mono tabular-nums">
                      {s.discrepancy != null ? (
                        <span className={s.discrepancy === 0 ? "text-success" : "text-danger"}>{signedRub(s.discrepancy)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-subtle">
        {user.role === "cook"
          ? "Повару не нужно считать кассу: закрывает управляющий, ФОТ считается сам."
          : "При закрытии каждому в смене начисляется ставка + процент с выручки (если задан)."}
      </p>
    </div>
  );
}

function OpenDialog({
  staff,
  defaultStaff,
  onOpen,
}: {
  staff: { id: string; name: string; position: string }[];
  defaultStaff: string[];
  onOpen: (openCash: number, staffIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cash, setCash] = useState("15000");
  const [ids, setIds] = useState<string[]>(defaultStaff);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Открыть смену</Button>
      </DialogTrigger>
      <DialogContent title="Открытие смены">
        <div className="space-y-3">
          <Field label="Наличные в кассе, ₽">
            <Input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="numeric" />
          </Field>
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted">Кто в смене</div>
            <ul className="space-y-1">
              {staff.map((u) => (
                <li key={u.id}>
                  <label className="flex h-11 items-center gap-2 rounded-sm px-2 hover:bg-bg">
                    <input
                      type="checkbox"
                      checked={ids.includes(u.id)}
                      onChange={(e) =>
                        setIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)))
                      }
                    />
                    <span className="text-sm">
                      {u.name} <span className="text-muted">· {u.position}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              onOpen(Number(cash) || 0, ids);
              setOpen(false);
            }}
          >
            Открыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ expected, onClose }: { expected: number; onClose: (cash: number, note?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cash, setCash] = useState(String(Math.round(expected)));
  const [note, setNote] = useState("");
  const disc = (Number(cash) || 0) - expected;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Закрыть смену</Button>
      </DialogTrigger>
      <DialogContent title="Закрытие кассы">
        <p className="mb-3 text-sm text-muted">
          По чекам в ящике должно быть <span className="font-mono text-fg">{rub(expected)}</span>
        </p>
        <Field label="Пересчёт наличных, ₽">
          <Input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="numeric" />
        </Field>
        <p className={`mt-2 text-sm ${disc === 0 ? "text-success" : "text-danger"}`}>Расхождение: {signedRub(disc)}</p>
        <Field label="Комментарий" className="mt-3">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            onClose(Number(cash) || 0, note);
            setOpen(false);
          }}
        >
          Закрыть и начислить зарплату
        </Button>
      </DialogContent>
    </Dialog>
  );
}
