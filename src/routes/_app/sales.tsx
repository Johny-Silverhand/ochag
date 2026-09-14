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
import { canCreateSale, canDiscountSale, canImportKeeper, canVoidSale } from "@/lib/domain/permissions";
import { filterByBranch, filterPeriod, openShiftFor, periodStart, salePayments, topDishes } from "@/lib/domain/engine";
import { PAYMENT_LABEL, today, type PaymentType, type Period, type SaleItem } from "@/lib/domain/types";
import { pct, ruDateTime, rub } from "@/lib/format";
import { SAMPLE_KEEPER_XML } from "@/lib/integrations/keeper-xml";
import { isStopped } from "@/lib/domain/stoplist";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

function SalesPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const period = useOps((s) => s.period);
  const setPeriod = useOps((s) => s.setPeriod);
  const user = useSessionUser()!;
  const importKeeperXml = useOps((s) => s.importKeeperXml);
  const pullKeeperSales = useOps((s) => s.pullKeeperSales);
  const addManualSale = useOps((s) => s.addManualSale);
  const voidSale = useOps((s) => s.voidSale);
  const discountSale = useOps((s) => s.discountSale);
  const ownSalesOnly = usePrefs((s) => s.waiterOwnSalesOnly);
  const scope = session.branchId;
  const canWrite = isWriteScope(scope);
  const writeScope = canWrite ? scope : "";
  const from = periodStart(period);
  const rows = useMemo(() => {
    let list = filterPeriod(filterByBranch(snap.sales, scope), from, today());
    if (user.role === "waiter" && ownSalesOnly) list = list.filter((s) => s.waiterId === user.id);
    return [...list].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [snap.sales, scope, from, user, ownSalesOnly]);
  const live = rows.filter((s) => !s.voided);
  const revenue = live.reduce((s, r) => s + r.total, 0);
  const pays = live.reduce(
    (acc, s) => {
      const p = salePayments(s);
      acc.cash += p.cash;
      acc.card += p.card;
      acc.qr += p.qr;
      acc.transfer += p.transfer;
      return acc;
    },
    { cash: 0, card: 0, qr: 0, transfer: 0 },
  );
  const dishes = topDishes(live, 6);
  const open = openShiftFor(snap.shifts, writeScope);

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
              <>
                <Button
                  variant="secondary"
                  disabled={!canWrite}
                  onClick={() => {
                    if (!canWrite) {
                      toast.error(WRITE_SCOPE_HINT);
                      return;
                    }
                    if (!open) {
                      toast.error("Откройте смену, затем импортируйте отчёт кипера");
                      return;
                    }
                    void pullKeeperSales()
                      .then((n) => toast.success(n ? `Забрано ${n} чеков с кассы` : "Новых чеков нет"))
                      .catch((err: unknown) =>
                        toast.error(err instanceof Error ? err.message : "Касса недоступна. Загрузите XML-файл."),
                      );
                  }}
                >
                  Забрать с кассы
                </Button>
                <KeeperXmlDialog
                  disabled={!open || !canWrite}
                  onImport={async (xml) => {
                    const n = await importKeeperXml(xml);
                    toast.success(n ? `Проведено ${n} чеков из XML` : "Новых чеков нет — возможно, эта выгрузка уже загружена");
                    return n;
                  }}
                />
              </>
            ) : null}
            {canCreateSale(user.role) ? (
              <ManualSaleDialog
                recipes={snap.recipes.filter((r) => !canWrite || !isStopped(snap.stopList, writeScope, r.id))}
                onSubmit={addManualSale}
                disabled={!open || !canWrite || snap.settings.keeperCashLink}
                blockedReason={
                  !canWrite
                    ? WRITE_SCOPE_HINT
                    : snap.settings.keeperCashLink
                      ? "Ручной чек выключен: кассовая связь с кипером. Отключите её в настройках сети."
                      : !open
                        ? "Откройте смену перед чеком"
                        : undefined
                }
              />
            ) : null}
          </div>
        }
      />
      {scope === "all" ? <p className="mb-3 text-xs text-muted">{WRITE_SCOPE_HINT}</p> : null}
      {canWrite && snap.settings.keeperCashLink ? (
        <p className="mb-3 text-xs text-muted">
          Кассовая связь с кипером включена — ручной чек закрыт. Импорт XML и «Забрать с кассы» остаются. Инструкция — в
          разделе Интеграции.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Выручка" value={rub(revenue)} hint={`${rows.length} чеков`} />
        <Kpi label="Наличные" value={rub(pays.cash)} />
        <Kpi label="Карта" value={rub(pays.card)} />
        <Kpi label="QR" value={rub(pays.qr)} />
        <Kpi label="Перевод" value={rub(pays.transfer)} />
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
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
                      <div className="font-medium">
                        {s.number}
                        {s.voided ? <Badge className="ml-2">отмена</Badge> : null}
                        {s.discount ? <span className="ml-2 text-xs text-muted">скидка {rub(s.discount)}</span> : null}
                      </div>
                      <div className="text-xs text-muted">{s.items.map((i) => i.name).join(", ")}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{ruDateTime(s.at)}</td>
                    <td className="px-3 py-2.5">
                      <Badge>{PAYMENT_LABEL[s.payments[0]?.type ?? "card"]}</Badge>
                      {s.source === "keeper" ? <span className="ml-2 text-[10px] tracking-wide text-subtle uppercase">кипер</span> : null}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className={`font-mono tabular-nums ${s.voided ? "text-muted line-through" : ""}`}>{rub(s.total)}</div>
                      {canWrite && !s.voided && (canVoidSale(user.role) || canDiscountSale(user.role)) ? (
                        <div className="mt-1 flex justify-end gap-1">
                          {canDiscountSale(user.role) ? (
                            <DiscountDialog
                              max={s.total}
                              onSave={(amount, reason) => {
                                discountSale({ saleId: s.id, amount, reason });
                                toast.success("Скидка записана");
                              }}
                            />
                          ) : null}
                          {canVoidSale(user.role) ? (
                            <VoidDialog
                              onSave={(reason) => {
                                voidSale({ saleId: s.id, reason });
                                toast.success("Чек отменён, склад возвращён");
                              }}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </td>
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
  blockedReason,
}: {
  recipes: { id: string; name: string; price: number }[];
  onSubmit: (items: Omit<SaleItem, "costAtSale">[], payment: PaymentType) => void;
  disabled: boolean;
  blockedReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<Omit<SaleItem, "costAtSale">[]>([]);
  const [pay, setPay] = useState<PaymentType>("card");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          title={blockedReason}
          onClick={() => {
            if (disabled && blockedReason) toast.error(blockedReason);
          }}
        >
          Ручной чек
        </Button>
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
              <option value="transfer">Перевод</option>
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

function KeeperXmlDialog({
  disabled,
  onImport,
}: {
  disabled: boolean;
  onImport: (xml: string) => Promise<number>;
}) {
  const [open, setOpen] = useState(false);
  const [xml, setXml] = useState("");
  const [busy, setBusy] = useState(false);

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setXml(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={disabled}>
          Загрузить XML
        </Button>
      </DialogTrigger>
      <DialogContent title="Импорт r_keeper XML" className="max-h-[min(86dvh,40rem)] overflow-y-auto">
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted">
            <li>На кассе выгрузите Z-отчёт или чеки смены в XML (UTF-8).</li>
            <li>В RestoPro выберите филиал и откройте смену.</li>
            <li>Загрузите файл или вставьте текст и нажмите «Провести».</li>
            <li>Сверьте сумму на этом экране с Z-отчётом. Повтор той же выгрузки не дублирует чеки.</li>
          </ol>
          <p className="text-xs text-muted">
            Понимаем Receipt/Item, Check/Dish и Order. Живой HTTP с облака часто не достаёт кассу в зале — тогда только
            файл. Подробности: Интеграции → Кипер.
          </p>
          <Field label="Файл .xml">
            <Input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Field>
          <Field label="Или текст XML">
            <Textarea value={xml} onChange={(e) => setXml(e.target.value)} rows={8} className="font-mono text-xs" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setXml(SAMPLE_KEEPER_XML)}
            >
              Подставить пример
            </Button>
            <Button
              className="flex-1"
              disabled={busy || !xml.trim()}
              onClick={() => {
                setBusy(true);
                void onImport(xml)
                  .then(() => setOpen(false))
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Не удалось провести XML"))
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? "Проводим…" : "Провести XML"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({
  max,
  onSave,
}: {
  max: number;
  onSave: (amount: number, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [reason, setReason] = useState("скидка зала");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Скидка
        </Button>
      </DialogTrigger>
      <DialogContent title="Скидка по чеку">
        <p className="text-sm text-muted">Не больше суммы чека ({rub(max)}). Склад не трогаем.</p>
        <Field label="Сумма, ₽" className="mt-3">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Основание" className="mt-3">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            const n = Number(amount);
            if (!(n > 0)) {
              toast.error("Сумма скидки должна быть больше нуля");
              return;
            }
            if (n > max) {
              toast.error("Скидка больше чека");
              return;
            }
            onSave(n, reason.trim() || "скидка");
            setOpen(false);
          }}
        >
          Записать скидку
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({ onSave }: { onSave: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("ошибка");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Отмена
        </Button>
      </DialogTrigger>
      <DialogContent title="Отмена чека">
        <p className="text-sm text-muted">Списание по чеку вернётся на склад. Выручка смены уменьшится.</p>
        <Field label="Причина" className="mt-3">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button
          className="mt-4 w-full"
          variant="danger"
          onClick={() => {
            if (!reason.trim()) {
              toast.error("Укажите причину отмены");
              return;
            }
            onSave(reason.trim());
            setOpen(false);
          }}
        >
          Отменить чек
        </Button>
      </DialogContent>
    </Dialog>
  );
}
