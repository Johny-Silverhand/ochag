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
import { canWriteoff } from "@/lib/domain/permissions";
import { stockOf } from "@/lib/domain/engine";
import {
  MOVEMENT_LABEL,
  WRITEOFF_LABEL,
  type WriteoffReason,
} from "@/lib/domain/types";
import { qty, ruDateTime, rub } from "@/lib/format";
import { notify } from "@/lib/notify";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const addWriteoff = useOps((s) => s.addWriteoff);
  const completeRevision = useOps((s) => s.completeRevision);
  const showFoodCost = usePrefs((s) => s.showFoodCost);
  const branchId = session.branchId === "all" ? "br-pushkin" : session.branchId;
  const [tab, setTab] = useState("stock");
  const [q, setQ] = useState("");

  const stockRows = useMemo(() => {
    return snap.products
      .map((p) => {
        const have = stockOf(snap.stock, branchId, p.id);
        return { p, have, status: have < p.minQty * 0.4 ? "crit" : have < p.minQty ? "low" : "ok" };
      })
      .filter((r) => r.p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.have / a.p.minQty - b.have / b.p.minQty);
  }, [snap, branchId, q]);

  const movs = snap.movements
    .filter((m) => m.branchId === branchId)
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
            {canWriteoff(user.role) ? (
              <WriteoffDialog
                products={snap.products}
                onSubmit={(input) => {
                  addWriteoff(input);
                  notify("writeoff", "Списание проведено");
                }}
              />
            ) : null}
            {canWriteoff(user.role) ? (
              <RevisionDialog
                rows={stockRows.map((r) => ({ id: r.p.id, name: r.p.name, unit: r.p.unit, have: r.have }))}
                onSubmit={(lines) => {
                  completeRevision(lines, "Ревизия с планшета");
                  toast.success("Ревизия закрыта, расхождения проведены");
                }}
              />
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "stock", label: "Остатки" },
            { value: "mov", label: "Движения" },
          ]}
        />
        <Input className="max-w-xs" placeholder="Поиск продукта" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

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
      ) : (
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
      )}
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
