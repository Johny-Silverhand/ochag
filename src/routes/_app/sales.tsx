import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Kpi, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { canCreateSale, canImportKeeper } from "@/lib/domain/permissions";
import { filterByBranch, filterPeriod, openShiftFor, periodStart, salePayments, topDishes } from "@/lib/domain/engine";
import { PAYMENT_LABEL, TODAY, type PaymentType, type Period, type SaleItem } from "@/lib/domain/types";
import { pct, ruDateTime, rub } from "@/lib/format";
import { demoKeeperZReport, mapKeeperReceipts } from "@/lib/integrations/keeper";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

function SalesPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const setPeriod = useOps((s) => s.setPeriod);
  const user = useSessionUser()!;
  const importKeeperSales = useOps((s) => s.importKeeperSales);
  const addManualSale = useOps((s) => s.addManualSale);
  const ownSalesOnly = usePrefs((s) => s.waiterOwnSalesOnly);
  const scope = session.branchId;
  const from = periodStart(period);
  const rows = useMemo(() => {
    let list = filterPeriod(filterByBranch(snap.sales, scope), from, TODAY);
    if (user.role === "waiter" && ownSalesOnly) list = list.filter((s) => s.waiterId === user.id);
    return [...list].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [snap.sales, scope, from, user, ownSalesOnly]);

  const revenue = rows.reduce((s, r) => s + r.total, 0);
  const pays = rows.reduce(
    (acc, s) => {
      const p = salePayments(s);
      acc.cash += p.cash;
      acc.card += p.card;
      acc.qr += p.qr;
      return acc;
    },
    { cash: 0, card: 0, qr: 0 },
  );
  const dishes = topDishes(rows, 6);
  const open = scope === "all" ? null : openShiftFor(snap.shifts, scope);

  return (
    <div>
      <PageHeader
        eyebrow="Кипер + ручные чеки"
        title="Продажи"
        description="Чеки филиала, выручка и структура оплат. Импорт Z-отчёта кипера — в один шаг."
        actions={
          <div className="flex flex-wrap gap-2">
            <Segmented
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              options={[
                { value: "today", label: "Сегодня" },
                { value: "7d", label: "7 дней" },
                { value: "30d", label: "30 дней" },
              ]}
            />
            {canImportKeeper(user.role) ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (!open) {
                    toast.error("Откройте смену, затем импортируйте отчёт кипера");
                    return;
                  }
                  const mapped = mapKeeperReceipts(demoKeeperZReport(), snap.recipes, session.userId);
                  const n = importKeeperSales(mapped);
                  toast.success(`Забрано ${n} чеков из кипера`);
                }}
              >
                Импорт кипера
              </Button>
            ) : null}
            {canCreateSale(user.role) ? <ManualSaleDialog recipes={snap.recipes} onSubmit={addManualSale} disabled={!open} /> : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Выручка" value={rub(revenue)} hint={`${rows.length} чеков`} />
        <Kpi label="Наличные" value={rub(pays.cash)} />
        <Kpi label="Карта" value={rub(pays.card)} />
        <Kpi label="QR" value={rub(pays.qr)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4 text-sm font-medium">Чеки</div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Чек</th>
                  <th className="px-3 py-2 font-medium">Время</th>
                  <th className="px-3 py-2 font-medium">Оплата</th>
                  <th className="px-5 py-2 text-right font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 80).map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{s.number}</div>
                      <div className="text-xs text-muted">{s.items.map((i) => i.name).join(", ")}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{ruDateTime(s.at)}</td>
                    <td className="px-3 py-2.5">
                      <Badge>{PAYMENT_LABEL[s.payments[0]?.type ?? "card"]}</Badge>
                      {s.source === "keeper" ? <span className="ml-2 text-[10px] tracking-wide text-subtle uppercase">кипер</span> : null}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums">{rub(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="mb-3 text-sm font-medium">Состав продаж</div>
          <ul className="space-y-2">
            {dishes.map((d) => (
              <li key={d.name} className="flex justify-between text-sm">
                <span>{d.name}</span>
                <span className="font-mono text-muted tabular-nums">
                  {d.qty} · {pct((d.sum / (revenue || 1)) * 100, 0)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ManualSaleDialog({
  recipes,
  onSubmit,
  disabled,
}: {
  recipes: { id: string; name: string; price: number }[];
  onSubmit: (items: SaleItem[], payment: PaymentType) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [pay, setPay] = useState<PaymentType>("card");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Ручной чек</Button>
      </DialogTrigger>
      <DialogContent title="Чек без кипера">
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <NativeSelect value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={String(qty)} onChange={(e) => setQty(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              const r = recipes.find((x) => x.id === recipeId);
              if (!r) return;
              setItems((prev) => [...prev, { recipeId: r.id, name: r.name, qty, price: r.price, sum: r.price * qty }]);
            }}
          >
            Добавить позицию
          </Button>
          <ul className="space-y-1 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {it.name} × {it.qty}
                </span>
                <span className="font-mono">{rub(it.sum)}</span>
              </li>
            ))}
          </ul>
          <Field label="Оплата">
            <NativeSelect value={pay} onChange={(e) => setPay(e.target.value as PaymentType)}>
              <option value="cash">Наличные</option>
              <option value="card">Карта</option>
              <option value="qr">QR</option>
            </NativeSelect>
          </Field>
          <Button
            className="w-full"
            disabled={items.length === 0}
            onClick={() => {
              onSubmit(items, pay);
              setItems([]);
              setOpen(false);
              toast.success("Чек проведён, склад списан по техкарте");
            }}
          >
            Провести {rub(items.reduce((s, i) => s + i.sum, 0))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
