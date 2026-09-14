import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps } from "@/lib/data/store";
import { needToBuy } from "@/lib/domain/engine";
import { REQUEST_LABEL, today, type InvoiceLine, type Product, type Supplier, type SupplierChannel } from "@/lib/domain/types";
import { qty, ruDate, rub } from "@/lib/format";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";
import { priceHistory } from "@/lib/domain/analytics";
import { PhotoField, PhotoThumbs } from "@/components/docs/photo-field";

export const Route = createFileRoute("/_app/procurement")({ component: ProcurementPage });

function ProcurementPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const createRequestFromNeed = useOps((s) => s.createRequestFromNeed);
  const setRequestStatus = useOps((s) => s.setRequestStatus);
  const addInvoice = useOps((s) => s.addInvoice);
  const canWrite = isWriteScope(session.branchId);
  const branchId = canWrite ? session.branchId : "";
  const need = canWrite ? needToBuy(snap, branchId) : [];
  const [tab, setTab] = useState("need");
  const requests = canWrite ? snap.requests.filter((r) => r.branchId === branchId) : snap.requests;
  const invoices = canWrite ? snap.invoices.filter((r) => r.branchId === branchId) : snap.invoices;

  return (
    <div>
      <PageHeader
        eyebrow="Снабжение"
        title="Закупки"
        description="Минимальные остатки собирают заявку сами. Накладная ставит товар на приход и обновляет среднюю цену."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!canWrite}
              onClick={() => {
                if (!canWrite) {
                  toast.error(WRITE_SCOPE_HINT);
                  return;
                }
                if (!need.length) {
                  toast.message("Всё в норме — заявку собирать не из чего");
                  return;
                }
                createRequestFromNeed();
                toast.success("Заявка собрана из дефицита");
              }}
            >
              Собрать заявку
            </Button>
            {canWrite ? (
              <InvoiceDialog
                products={snap.products}
                onSave={(data) => {
                  addInvoice(data);
                  toast.success("Накладная оприходована");
                }}
              />
            ) : null}
          </div>
        }
      />

      {!canWrite ? <p className="mb-3 text-xs text-muted">{WRITE_SCOPE_HINT}</p> : null}
      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "need", label: "Необходимо купить" },
          { value: "req", label: "Заявки" },
          { value: "inv", label: "Накладные" },
          { value: "prices", label: "Цены" },
        ]}
      />

      {tab === "need" ? (
        <Card className="overflow-hidden p-0">
          {need.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">Дефицита нет.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Продукт</th>
                  <th className="px-3 py-2 font-medium">Есть</th>
                  <th className="px-3 py-2 font-medium">Мин.</th>
                  <th className="px-5 py-2 font-medium">Докупить</th>
                </tr>
              </thead>
              <tbody>
                {need.map((n) => (
                  <tr key={n.product.id} className="border-t border-border">
                    <td className="px-5 py-2.5">{n.product.name}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{qty(n.have, n.product.unit)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{qty(n.min, n.product.unit)}</td>
                    <td className="px-5 py-2.5 font-mono text-danger tabular-nums">{qty(n.deficit, n.product.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : null}

      {tab === "req" ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {r.number} · {ruDate(r.date)}
                  </div>
                  <div className="text-xs text-muted">{r.note || `${r.lines.length} позиций`}</div>
                </div>
                <Badge tone={r.status === "received" ? "success" : r.status === "sent" ? "primary" : "muted"}>
                  {REQUEST_LABEL[r.status]}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {r.lines.map((l) => {
                  const p = snap.products.find((x) => x.id === l.productId);
                  return (
                    <li key={l.productId} className="flex justify-between">
                      <span>{p?.name}</span>
                      <span className="font-mono tabular-nums">{qty(l.qty, p?.unit)}</span>
                    </li>
                  );
                })}
              </ul>
              {r.status === "draft" && canWrite ? (
                <SendRequest
                  suppliers={snap.suppliers}
                  defaultChannel={snap.settings.supplierChannel}
                  onSend={(supplierId) => {
                    setRequestStatus(r.id, "sent", supplierId);
                    toast.success("Статус «отправлена». Канал — очередь; без ключей ошибка видна в Настройках.");
                  }}
                />
              ) : r.status === "sent" ? (
                <p className="mt-3 text-xs text-muted">
                  Отправлена {r.sentAt ? r.sentAt.slice(0, 16).replace("T", " ") : ""}
                  {r.sentChannel ? ` · ${r.sentChannel}` : ""}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "prices" ? (
        <PriceHistory
          products={snap.products}
          productIdDefault={invoices[0]?.lines[0]?.productId ?? snap.products[0]?.id ?? ""}
          historyOf={(id) => priceHistory(snap, id, canWrite ? branchId : undefined)}
        />
      ) : null}

      {tab === "inv" ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Накладная</th>
                <th className="px-3 py-2 font-medium">Поставщик</th>
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-5 py-2 text-right font-medium">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-5 py-2.5 font-medium">
                    {inv.number}
                    <PhotoThumbs photos={inv.photos} />
                  </td>
                  <td className="px-3 py-2.5">{inv.supplier}</td>
                  <td className="px-3 py-2.5 text-muted">{ruDate(inv.date)}</td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums">{rub(inv.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}

function SendRequest({
  suppliers,
  defaultChannel,
  onSend,
}: {
  suppliers: Supplier[];
  defaultChannel: SupplierChannel;
  onSend: (supplierId?: string) => void;
}) {
  const preferred = suppliers.find((s) => s.channel === defaultChannel) ?? suppliers[0];
  const [supplierId, setSupplierId] = useState(preferred?.id ?? "");
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      {suppliers.length ? (
        <Field label="Канал поставщика">
          <NativeSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.channel}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <p className="text-xs text-muted">Поставщика нет — уйдёт в очередь сети ({defaultChannel}).</p>
      )}
      <Button size="sm" onClick={() => onSend(supplierId || undefined)}>
        Отправить поставщику
      </Button>
    </div>
  );
}

function PriceHistory({
  products,
  productIdDefault,
  historyOf,
}: {
  products: Product[];
  productIdDefault: string;
  historyOf: (id: string) => ReturnType<typeof priceHistory>;
}) {
  const [productId, setProductId] = useState(productIdDefault);
  const rows = productId ? historyOf(productId) : [];
  return (
    <Card>
      <div className="text-sm font-medium">История закупочной цены</div>
      <p className="mt-1 text-sm text-muted">Рост относительно прошлой накладной подсвечен.</p>
      <Field label="Продукт" className="mt-3 max-w-sm">
        <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </NativeSelect>
      </Field>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="py-2 font-medium">Дата</th>
            <th className="py-2 font-medium">Поставщик</th>
            <th className="py-2 text-right font-medium">Цена</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.date}-${i}`} className="border-t border-border">
              <td className="py-2">{ruDate(r.date)}</td>
              <td className="py-2">{r.supplier}</td>
              <td className={`py-2 text-right font-mono tabular-nums ${r.up ? "text-danger" : ""}`}>
                {rub(r.price)}
                {r.up ? <span className="ml-2 text-xs">↑ {r.pct.toFixed(0)}%</span> : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-sm text-muted">
                Нет накладных по позиции.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}

function InvoiceDialog({
  products,
  onSave,
}: {
  products: { id: string; name: string; avgCost: number }[];
  onSave: (data: { supplier: string; number: string; date: string; lines: InvoiceLine[]; photos?: import("@/lib/domain/types").DocumentPhoto[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("Мясоопт Юг");
  const [number, setNumber] = useState("НФ-");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [q, setQ] = useState("10");
  const [price, setPrice] = useState("420");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [photos, setPhotos] = useState<import("@/lib/domain/types").DocumentPhoto[]>([]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Накладная</Button>
      </DialogTrigger>
      <DialogContent title="Приход по накладной">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Поставщик">
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </Field>
          <Field label="Номер">
            <Input value={number} onChange={(e) => setNumber(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_70px_90px] gap-2">
          <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <Input value={q} onChange={(e) => setQ(e.target.value)} />
          <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <Button
          variant="secondary"
          className="mt-2 w-full"
          onClick={() => setLines((prev) => [...prev, { productId, qty: Number(q), price: Number(price) }])}
        >
          Строка
        </Button>
        <ul className="mt-2 space-y-1 text-sm">
          {lines.map((l, i) => (
            <li key={i} className="flex justify-between">
              <span>{products.find((p) => p.id === l.productId)?.name}</span>
              <span className="font-mono">{rub(l.qty * l.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <PhotoField value={photos} onChange={setPhotos} label="Фото накладной" />
        </div>
        <Button
          className="mt-4 w-full"
          disabled={!lines.length}
          onClick={() => {
            onSave({ supplier, number, date: today(), lines, photos });
            setLines([]);
            setPhotos([]);
            setOpen(false);
          }}
        >
          Поставить на приход
        </Button>
      </DialogContent>
    </Dialog>
  );
}
