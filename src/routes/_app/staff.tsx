import { createFileRoute } from "@tanstack/react-router";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { useOps, useSessionUser } from "@/lib/data/store";
import { filterByBranch, filterPeriod, periodStart } from "@/lib/domain/engine";
import { ROLE_LABEL, today, type Role } from "@/lib/domain/types";
import { ruDate, rub } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { canInviteStaff } from "@/lib/domain/permissions";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";

export const Route = createFileRoute("/_app/staff")({ component: StaffPage });

function StaffPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const scope = session.branchId;
  const from = periodStart(period);
  const rows = filterPeriod(filterByBranch(snap.payroll, scope), from, today());
  const user = useSessionUser()!;
  const inviteStaff = useOps((s) => s.inviteStaff);
  const total = rows.reduce((s, r) => s + r.total, 0);
  const staff = snap.users.filter((u) => u.role !== "owner" && (scope === "all" || u.branchId === scope));

  const byUser = staff.map((u) => {
    const accruals = rows.filter((r) => r.userId === u.id);
    const sum = accruals.reduce((s, r) => s + r.total, 0);
    const bonus = accruals.reduce((s, r) => s + r.bonus, 0);
    return { u, sum, bonus, shifts: accruals.length };
  });

  return (
    <div>
      <PageHeader
        eyebrow="ФОТ"
        title="Сотрудники и зарплаты"
        description="Ставка за смену плюс процент с выручки у официантов. Начисление — в момент закрытия кассы."
        actions={
          canInviteStaff(user.role) ? (
            <InviteStaff
              branches={snap.branches}
              defaultBranch={isWriteScope(scope) ? scope : snap.branches[0]?.id ?? ""}
              onInvite={(input) => {
                if (!input.branchId) {
                  toast.error(WRITE_SCOPE_HINT);
                  return;
                }
                inviteStaff(input);
                toast.success("Сотрудник приглашён");
              }}
            />
          ) : null
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Начислено за период" value={rub(total)} />
        <Kpi label="Смен закрыто" value={String(rows.length)} />
        <Kpi label="В штате" value={String(staff.length)} />
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Сотрудник</th>
              <th className="px-3 py-2 font-medium">Роль</th>
              <th className="px-3 py-2 font-medium">Ставка</th>
              <th className="px-3 py-2 font-medium">Смен</th>
              <th className="px-5 py-2 text-right font-medium">Начислено</th>
            </tr>
          </thead>
          <tbody>
            {byUser.map(({ u, sum, bonus, shifts }) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-5 py-2.5">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted">{u.position}</div>
                </td>
                <td className="px-3 py-2.5 text-muted">{ROLE_LABEL[u.role]}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">
                  {rub(u.shiftPay)}
                  {u.salesPercent ? <span className="block text-xs">+{u.salesPercent}%</span> : null}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{shifts}</td>
                <td className="px-5 py-2.5 text-right">
                  <div className="font-mono tabular-nums">{rub(sum)}</div>
                  {bonus ? <div className="text-xs text-muted">в т.ч. бонус {rub(bonus)}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="mt-4 overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">Последние начисления</div>
        <table className="w-full text-left text-sm">
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
      </Card>
    </div>
  );
}

function InviteStaff({
  branches,
  defaultBranch,
  onInvite,
}: {
  branches: { id: string; short: string; name: string }[];
  defaultBranch: string;
  onInvite: (input: {
    name: string;
    login: string;
    password: string;
    pin: string;
    role: Role;
    branchId: string;
    shiftPay: number;
    salesPercent: number;
    position?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("ochag");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("waiter");
  const [branchId, setBranchId] = useState(defaultBranch);
  const [shiftPay, setShiftPay] = useState("2500");
  const [salesPercent, setSalesPercent] = useState("0");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Пригласить</Button>
      </DialogTrigger>
      <DialogContent title="Новый сотрудник">
        <div className="grid gap-3">
          <Field label="Имя">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Логин">
              <Input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" />
            </Field>
            <Field label="PIN (4 цифры)">
              <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
            </Field>
          </div>
          <Field label="Пароль">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Роль">
              <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="manager">Управляющий</option>
                <option value="cook">Повар</option>
                <option value="waiter">Официант</option>
              </NativeSelect>
            </Field>
            <Field label="Филиал">
              <NativeSelect value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ставка за смену">
              <Input value={shiftPay} onChange={(e) => setShiftPay(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="% с выручки">
              <Input value={salesPercent} onChange={(e) => setSalesPercent(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <Button
            onClick={() => {
              if (!name.trim() || !login.trim() || pin.length !== 4) {
                toast.error("Имя, логин и PIN из 4 цифр обязательны");
                return;
              }
              if (!branchId) {
                toast.error(WRITE_SCOPE_HINT);
                return;
              }
              onInvite({
                name: name.trim(),
                login,
                password,
                pin,
                role,
                branchId,
                shiftPay: Number(shiftPay) || 0,
                salesPercent: Number(salesPercent) || 0,
              });
              setOpen(false);
            }}
          >
            Пригласить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
