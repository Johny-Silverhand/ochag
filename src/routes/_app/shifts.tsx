import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useOps, useSessionUser } from "@/lib/data/store";
import { openShiftFor, shiftTotals, staffName } from "@/lib/domain/engine";
import { activeStopList, startList } from "@/lib/domain/stoplist";
import { canManageStopList } from "@/lib/domain/permissions";
import { STOP_REASON_LABEL, type StopListReason } from "@/lib/domain/types";
import { ruDate, ruDateTime, rub, signedRub } from "@/lib/format";
import { notify } from "@/lib/notify";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";
import { toast } from "sonner";
import { canOpenShift } from "@/lib/domain/permissions";

export const Route = createFileRoute("/_app/shifts")({ component: ShiftsPage });

function ShiftsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const openShift = useOps((s) => s.openShift);
  const closeShift = useOps((s) => s.closeShift);
  const setStopList = useOps((s) => s.setStopList);
  const topUpDebt = useOps((s) => s.topUpDebt);
  const canWrite = isWriteScope(session.branchId);
  const branchId = canWrite ? session.branchId : "";
  const current = canWrite ? openShiftFor(snap.shifts, branchId) : undefined;
  const totals = current ? shiftTotals(current, snap.sales) : null;
  const stopped = activeStopList(snap.stopList, canWrite ? branchId : "all");
  const available = canWrite ? startList(snap, branchId) : snap.recipes;
  const history = snap.shifts
    .filter((s) => !canWrite || s.branchId === branchId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <PageHeader
        eyebrow="Касса"
        title="Смены"
        description="Открытие с разменном, закрытие без ручного подсчёта повара: система считает ожидаемую кассу из чеков."
        actions={
          !canWrite ? null : current ? (
            <CloseDialog
              expected={totals?.expected ?? 0}
              onClose={(closeCash, note) => {
                closeShift({ closeCash, note });
                notify("shift", "Смена закрыта, зарплата начислена");
                notify("payroll", "ФОТ начислен по ставке и проценту");
              }}
            />
          ) : canOpenShift(user.role) ? (
            <OpenDialog
              staff={snap.users.filter((u) => u.branchId === branchId)}
              defaultStaff={snap.users.filter((u) => u.branchId === branchId).map((u) => u.id)}
              recipes={available}
              debts={snap.debts.filter((d) => d.branchId === branchId && d.status === "open")}
              onOpen={(openCash, staffIds, startIds, topUp) => {
                if (!startIds.length) {
                  toast.error("Подтвердите старт-лист перед открытием смены");
                  return;
                }
                openShift({
                  openCash,
                  staffIds,
                  startList: startIds,
                  topUpDebtId: topUp?.id,
                  topUpAmount: topUp?.amount,
                });
                notify("shift", "Смена открыта");
              }}
            />
          ) : null
        }
      />

      {!canWrite ? <p className="mb-3 text-xs text-muted">{WRITE_SCOPE_HINT}</p> : null}
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
            <Kpi label="Безнал" value={rub(totals.card + totals.qr + totals.transfer)} />
            <Kpi label="Ожидается в кассе" value={rub(totals.expected)} hint={`${totals.checks} чеков`} />
          </div>
        </Card>
      ) : (
        <Card className="mb-4">
          <p className="text-sm text-muted">Смена на этом филиале закрыта. Откройте перед первым чеком.</p>
        </Card>
      )}

      {canWrite ? (
        <Card className="mb-4">
          <div className="text-sm font-medium">Открытые долги кассы</div>
          <p className="mt-1 text-xs text-muted">
            Недостача не режет выручку и прибыль дня. Довнесение увеличивает размен открытой смены, не создаёт чек.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {snap.debts
              .filter((d) => d.branchId === branchId)
              .slice(0, 6)
              .map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {ruDate(d.date)} · {rub(d.amount)}
                    <span className="ml-2 text-xs text-muted">{d.status === "open" ? "открыт" : "довнесён"}</span>
                  </span>
                  {d.status === "open" && current ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        topUpDebt(d.id);
                        toast.success("Долг закрыт, размен увеличен. Выручка обоих дней без изменений.");
                      }}
                    >
                      Довнести в размен
                    </Button>
                  ) : null}
                </li>
              ))}
            {snap.debts.filter((d) => d.branchId === branchId).length === 0 ? (
              <li className="text-muted">Долгов нет.</li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Стоп-лист</div>
            {canManageStopList(user.role) ? (
              <StopListDialog
                recipes={snap.recipes}
                onStop={(recipeId, reason) => setStopList({ recipeId, reason })}
              />
            ) : null}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {stopped.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <span>
                  {snap.recipes.find((r) => r.id === e.recipeId)?.name ?? e.recipeId}
                  <span className="ml-2 text-xs text-muted">{STOP_REASON_LABEL[e.reason]}</span>
                </span>
                {canManageStopList(user.role) ? (
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-fg"
                    onClick={() => setStopList({ recipeId: e.recipeId, reason: e.reason, clear: true })}
                  >
                    в старт-лист
                  </button>
                ) : null}
              </li>
            ))}
            {stopped.length === 0 ? <p className="text-sm text-muted">Пусто — всё в продаже.</p> : null}
          </ul>
        </Card>
        <Card>
          <div className="text-sm font-medium">Старт-лист · {available.length} блюд</div>
          <p className="mt-2 text-sm text-muted">
            Доступно к продаже на смене. Стоп снимает позицию с ручного чека и с зала.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {available.slice(0, 10).map((r) => (
              <Badge key={r.id}>{r.name}</Badge>
            ))}
          </div>
        </Card>
      </div>

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
  recipes,
  debts,
  onOpen,
}: {
  staff: { id: string; name: string; position: string }[];
  defaultStaff: string[];
  recipes: { id: string; name: string }[];
  debts: { id: string; amount: number }[];
  onOpen: (
    openCash: number,
    staffIds: string[],
    startList: string[],
    topUp?: { id: string; amount: number },
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cash, setCash] = useState("15000");
  const [ids, setIds] = useState<string[]>(defaultStaff);
  const [startIds, setStartIds] = useState<string[]>(recipes.map((r) => r.id));
  const [topUpId, setTopUpId] = useState(debts[0]?.id ?? "");
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
          {debts.length ? (
            <div className="rounded-md bg-bg p-3">
              <p className="text-xs text-danger">
                Вечерний долг {debts.reduce((s, d) => s + d.amount, 0)} ₽. Размен — фактический пересчёт ящика. Долг не
                вычитается из ожидаемой кассы.
              </p>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(topUpId)} onChange={(e) => setTopUpId(e.target.checked ? debts[0]!.id : "")} />
                Закрыть долг при открытии (выручка вчера и сегодня не меняется)
              </label>
            </div>
          ) : null}
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
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted">Старт-лист (обязателен)</div>
            <ul className="max-h-40 space-y-1 overflow-auto">
              {recipes.map((r) => (
                <li key={r.id}>
                  <label className="flex h-10 items-center gap-2 rounded-sm px-2 hover:bg-bg">
                    <input
                      type="checkbox"
                      checked={startIds.includes(r.id)}
                      onChange={(e) =>
                        setStartIds((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)))
                      }
                    />
                    <span className="text-sm">{r.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (!startIds.length) {
                toast.error("Подтвердите старт-лист перед открытием смены");
                return;
              }
              const debt = debts.find((d) => d.id === topUpId);
              onOpen(Number(cash) || 0, ids, startIds, debt ? { id: debt.id, amount: debt.amount } : undefined);
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

function StopListDialog({
  recipes,
  onStop,
}: {
  recipes: { id: string; name: string }[];
  onStop: (recipeId: string, reason: StopListReason) => void;
}) {
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [reason, setReason] = useState<StopListReason>("manual");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">На стоп</Button>
      </DialogTrigger>
      <DialogContent title="Стоп-лист">
        <div className="space-y-3">
          <Field label="Блюдо">
            <NativeSelect value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Причина">
            <NativeSelect value={reason} onChange={(e) => setReason(e.target.value as StopListReason)}>
              {Object.entries(STOP_REASON_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              onStop(recipeId, reason);
              setOpen(false);
            }}
          >
            Поставить на стоп
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
