import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { PhotoField, PhotoThumbs } from "@/components/docs/photo-field";
import { canManageHousehold, canTransfer, canWriteoff, canEditNomenclature, canSeeDocumentPhotos } from "@/lib/domain/permissions";
import {
  HOUSEHOLD_MOVE_LABEL,
  MOVEMENT_LABEL,
  WRITEOFF_LABEL,
  type DocumentPhoto,
  type HouseholdMoveType,
  type Unit,
  type WriteoffReason,
} from "@/lib/domain/types";
import { stockOf } from "@/lib/domain/engine";
import { qty, ruDateTime, rub } from "@/lib/format";
import { notify } from "@/lib/notify";
import { usePrefs } from "@/lib/prefs";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";
import { compareRevisions } from "@/lib/domain/analytics";
import { api } from "@/lib/api/client";
import { downloadBase64 } from "@/lib/reports/download";
import { parseNomenclatureCsv } from "@/lib/domain/nomenclature-csv";

export const Route = createFileRoute("/_app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const addWriteoff = useOps((s) => s.addWriteoff);
  const completeRevision = useOps((s) => s.completeRevision);
  const transferStock = useOps((s) => s.transferStock);
  const showFoodCost = usePrefs((s) => s.showFoodCost);
  const importProducts = useOps((s) => s.importProducts);
  const createProduct = useOps((s) => s.createProduct);
  const canWrite = isWriteScope(session.branchId);
  const branchId = canWrite ? session.branchId : "";
  const [tab, setTab] = useState("stock");
  const [q, setQ] = useState("");

  const stockRows = useMemo(() => {
    return snap.products
      .map((p) => {
        const have = canWrite
          ? stockOf(snap.stock, branchId, p.id)
          : snap.stock.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.qty, 0);
        const status = !canWrite ? "ok" : have < p.minQty * 0.4 ? "crit" : have < p.minQty ? "low" : "ok";
        return { p, have, status };
      })
      .filter((r) => r.p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.have / a.p.minQty - b.have / b.p.minQty);
  }, [snap, branchId, q, canWrite]);

  const movs = snap.movements
    .filter((m) => !canWrite || m.branchId === branchId)
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 60);

  return (
    <div>
      <PageHeader
        eyebrow="Товароучёт"
        title="Склад"
        description="Остатки, списания и ревизия. Продажа автоматически списывает ингредиенты по техкарте."
        actions={
          <div className="flex flex-wrap gap-2">
            {canWriteoff(user.role) && canWrite ? (
              <WriteoffDialog
                products={snap.products}
                onSubmit={(input) => {
                  addWriteoff(input);
                  notify("writeoff", "Списание проведено");
                }}
              />
            ) : null}
            {canTransfer(user.role) && canWrite ? (
              <TransferDialog
                products={snap.products}
                branches={snap.branches}
                fromId={branchId}
                onSubmit={(input) => {
                  transferStock(input);
                  toast.success("Перемещение проведено");
                }}
              />
            ) : null}
            {canWriteoff(user.role) && canWrite ? (
              <RevisionDialog
                rows={stockRows.map((r) => ({ id: r.p.id, name: r.p.name, unit: r.p.unit, have: r.have }))}
                onSubmit={(lines, photos) => {
                  completeRevision(lines, "Ревизия с планшета", photos);
                  toast.success("Ревизия закрыта, расхождения проведены");
                }}
              />
            ) : null}
            {canEditNomenclature(user.role) && canWrite ? (
              <AddProductDialog
                onSave={(input) => {
                  void createProduct(input).then((ok) => {
                    if (ok) toast.success("Продукция добавлена");
                  });
                }}
              />
            ) : null}
            <NomenclatureImport
              onImport={(rows, csv) => {
                void importProducts(rows, csv).then((ok) => {
                  if (ok) toast.success(`Импорт: ${rows.length} позиций`);
                });
              }}
            />
          </div>
        }
      />

      {!canWrite ? <p className="mb-3 text-xs text-muted">{WRITE_SCOPE_HINT} Остатки ниже — сумма по сети.</p> : null}
      {canWrite && snap.revisions[0] ? (
        <p className="mb-3 text-xs text-muted">
          Последняя ревизия {snap.revisions[0].date}.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void api<{ filename: string; base64: string; mime: string }>(
                `reports/pdf?kind=revision&id=${snap.revisions[0]!.id}`,
                { method: "GET" },
              )
                .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                .catch((err) => toast.error(err instanceof Error ? err.message : "PDF недоступен"));
            }}
          >
            Скачать акт PDF
          </button>
        </p>
      ) : null}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "stock", label: "Остатки" },
            { value: "mov", label: "Движения" },
            { value: "hoz", label: "Хозы" },
            { value: "cmp", label: "Ревизии" },
          ]}
        />
        <Input className="max-w-xs" placeholder="Поиск продукта" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {tab === "cmp" ? <RevisionCompare branchId={canWrite ? branchId : session.branchId} /> : null}

      {tab === "mov" ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Когда</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Продукт</th>
                <th className="px-5 py-2 text-right font-medium">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => {
                const p = snap.products.find((x) => x.id === m.productId);
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-muted">{ruDateTime(m.at)}</td>
                    <td className="px-3 py-2.5">
                      {MOVEMENT_LABEL[m.type]}
                      {m.reason ? <span className="block text-xs text-subtle">{WRITEOFF_LABEL[m.reason]}</span> : null}
                      {m.type === "transfer" && m.refId && m.qty < 0 ? (
                        <button
                          type="button"
                          className="mt-1 block text-xs underline-offset-2 hover:underline"
                          onClick={() => {
                            void api<{ filename: string; base64?: string; mime?: string; error?: string }>(
                              `reports/pdf?kind=waybill&id=${m.refId}`,
                              { method: "GET" },
                            )
                              .then((r) => {
                                if (!r.base64 || !r.mime) {
                                  toast.error(r.error ?? "PDF не собран");
                                  return;
                                }
                                downloadBase64(r.filename, r.base64, r.mime);
                              })
                              .catch((err) => toast.error(err instanceof Error ? err.message : "PDF недоступен"));
                          }}
                        >
                          накладная PDF
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">{p?.name}</td>
                    <td className={`px-5 py-2.5 text-right font-mono tabular-nums ${m.qty < 0 ? "text-danger" : "text-success"}`}>
                      {m.qty > 0 ? "+" : ""}
                      {qty(m.qty, p?.unit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === "hoz" ? <HouseholdPanel branchId={branchId} canWrite={canWrite} /> : null}

      {tab === "stock" ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Продукт</th>
                  <th className="px-3 py-2 font-medium">Остаток</th>
                  <th className="px-3 py-2 font-medium">Мин.</th>
                  {showFoodCost ? <th className="px-3 py-2 font-medium">Себест.</th> : null}
                  <th className="px-5 py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((r) => (
                  <tr key={r.p.id} className="border-t border-border">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{r.p.name}</div>
                      <div className="text-xs text-muted">{r.p.category}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{qty(r.have, r.p.unit)}</td>
                    <td className="px-3 py-2.5 font-mono text-muted tabular-nums">{qty(r.p.minQty, r.p.unit)}</td>
                    {showFoodCost ? <td className="px-3 py-2.5 font-mono tabular-nums">{rub(r.p.avgCost)}</td> : null}
                    <td className="px-5 py-2.5">
                      <Badge tone={r.status === "ok" ? "success" : r.status === "low" ? "warning" : "danger"}>
                        {r.status === "ok" ? "норма" : r.status === "low" ? "закуп" : "критично"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function RevisionCompare({ branchId }: { branchId: string }) {
  const snap = useOps((s) => s);
  const cmp = branchId && branchId !== "all" ? compareRevisions(snap, branchId) : null;
  if (!branchId || branchId === "all") {
    return (
      <Card>
        <p className="text-sm text-muted">{WRITE_SCOPE_HINT} Сравнение двух последних ревизий — по филиалу.</p>
      </Card>
    );
  }
  if (!cmp?.left || !cmp.right) {
    return (
      <Card>
        <p className="text-sm text-muted">Нужны две закрытые ревизии филиала.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm font-medium">
          {cmp.left.date} → {cmp.right.date}
        </div>
        <p className="mt-1 text-sm text-muted">
          Недосдачи относительно книги новой ревизии
          {cmp.shift ? ` · смена ${cmp.shift.date}` : ""}.
        </p>
        {cmp.byCategory?.length ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {cmp.byCategory.map((c) => (
              <Badge key={c.category} tone={c.shortage < 0 ? "danger" : "muted"}>
                {c.category || "Прочее"}: {c.count} поз. / {c.shortage.toFixed(1)}
              </Badge>
            ))}
          </ul>
        ) : null}
      </Card>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Продукт</th>
              <th className="px-3 py-2 font-medium">Было</th>
              <th className="px-3 py-2 font-medium">Стало</th>
              <th className="px-5 py-2 text-right font-medium">Недосдача</th>
            </tr>
          </thead>
          <tbody>
            {cmp.rows.map((r) => (
              <tr key={r.productId} className="border-t border-border">
                <td className="px-5 py-2.5">
                  {r.name}
                  <div className="text-xs text-muted">{r.category}</div>
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{r.older}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{r.newer}</td>
                <td className={`px-5 py-2.5 text-right font-mono tabular-nums ${r.shortage < 0 ? "text-danger" : ""}`}>
                  {r.shortage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function WriteoffDialog({
  products,
  onSubmit,
}: {
  products: { id: string; name: string }[];
  onSubmit: (input: { productId: string; qty: number; reason: WriteoffReason; note?: string }) => void;
}) {
  const requireNote = usePrefs((s) => s.requireWriteoffNote);
  const defaultReason = usePrefs((s) => s.defaultWriteoffReason);
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qtyV, setQtyV] = useState("1");
  const [reason, setReason] = useState<WriteoffReason>(defaultReason);
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) setReason(defaultReason);
    }}>
      <DialogTrigger asChild>
        <Button variant="secondary">Списание</Button>
      </DialogTrigger>
      <DialogContent title="Списать продукт">
        <div className="space-y-3">
          <Field label="Продукт">
            <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Количество">
            <Input type="number" step="0.1" value={qtyV} onChange={(e) => setQtyV(e.target.value)} />
          </Field>
          <Field label="Причина">
            <NativeSelect value={reason} onChange={(e) => setReason(e.target.value as WriteoffReason)}>
              {Object.entries(WRITEOFF_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={requireNote ? "Комментарий (обязательно)" : "Комментарий"}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              if (requireNote && note.trim().length < 2) {
                toast.error("Укажите комментарий к списанию");
                return;
              }
              onSubmit({ productId, qty: Number(qtyV), reason, note });
              setOpen(false);
              setNote("");
            }}
          >
            Провести списание
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RevisionDialog({
  rows,
  onSubmit,
}: {
  rows: { id: string; name: string; unit: string; have: number }[];
  onSubmit: (lines: { productId: string; bookQty: number; factQty: number }[], photos: DocumentPhoto[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<DocumentPhoto[]>([]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ревизия</Button>
      </DialogTrigger>
      <DialogContent title="Снять фактические остатки" className="max-w-xl">
        <div className="max-h-80 space-y-2 overflow-auto pr-1">
          {rows.slice(0, 12).map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_90px_90px] items-center gap-2 text-sm">
              <div>
                {r.name}
                <div className="text-xs text-muted">книга {qty(r.have, r.unit)}</div>
              </div>
              <div className="text-right font-mono text-xs text-muted tabular-nums">{r.have}</div>
              <Input
                value={facts[r.id] ?? String(r.have)}
                onChange={(e) => setFacts((f) => ({ ...f, [r.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <PhotoField value={photos} onChange={setPhotos} label="Фотоотчёт ревизии" />
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            onSubmit(
              rows.slice(0, 12).map((r) => ({
                productId: r.id,
                bookQty: r.have,
                factQty: Number(facts[r.id] ?? r.have),
              })),
              photos,
            );
            setOpen(false);
            setPhotos([]);
          }}
        >
          Закрыть ревизию
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  products,
  branches,
  fromId,
  onSubmit,
}: {
  products: { id: string; name: string }[];
  branches: { id: string; short: string }[];
  fromId: string;
  onSubmit: (input: { fromBranchId: string; toBranchId: string; productId: string; qty: number; note?: string }) => void;
}) {
  const destinations = Array.from(new Map(branches.filter((b) => b.id && b.id !== fromId).map((b) => [b.id, b])).values());
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [toId, setToId] = useState(destinations[0]?.id ?? "");
  const [qtyV, setQtyV] = useState("1");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Перемещение</Button>
      </DialogTrigger>
      <DialogContent title="Между филиалами">
        <div className="space-y-3">
          <Field label="Куда">
            {destinations.length ? (
              <NativeSelect value={toId} onChange={(e) => setToId(e.target.value)}>
                {destinations.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <p className="text-sm text-muted">Других филиалов нет — перемещать некуда.</p>
            )}
          </Field>
          <Field label="Продукт">
            <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Количество">
            <Input value={qtyV} onChange={(e) => setQtyV(e.target.value)} inputMode="decimal" />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              if (!toId || toId === fromId) {
                toast.error("Выберите другой филиал");
                return;
              }
              onSubmit({ fromBranchId: fromId, toBranchId: toId, productId, qty: Number(qtyV) });
              setOpen(false);
            }}
          >
            Провести
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NomenclatureImport({
  onImport,
}: {
  onImport: (rows: Array<{ name: string; category: string; unit: Unit; minQty: number; avgCost: number }>, csv?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Импорт номенклатуры</Button>
      </DialogTrigger>
      <DialogContent title="Импорт номенклатуры">
        <div className="space-y-3">
          <p className="text-sm text-muted">Столбцы: name;category;unit;minQty;avgCost. Заголовок необязателен. Единицы: kg, l, шт, порц.</p>
          <Field label="CSV">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="font-mono text-xs" />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              const rows = parseNomenclatureCsv(text);
              if (!rows.length) {
                toast.error("Нет строк для импорта");
                return;
              }
              onImport(rows, text);
              setOpen(false);
            }}
          >
            Импортировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddProductDialog({
  onSave,
}: {
  onSave: (input: { name: string; category?: string; unit?: Unit; minQty?: number; avgCost?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Прочее");
  const [unit, setUnit] = useState<Unit>("kg");
  const [minQty, setMinQty] = useState("1");
  const [avgCost, setAvgCost] = useState("0");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Добавить продукцию</Button>
      </DialogTrigger>
      <DialogContent title="Новая продукция">
        <div className="space-y-3">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Категория">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Единица">
            <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="шт">шт</option>
              <option value="порц">порц</option>
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Мин. остаток">
              <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Себест., ₽">
              <Input value={avgCost} onChange={(e) => setAvgCost(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) {
                toast.error("Название обязательно");
                return;
              }
              onSave({
                name: name.trim(),
                category: category.trim() || "Прочее",
                unit,
                minQty: Number(minQty) || 0,
                avgCost: Number(avgCost) || 0,
              });
              setOpen(false);
              setName("");
            }}
          >
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HouseholdPanel({ branchId, canWrite }: { branchId: string; canWrite: boolean }) {
  const snap = useOps((s) => s);
  const user = useSessionUser()!;
  const upsertHouseholdItem = useOps((s) => s.upsertHouseholdItem);
  const householdMove = useOps((s) => s.householdMove);
  const items = snap.householdItems ?? [];
  const allow = canManageHousehold(user.role) && canWrite;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Хозяйственные товары</div>
            <p className="mt-1 text-sm text-muted">Мыло, ланчбоксы, салфетки — отдельно от пищевого склада, не в фудкосте.</p>
          </div>
          {allow ? (
            <HouseholdItemDialog
              onSave={(input) => {
                upsertHouseholdItem(input);
                toast.success("Хозтовар сохранён");
              }}
            />
          ) : null}
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Позиция</th>
              <th className="px-3 py-2 font-medium">Остаток</th>
              <th className="px-5 py-2 text-right font-medium">Движение</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const have =
                snap.householdStock.find((s) => s.itemId === item.id && (!branchId || s.branchId === branchId))?.qty ??
                snap.householdStock.filter((s) => s.itemId === item.id).reduce((sum, s) => sum + s.qty, 0);
              return (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted">{item.category} · мин. {item.minQty}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{qty(have, item.unit)}</td>
                  <td className="px-5 py-2.5 text-right">
                    {allow ? (
                      <HouseholdMoveDialog
                        itemId={item.id}
                        name={item.name}
                        onSave={(input) => {
                          void householdMove(input).then((ok) => {
                            if (ok) toast.success("Движение хозов проведено");
                          });
                        }}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-sm text-muted">
                  Хозов пока нет — добавьте мыло, контейнеры, расходники.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="text-sm font-medium">Последние движения</div>
        <ul className="mt-3 space-y-2">
          {(snap.householdMovements ?? [])
            .filter((m) => !canWrite || m.branchId === branchId)
            .slice(0, 12)
            .map((m) => (
              <li key={m.id} className="text-sm">
                <span className="text-muted">{ruDateTime(m.at)} · </span>
                {HOUSEHOLD_MOVE_LABEL[m.type]} · {snap.householdItems.find((i) => i.id === m.itemId)?.name} · {m.qty}
                {canSeeDocumentPhotos(user.role) ? <PhotoThumbs photos={m.photos} /> : null}
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function HouseholdItemDialog({
  onSave,
}: {
  onSave: (input: { name: string; category?: string; minQty?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Хозы");
  const [minQty, setMinQty] = useState("4");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Позиция</Button>
      </DialogTrigger>
      <DialogContent title="Хозтовар">
        <Field label="Название">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Жидкое мыло" />
        </Field>
        <Field label="Категория" className="mt-3">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Минимум" className="mt-3">
          <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} inputMode="numeric" />
        </Field>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            if (!name.trim()) {
              toast.error("Название обязательно");
              return;
            }
            onSave({ name: name.trim(), category, minQty: Number(minQty) || 0 });
            setOpen(false);
            setName("");
          }}
        >
          Сохранить
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function HouseholdMoveDialog({
  itemId,
  name,
  onSave,
}: {
  itemId: string;
  name: string;
  onSave: (input: {
    itemId: string;
    type: HouseholdMoveType;
    qty: number;
    cost?: number;
    note?: string;
    photos?: DocumentPhoto[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<HouseholdMoveType>("receive");
  const [qtyV, setQtyV] = useState("1");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<DocumentPhoto[]>([]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Провести
        </Button>
      </DialogTrigger>
      <DialogContent title={name}>
        <Field label="Тип">
          <NativeSelect value={type} onChange={(e) => setType(e.target.value as HouseholdMoveType)}>
            {Object.entries(HOUSEHOLD_MOVE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Количество" className="mt-3">
          <Input value={qtyV} onChange={(e) => setQtyV(e.target.value)} inputMode="decimal" />
        </Field>
        {type === "receive" ? (
          <Field label="Цена за единицу, ₽" className="mt-3">
            <Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" />
          </Field>
        ) : null}
        <Field label="Комментарий" className="mt-3">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-3">
          <PhotoField value={photos} onChange={setPhotos} label={type === "receive" ? "Фотоотчёт (обязательно)" : "Фотоотчёт"} />
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            if (type === "receive" && photos.length < 1) {
              toast.error("Для прихода нужен хотя бы один снимок");
              return;
            }
            onSave({
              itemId,
              type,
              qty: Number(qtyV) || 0,
              cost: Number(cost) || 0,
              note: note.trim(),
              photos,
            });
            setOpen(false);
            setPhotos([]);
          }}
        >
          Провести
        </Button>
      </DialogContent>
    </Dialog>
  );
}

