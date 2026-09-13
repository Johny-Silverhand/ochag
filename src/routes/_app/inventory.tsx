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
import { canTransfer, canWriteoff } from "@/lib/domain/permissions";
import { stockOf } from "@/lib/domain/engine";
import {
  MOVEMENT_LABEL,
  WRITEOFF_LABEL,
  type WriteoffReason,
} from "@/lib/domain/types";
import { qty, ruDateTime, rub } from "@/lib/format";
import { notify } from "@/lib/notify";
import { usePrefs } from "@/lib/prefs";
import { isWriteScope, WRITE_SCOPE_HINT } from "@/lib/ui/scope";
import { compareRevisions } from "@/lib/domain/analytics";
import { api } from "@/lib/api/client";
import { downloadBase64, downloadText } from "@/lib/reports/download";
import type { Unit } from "@/lib/domain/types";

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
                onSubmit={(lines) => {
                  completeRevision(lines, "Ревизия с планшета");
                  toast.success("Ревизия закрыта, расхождения проведены");
                }}
              />
            ) : null}
            <NomenclatureImport
              onImport={(rows) => {
                importProducts(rows);
                toast.success(`Импорт: ${rows.length} позиций`);
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
        <p className="text-sm text-muted">Нужны две закрытые ревизии филиала. В учебной сети они есть на Южном.</p>
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
          Недостачи относительно книги новой ревизии
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
              <th className="px-5 py-2 text-right font-medium">Недостача</th>
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
  onSubmit: (lines: { productId: string; bookQty: number; factQty: number }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [facts, setFacts] = useState<Record<string, string>>({});
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
        <Button
          className="mt-4 w-full"
          onClick={() => {
            onSubmit(
              rows.slice(0, 12).map((r) => ({
                productId: r.id,
                bookQty: r.have,
                factQty: Number(facts[r.id] ?? r.have),
              })),
            );
            setOpen(false);
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
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [toId, setToId] = useState(branches.find((b) => b.id !== fromId)?.id ?? "");
  const [qtyV, setQtyV] = useState("1");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Перемещение</Button>
      </DialogTrigger>
      <DialogContent title="Между филиалами">
        <div className="space-y-3">
          <Field label="Куда">
            <NativeSelect value={toId} onChange={(e) => setToId(e.target.value)}>
              {branches
                .filter((b) => b.id !== fromId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
            </NativeSelect>
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
  onImport: (rows: Array<{ name: string; category: string; unit: Unit; minQty: number; avgCost: number }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("name;category;unit;minQty;avgCost\nСвинина шея;Мясо;kg;10;420");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Импорт номенклатуры</Button>
      </DialogTrigger>
      <DialogContent title="Шаблон номенклатуры">
        <div className="space-y-3">
          <p className="text-sm text-muted">Столбцы: name;category;unit;minQty;avgCost. Единицы: kg, l, шт, порц.</p>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              void api<{ filename: string; csv: string }>("nomenclature/template", { method: "GET" })
                .then((r) => downloadText(r.filename, r.csv, "text/csv;charset=utf-8"))
                .catch((err) => toast.error(err instanceof Error ? err.message : "Шаблон недоступен"));
            }}
          >
            Скачать шаблон CSV
          </Button>
          <Field label="CSV">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="font-mono text-xs" />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              const lines = text
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);
              const rows = lines.slice(1).map((line) => {
                const [name, category, unit, minQty, avgCost] = line.split(/[;,]/);
                return {
                  name: (name ?? "").trim(),
                  category: (category ?? "Прочее").trim(),
                  unit: ((unit ?? "kg").trim() as Unit) || "kg",
                  minQty: Number(minQty) || 0,
                  avgCost: Number(avgCost) || 0,
                };
              }).filter((r) => r.name);
              if (!rows.length) {
                toast.error("Нет строк для импорта");
                return;
              }
              onImport(rows);
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
