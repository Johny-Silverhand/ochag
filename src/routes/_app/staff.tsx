import { createFileRoute } from "@tanstack/react-router";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { useOps } from "@/lib/data/store";
import { filterByBranch, filterPeriod, periodStart } from "@/lib/domain/engine";
import { ROLE_LABEL, TODAY } from "@/lib/domain/types";
import { ruDate, rub } from "@/lib/format";

export const Route = createFileRoute("/_app/staff")({ component: StaffPage });

function StaffPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const scope = session.branchId;
  const from = periodStart(period);
  const rows = filterPeriod(filterByBranch(snap.payroll, scope), from, TODAY);
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
