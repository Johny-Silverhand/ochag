import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { emptyBanquetLine, removeBanquetLine, upsertBanquetLine } from "@/lib/domain/banquet";
import { branchHalls, type Banquet, type BanquetLine, type Branch } from "@/lib/domain/types";
import { uid } from "@/lib/utils";

type SheetKey = "grillItems" | "kitchenItems" | "serviceItems";

const SHEETS: { key: SheetKey; title: string; notesKey: "grillNotes" | "kitchenNotes" | "waiterNotes" }[] = [
  { key: "grillItems", title: "Шашлычнику", notesKey: "grillNotes" },
  { key: "kitchenItems", title: "На кухню", notesKey: "kitchenNotes" },
  { key: "serviceItems", title: "Официантам", notesKey: "waiterNotes" },
];

export function draftBanquet(branchId: string, halls: string[]): Banquet {
  return {
    id: uid("bn"),
    number: `БН-${Math.floor(Math.random() * 80 + 110)}`,
    branchId,
    title: "",
    clientName: "",
    clientPhone: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "18:00",
    endTime: "23:00",
    guests: 0,
    hall: halls[0] ?? "Основной зал",
    total: 0,
    deposit: 0,
    depositPaid: false,
    status: "inquiry",
    notes: "",
    waiterNotes: "",
    grillNotes: "",
    kitchenNotes: "",
    grillItems: [],
    kitchenItems: [],
    serviceItems: [],
    timeline: [],
  };
}

export function BanquetEditor({
  value,
  branches,
  onSave,
  submitLabel = "Сохранить",
}: {
  value: Banquet;
  branches: Branch[];
  onSave: (next: Banquet) => void | Promise<unknown>;
  submitLabel?: string;
}) {
  const [card, setCard] = useState<Banquet>(value);
  const branch = branches.find((b) => b.id === card.branchId) ?? branches[0];
  const halls = branchHalls(branch);

  function patch(partial: Partial<Banquet>) {
    setCard((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название">
          <Input value={card.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Филиал">
          <NativeSelect
            value={card.branchId}
            onChange={(e) => {
              const next = branches.find((b) => b.id === e.target.value);
              patch({ branchId: e.target.value, hall: branchHalls(next)[0] });
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.short || b.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Клиент">
          <Input value={card.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
        </Field>
        <Field label="Телефон">
          <Input value={card.clientPhone} onChange={(e) => patch({ clientPhone: e.target.value })} inputMode="tel" />
        </Field>
        <Field label="Дата">
          <Input type="date" value={card.date} onChange={(e) => patch({ date: e.target.value })} />
        </Field>
        <Field label="Зал">
          <NativeSelect value={card.hall} onChange={(e) => patch({ hall: e.target.value })}>
            {halls.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
            {halls.includes(card.hall) ? null : <option value={card.hall}>{card.hall}</option>}
          </NativeSelect>
        </Field>
        <Field label="Начало">
          <Input type="time" value={card.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
        </Field>
        <Field label="Конец">
          <Input type="time" value={card.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
        </Field>
        <Field label="Гостей">
          <Input
            value={String(card.guests)}
            onChange={(e) => patch({ guests: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Field>
        <Field label="Сумма, ₽">
          <Input
            value={String(card.total)}
            onChange={(e) => patch({ total: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Field>
        <Field label="Залог, ₽">
          <Input
            value={String(card.deposit)}
            onChange={(e) => patch({ deposit: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {SHEETS.map((sheet) => (
          <SheetEditor
            key={sheet.key}
            title={sheet.title}
            items={card[sheet.key]}
            notes={card[sheet.notesKey] ?? ""}
            onNotes={(notes) => patch({ [sheet.notesKey]: notes })}
            onChange={(items) => patch({ [sheet.key]: items })}
          />
        ))}
      </div>

      <Card>
        <div className="text-sm font-medium">Тайминг</div>
        <ul className="mt-3 space-y-2">
          {card.timeline.map((row, index) => (
            <li key={`${row.time}-${index}`} className="grid grid-cols-[7rem_1fr_auto] gap-2">
              <Input
                type="time"
                value={row.time}
                onChange={(e) => {
                  const timeline = card.timeline.map((item, i) => (i === index ? { ...item, time: e.target.value } : item));
                  patch({ timeline });
                }}
              />
              <Input
                value={row.action}
                onChange={(e) => {
                  const timeline = card.timeline.map((item, i) => (i === index ? { ...item, action: e.target.value } : item));
                  patch({ timeline });
                }}
              />
              <Button type="button" variant="ghost" onClick={() => patch({ timeline: card.timeline.filter((_, i) => i !== index) })}>
                Убрать
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => patch({ timeline: [...card.timeline, { time: card.startTime, action: "" }] })}
        >
          Добавить шаг
        </Button>
        <Field label="Общая заметка" className="mt-4">
          <Textarea value={card.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </Field>
      </Card>

      <Button
        type="button"
        onClick={() => {
          if (!card.title.trim() || !card.clientName.trim()) {
            toast.error("Название и клиент обязательны");
            return;
          }
          if (!card.branchId || card.branchId === "all") {
            toast.error("Выберите филиал");
            return;
          }
          void Promise.resolve(onSave(card));
        }}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

function SheetEditor({
  title,
  items,
  notes,
  onNotes,
  onChange,
}: {
  title: string;
  items: BanquetLine[];
  notes: string;
  onNotes: (value: string) => void;
  onChange: (items: BanquetLine[]) => void;
}) {
  const rows = useMemo(() => items, [items]);
  return (
    <Card>
      <div className="text-sm font-medium">{title}</div>
      <ul className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <li key={`${row.name}-${index}`} className="grid gap-2 rounded-xl bg-bg p-2">
            <Input
              value={row.name}
              placeholder="Блюдо / позиция"
              onChange={(e) => onChange(upsertBanquetLine(rows, index, { name: e.target.value }))}
            />
            <div className="grid grid-cols-[1fr_5rem_5rem] gap-2">
              <Input
                value={String(row.qty)}
                inputMode="decimal"
                onChange={(e) => onChange(upsertBanquetLine(rows, index, { qty: Number(e.target.value) || 0 }))}
              />
              <Input
                value={row.unit}
                onChange={(e) => onChange(upsertBanquetLine(rows, index, { unit: e.target.value }))}
              />
              <Input
                value={row.readyBy ?? ""}
                placeholder="к"
                onChange={(e) => onChange(upsertBanquetLine(rows, index, { readyBy: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={row.notes ?? ""}
                placeholder="Заметка к позиции"
                onChange={(e) => onChange(upsertBanquetLine(rows, index, { notes: e.target.value }))}
              />
              <Button type="button" variant="ghost" onClick={() => onChange(removeBanquetLine(rows, index))}>
                ×
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => onChange([...rows, emptyBanquetLine()])}>
        Добавить позицию
      </Button>
      <Field label="Заметка к листу" className="mt-3">
        <Textarea value={notes} onChange={(e) => onNotes(e.target.value)} />
      </Field>
    </Card>
  );
}
