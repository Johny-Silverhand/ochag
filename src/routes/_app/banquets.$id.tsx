import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { useOps, useSessionUser } from "@/lib/data/store";
import { canEditBanquet } from "@/lib/domain/permissions";
import { banquetBalance } from "@/lib/domain/engine";
import { BANQUET_LABEL, type BanquetStatus } from "@/lib/domain/types";
import { ruDate, rub } from "@/lib/format";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/_app/banquets/$id")({ component: BanquetDetail });

function BanquetDetail() {
  const { id } = Route.useParams();
  const banquet = useOps((s) => s.banquets.find((b) => b.id === id));
  const branch = useOps((s) => s.branches.find((b) => b.id === banquet?.branchId));
  const setBanquetStatus = useOps((s) => s.setBanquetStatus);
  const upsertBanquet = useOps((s) => s.upsertBanquet);
  const user = useSessionUser()!;

  if (!banquet) {
    return <p className="text-sm text-muted">Банкет не найден.</p>;
  }

  const rest = banquetBalance(banquet);

  return (
    <div>
      <PageHeader
        eyebrow={banquet.number}
        title={banquet.title}
        description={`${ruDate(banquet.date, { weekday: "long", day: "numeric", month: "long" })} · ${banquet.startTime}–${banquet.endTime} · ${branch?.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to="/print/banquet/$id" params={{ id: banquet.id }}>
                <Printer className="size-4" />
                Печать комплекта
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-xs text-muted">Клиент</div>
          <div className="mt-1 font-medium">{banquet.clientName}</div>
          <div className="text-sm text-muted">{banquet.clientPhone}</div>
          <div className="mt-4 text-xs text-muted">Зал</div>
          <div className="text-sm">{banquet.hall}</div>
          <div className="mt-4 text-xs text-muted">Гостей</div>
          <div className="font-mono text-lg tabular-nums">{banquet.guests}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted">Сумма / залог</div>
          <div className="mt-1 font-mono text-2xl tabular-nums">{rub(banquet.total)}</div>
          <div className="mt-2 text-sm">
            Залог {rub(banquet.deposit)} · {banquet.depositPaid ? "внесён" : "не внесён"}
          </div>
          <div className="mt-1 text-sm text-muted">К доплате {rub(rest)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted">Статус</div>
          {canEditBanquet(user.role) ? (
            <NativeSelect
              className="mt-2"
              value={banquet.status}
              onChange={(e) => {
                const status = e.target.value as BanquetStatus;
                setBanquetStatus(banquet.id, status);
                if (status === "deposit_paid") {
                  upsertBanquet({ ...banquet, status, depositPaid: true });
                }
                notify("banquet", "Статус банкета обновлён");
              }}
            >
              {Object.entries(BANQUET_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <div className="mt-2">
              <Badge>{BANQUET_LABEL[banquet.status]}</Badge>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SheetCard title="Официантам" items={banquet.serviceItems} extra={banquet.waiterNotes} />
        <SheetCard title="Шашлычнику" items={banquet.grillItems} />
        <SheetCard title="На кухню" items={banquet.kitchenItems} />
      </div>

      <Card className="mt-4">
        <div className="text-sm font-medium">Тайминг</div>
        <ul className="mt-3 space-y-2">
          {banquet.timeline.map((t) => (
            <li key={t.time} className="flex gap-3 text-sm">
              <span className="w-14 font-mono text-muted tabular-nums">{t.time}</span>
              <span>{t.action}</span>
            </li>
          ))}
        </ul>
        {canEditBanquet(user.role) ? (
          <Textarea
            className="mt-4"
            value={banquet.notes}
            onChange={(e) => upsertBanquet({ ...banquet, notes: e.target.value })}
          />
        ) : (
          <p className="mt-3 text-sm text-muted">{banquet.notes}</p>
        )}
      </Card>
    </div>
  );
}

function SheetCard({
  title,
  items,
  extra,
}: {
  title: string;
  extra?: string;
  items: { name: string; qty: number; unit: string; readyBy?: string; notes?: string }[];
}) {
  return (
    <Card>
      <div className="text-sm font-medium">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.name} className="flex justify-between gap-2">
            <span>
              {it.name}
              {it.readyBy ? <span className="block text-xs text-muted">к {it.readyBy}</span> : null}
              {it.notes ? <span className="block text-xs text-subtle">{it.notes}</span> : null}
            </span>
            <span className="font-mono tabular-nums whitespace-nowrap">
              {it.qty} {it.unit}
            </span>
          </li>
        ))}
      </ul>
      {extra ? <p className="mt-3 text-xs text-muted">{extra}</p> : null}
    </Card>
  );
}
