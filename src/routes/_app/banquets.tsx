import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useOps, useSessionUser } from "@/lib/data/store";
import { canEditBanquet } from "@/lib/domain/permissions";
import { BANQUET_LABEL, TODAY, type Banquet, type BanquetStatus } from "@/lib/domain/types";
import { addDays as addIso, ruDate, rub } from "@/lib/format";
import { notify } from "@/lib/notify";
import { uid } from "@/lib/utils";

export const Route = createFileRoute("/_app/banquets")({ component: BanquetsPage });

const TONE: Record<BanquetStatus, "muted" | "primary" | "success" | "warning" | "danger"> = {
  inquiry: "muted",
  confirmed: "primary",
  deposit_paid: "success",
  done: "muted",
  cancelled: "danger",
};

function BanquetsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const upsertBanquet = useOps((s) => s.upsertBanquet);
  const scope = session.branchId;
  const rows = snap.banquets
    .filter((b) => scope === "all" || b.branchId === scope)
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const [cursor, setCursor] = useState(TODAY.slice(0, 7));

  const days = useMemo(() => monthCells(cursor), [cursor]);
  const byDay = new Map<string, Banquet[]>();
  for (const b of rows) {
    const list = byDay.get(b.date) ?? [];
    list.push(b);
    byDay.set(b.date, list);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Банкетный стол"
        title="Банкеты"
        description="Календарь, залог и комплект листов: официантам, шашлычнику и на кухню — из одной карточки."
        actions={canEditBanquet(user.role) ? <NewBanquet onCreate={upsertBanquet} branchId={scope === "all" ? "br-embank" : scope} /> : null}
      />

      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCursor(shiftMonth(cursor, -1))}>
          Назад
        </Button>
        <div className="text-sm font-medium capitalize">{monthTitle(cursor)}</div>
        <Button variant="ghost" size="sm" onClick={() => setCursor(shiftMonth(cursor, 1))}>
          Вперёд
        </Button>
      </div>

      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const items = d ? byDay.get(d) ?? [] : [];
            const isToday = d === TODAY;
            return (
              <div
                key={d ?? Math.random()}
                className={`min-h-16 rounded-md p-1 sm:min-h-20 ${d ? "bg-bg" : ""} ${isToday ? "ring-1 ring-primary/30" : ""}`}
              >
                {d ? <div className="text-[11px] text-muted">{Number(d.slice(-2))}</div> : null}
                {items.map((b) => (
                  <Link
                    key={b.id}
                    to="/banquets/$id"
                    params={{ id: b.id }}
                    className="mt-0.5 block truncate rounded-xs bg-primary/10 px-1 py-0.5 text-[10px] text-primary sm:text-xs"
                  >
                    {b.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        {rows
          .filter((b) => b.date >= TODAY)
          .map((b) => (
            <Link key={b.id} to="/banquets/$id" params={{ id: b.id }} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-[box-shadow] duration-150 hover:shadow-(--shadow-border-hover)">
                <div>
                  <div className="text-sm font-medium">{b.title}</div>
                  <div className="text-xs text-muted">
                    {ruDate(b.date, { day: "numeric", month: "long", weekday: "short" })} · {b.startTime} · {b.guests} гостей · {b.clientName}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums">{rub(b.total)}</span>
                  <Badge tone={TONE[b.status]}>{BANQUET_LABEL[b.status]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}

function monthCells(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, (m ?? 1) - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const last = new Date(y, m ?? 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last; d++) {
    cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function monthTitle(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function NewBanquet({ onCreate, branchId }: { onCreate: (b: Banquet) => void; branchId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(addIso(TODAY, 7));
  const [guests, setGuests] = useState("24");
  const [total, setTotal] = useState("80000");
  const [deposit, setDeposit] = useState("20000");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Новый банкет</Button>
      </DialogTrigger>
      <DialogContent title="Карточка банкета">
        <div className="grid gap-3">
          <Field label="Название">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Клиент">
              <Input value={client} onChange={(e) => setClient(e.target.value)} />
            </Field>
            <Field label="Телефон">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Дата">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Гостей">
              <Input value={guests} onChange={(e) => setGuests(e.target.value)} />
            </Field>
            <Field label="Сумма">
              <Input value={total} onChange={(e) => setTotal(e.target.value)} />
            </Field>
          </div>
          <Field label="Залог">
            <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
          <Button
            onClick={() => {
              if (!title || !client) return;
              onCreate({
                id: uid("bn"),
                number: `БН-${Math.floor(Math.random() * 80 + 110)}`,
                branchId,
                title,
                clientName: client,
                clientPhone: phone,
                date,
                startTime: "18:00",
                endTime: "23:00",
                guests: Number(guests) || 0,
                hall: "Основной зал",
                total: Number(total) || 0,
                deposit: Number(deposit) || 0,
                depositPaid: false,
                status: "inquiry",
                notes: "",
                waiterNotes: "",
                grillItems: [{ name: "Шашлык свинина", qty: Math.round((Number(guests) || 0) * 0.25), unit: "кг", readyBy: "18:30" }],
                kitchenItems: [{ name: "Салат свежий", qty: Number(guests) || 0, unit: "порц", readyBy: "17:40" }],
                serviceItems: [{ name: "Приборы", qty: Number(guests) || 0, unit: "шт" }],
                timeline: [
                  { time: "16:00", action: "Зал" },
                  { time: "18:00", action: "Встреча гостей" },
                ],
              });
              setOpen(false);
              notify("banquet", "Банкет в календаре");
            }}
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


