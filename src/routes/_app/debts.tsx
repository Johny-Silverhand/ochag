import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { ledgerTotals } from "@/lib/domain/debts";
import { canSeeDebts } from "@/lib/domain/permissions";
import {
  LEDGER_DEBT_KIND_LABEL,
  LEDGER_DEBT_STATUS_LABEL,
  type LedgerDebtKind,
} from "@/lib/domain/types";
import { ruDate, rub } from "@/lib/format";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";

export const Route = createFileRoute("/_app/debts")({ component: DebtsPage });

function DebtsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const addLedgerDebt = useOps((s) => s.addLedgerDebt);
  const payLedgerDebt = useOps((s) => s.payLedgerDebt);
  const [kind, setKind] = useState<LedgerDebtKind | "all">("all");
  const canWrite = isWriteScope(session.branchId);

  if (!canSeeDebts(user.role)) {
    return (
      <div>
        <PageHeader eyebrow="Финансы" title="Долги" description="Учёт долгов видит только владелец." />
        <Card>
          <p className="text-sm text-muted">Этот раздел закрыт. Вечерний долг кассы остаётся на странице смен.</p>
        </Card>
      </div>
    );
  }

  const rows = useMemo(() => {
    return (snap.ledgerDebts ?? [])
      .filter((d) => session.branchId === "all" || d.branchId === session.branchId)
      .filter((d) => kind === "all" || d.kind === kind)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [snap.ledgerDebts, session.branchId, kind]);
  const totals = ledgerTotals(rows);

  return (
    <div>
      <PageHeader
        eyebrow="Только владелец"
        title="Долги"
        description="Клиенты, зарплата сотрудникам и поставщики. Вечерняя недостача кассы — на сменах, это другой контур."
        actions={
          canWrite ? (
            <DebtDialog
              onSave={(input) => {
                addLedgerDebt(input);
                toast.success("Долг записан");
              }}
            />
          ) : (
            <Button variant="secondary" onClick={() => toast.error(WRITE_SCOPE_HINT)}>
              Новый долг
            </Button>
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Клиенты" value={rub(totals.client)} />
        <Kpi label="Зарплата" value={rub(totals.staff_wage)} />
        <Kpi label="Поставщики" value={rub(totals.supplier)} />
        <Kpi label="Всего открыто" value={rub(totals.total)} />
      </div>
      <Segmented
        className="mb-4"
        value={kind}
        onChange={(v) => setKind(v as LedgerDebtKind | "all")}
        options={[
          { value: "all", label: "Все" },
          { value: "client", label: "Клиенты" },
          { value: "staff_wage", label: "Зарплата" },
          { value: "supplier", label: "Поставщики" },
        ]}
      />
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Контрагент</th>
              <th className="px-3 py-2 font-medium">Тип</th>
              <th className="px-3 py-2 font-medium">Сумма</th>
              <th className="px-3 py-2 font-medium">Остаток</th>
              <th className="px-5 py-2 text-right font-medium">Действие</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const left = Math.max(0, d.amount - d.paid);
              return (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{d.partyName}</div>
                    <div className="text-xs text-muted">
                      {ruDate(d.createdAt)} {d.note ? `· ${d.note}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{LEDGER_DEBT_KIND_LABEL[d.kind]}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{rub(d.amount)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-mono tabular-nums">{rub(left)}</div>
                    <Badge className="mt-1">{LEDGER_DEBT_STATUS_LABEL[d.status]}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {d.status !== "paid" && canWrite ? (
                      <PayDialog
                        left={left}
                        onPay={(amount, note) => {
                          payLedgerDebt({ debtId: d.id, amount, note });
                          toast.success("Погашение записано");
                        }}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-sm text-muted">
                  Открытых долгов нет. Запишите клиента, зарплату или счёт поставщика.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function DebtDialog({
  onSave,
}: {
  onSave: (input: { kind: LedgerDebtKind; partyName: string; amount: number; note?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LedgerDebtKind>("client");
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Новый долг</Button>
      </DialogTrigger>
      <DialogContent title="Долг учёта">
        <div className="grid gap-3">
          <Field label="Тип">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as LedgerDebtKind)}>
              {Object.entries(LEDGER_DEBT_KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Кто должен / кому должны">
            <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Имя, поставщик или сотрудник" />
          </Field>
          <Field label="Сумма, ₽">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Комментарий">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
          <Button
            onClick={() => {
              if (!partyName.trim() || !(Number(amount) > 0)) {
                toast.error("Контрагент и сумма обязательны");
                return;
              }
              onSave({ kind, partyName: partyName.trim(), amount: Number(amount), note: note.trim() });
              setOpen(false);
              setPartyName("");
              setAmount("");
              setNote("");
            }}
          >
            Записать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ left, onPay }: { left: number; onPay: (amount: number, note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.round(left)));
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Погасить
        </Button>
      </DialogTrigger>
      <DialogContent title="Погашение">
        <p className="text-sm text-muted">Остаток {rub(left)}</p>
        <Field label="Сумма, ₽" className="mt-3">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Комментарий" className="mt-3">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            onPay(Number(amount) || 0, note.trim());
            setOpen(false);
          }}
        >
          Провести
        </Button>
      </DialogContent>
    </Dialog>
  );
}
