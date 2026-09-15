import { createFileRoute, Link } from "@tanstack/react-router";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { useOps, useSessionUser } from "@/lib/data/store";
import { filterByBranch, filterPeriod, periodStart } from "@/lib/domain/engine";
import { PAYROLL_ADJ_LABEL, ROLE_LABEL, today, type PayrollAdjKind } from "@/lib/domain/types";
import { ruDate, rub } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { canInviteStaff, isNetworkAdmin } from "@/lib/domain/permissions";
import { isWriteScope } from "@/lib/ui/scope";
import { periodPayroll } from "@/lib/domain/analytics";
import { api } from "@/lib/api/client";
import { downloadText } from "@/lib/reports/download";

export const Route = createFileRoute("/_app/staff")({ component: StaffPage });

function StaffPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const scope = session.branchId;
  const from = periodStart(period);
  const rows = filterPeriod(filterByBranch(snap.payroll, scope), from, today());
  const user = useSessionUser()!;
  const adjustPayroll = useOps((s) => s.adjustPayroll);
  const accruePremiums = useOps((s) => s.accruePremiums);
  const sheet = periodPayroll(snap, period, scope);
  const total = sheet.reduce((s, r) => s + r.payable, 0);
  const staff = snap.users.filter((u) => !isNetworkAdmin(u.role) && (scope === "all" || u.branchId === scope));

  return (
    <div>
      <PageHeader
        eyebrow="ФОТ"
        title="Сотрудники и зарплаты"
        description="Ставка за смену плюс процент с выручки. Премии и доплаты — отдельно, начисляются кнопкой или корректировкой."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void api<{ filename: string; csv: string }>(`reports/csv?kind=payroll&period=${period}`, { method: "GET" })
                  .then((r) => downloadText(r.filename, r.csv, "text/csv;charset=utf-8"))
                  .catch((err) => toast.error(err instanceof Error ? err.message : "Ведомость недоступна"));
              }}
            >
              Ведомость CSV
            </Button>
            {canInviteStaff(user.role) && isWriteScope(scope) ? (
              <>
                <AccruePremiums
                  staff={staff}
                  onSave={(userIds) => {
                    void accruePremiums({ userIds }).then((ok) => {
                      if (ok) toast.success("Премии начислены выбранным сотрудникам");
                    });
                  }}
                />
                <AdjustPayroll
                  staff={staff}
                  onSave={(input) => {
                    void adjustPayroll(input).then((ok) => {
                      if (ok) toast.success("Корректировка записана");
                    });
                  }}
                />
              </>
            ) : null}
            {canInviteStaff(user.role) ? (
              <Button asChild>
                <Link to="/accounts">Пользователи</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Начислено за период" value={rub(total)} />
        <Kpi label="Смен закрыто" value={String(rows.length)} />
        <Kpi label="В штате" value={String(staff.length)} />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Сотрудник</th>
              <th className="px-3 py-2 font-medium">Роль</th>
              <th className="px-3 py-2 font-medium">Ставка</th>
              <th className="px-3 py-2 font-medium">Смен</th>
              <th className="px-3 py-2 font-medium">Доплата</th>
              <th className="px-3 py-2 font-medium">Премия</th>
              <th className="px-3 py-2 font-medium">Штраф</th>
              <th className="px-3 py-2 font-medium">Аванс</th>
              <th className="px-5 py-2 text-right font-medium">К выплате</th>
            </tr>
          </thead>
          <tbody>
            {sheet.filter((r) => !isNetworkAdmin(r.user.role)).map((r) => (
              <tr key={r.user.id} className="border-t border-border">
                <td className="px-5 py-2.5">
                  <div className="font-medium">{r.user.name}</div>
                  <div className="text-xs text-muted">{r.user.position}</div>
                </td>
                <td className="px-3 py-2.5 text-muted">{ROLE_LABEL[r.user.role]}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">
                  {rub(r.user.shiftPay)}
                  {r.user.salesPercent ? <span className="block text-xs">+{r.user.salesPercent}%</span> : null}
                  {r.user.monthlyPremium ? <span className="block text-xs">премия {rub(r.user.monthlyPremium)}</span> : null}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{r.shifts}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{rub(r.extra)}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{rub(r.premium)}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-danger">{rub(r.fine)}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{rub(r.advanceOut)}</td>
                <td className="px-5 py-2.5 text-right">
                  <div className="font-mono tabular-nums">{rub(r.payable)}</div>
                  {r.bonus ? <div className="text-xs text-muted">в т.ч. бонус {rub(r.bonus)}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <Card className="mt-4 overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">Последние начисления</div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-left text-sm">
          <tbody>
            {rows.slice(0, 12).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-5 py-2">{snap.users.find((u) => u.id === r.userId)?.name}</td>
                <td className="px-3 py-2 text-muted">{ruDate(r.date)}</td>
                <td className="px-5 py-2 text-right font-mono tabular-nums">{rub(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function AdjustPayroll({
  staff,
  onSave,
}: {
  staff: { id: string; name: string }[];
  onSave: (input: { userId: string; kind: PayrollAdjKind; amount: number; note: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(staff[0]?.id ?? "");
  const [kind, setKind] = useState<PayrollAdjKind>("extra");
  const [amount, setAmount] = useState("500");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Штраф / премия</Button>
      </DialogTrigger>
      <DialogContent title="Корректировка ФОТ">
        <div className="grid gap-3">
          <Field label="Сотрудник">
            <NativeSelect value={userId} onChange={(e) => setUserId(e.target.value)}>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Тип">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as PayrollAdjKind)}>
              {Object.entries(PAYROLL_ADJ_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Сумма, ₽">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Основание">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button
            onClick={() => {
              if (!userId || !note.trim()) {
                toast.error("Сотрудник и основание обязательны");
                return;
              }
              onSave({ userId, kind, amount: Number(amount) || 0, note: note.trim() });
              setOpen(false);
            }}
          >
            Записать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccruePremiums({
  staff,
  onSave,
}: {
  staff: { id: string; name: string; monthlyPremium?: number }[];
  onSave: (userIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setIds(staff.map((u) => u.id));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">Начислить премии</Button>
      </DialogTrigger>
      <DialogContent title="Месячные премии">
        <p className="mb-3 text-sm text-muted">Отметьте, кому начислить. Пустой список никому не платит.</p>
        {staff.length ? (
          <ul className="max-h-64 space-y-1 overflow-auto">
            {staff.map((u) => (
              <li key={u.id}>
                <label className="flex min-h-11 items-center gap-2 rounded-sm px-2 hover:bg-bg">
                  <input
                    type="checkbox"
                    checked={ids.includes(u.id)}
                    onChange={(e) =>
                      setIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)))
                    }
                  />
                  <span className="text-sm">
                    {u.name}
                    {u.monthlyPremium ? <span className="text-muted"> · {u.monthlyPremium} ₽</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Нет сотрудников со ставкой месячной премии.</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setIds([])}>
            Снять всех
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => setIds(staff.map((u) => u.id))}>
            Все
          </Button>
        </div>
        <Button
          className="mt-3 w-full"
          onClick={() => {
            if (!ids.length) {
              toast.error("Выберите сотрудников");
              return;
            }
            onSave(ids);
            setOpen(false);
          }}
        >
          Начислить выбранным
        </Button>
      </DialogContent>
    </Dialog>
  );
}

