import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { BanquetEditor } from "@/components/banquet/editor";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { useOps, useSessionUser } from "@/lib/data/store";
import { canEditBanquet } from "@/lib/domain/permissions";
import { banquetBalance } from "@/lib/domain/engine";
import { BANQUET_LABEL, type BanquetStatus } from "@/lib/domain/types";
import { ruDate, rub } from "@/lib/format";
import { notify } from "@/lib/notify";
import { api } from "@/lib/api/client";
import { downloadBase64 } from "@/lib/reports/download";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/banquets/$id")({ component: BanquetDetail });

function BanquetDetail() {
  const { id } = Route.useParams();
  const banquet = useOps((s) => s.banquets.find((b) => b.id === id));
  const branches = useOps((s) => s.branches);
  const branch = branches.find((b) => b.id === banquet?.branchId);
  const setBanquetStatus = useOps((s) => s.setBanquetStatus);
  const upsertBanquet = useOps((s) => s.upsertBanquet);
  const user = useSessionUser()!;
  const canWrite = canEditBanquet(user.role);

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
            {(["guest", "waiter", "cook", "grill"] as const).map((sheet) => (
              <Button
                key={sheet}
                variant="ghost"
                onClick={() => {
                  void api<{ filename: string; base64: string; mime: string }>(
                    `reports/pdf?kind=banquet&id=${banquet.id}&sheet=${sheet}`,
                    { method: "GET" },
                  )
                    .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                    .catch((err) => toast.error(err instanceof Error ? err.message : "PDF недоступен"));
                }}
              >
                PDF {sheet === "guest" ? "лист" : sheet === "waiter" ? "зал" : sheet === "cook" ? "кухня" : "мангал"}
              </Button>
            ))}
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
          {canWrite ? (
            <NativeSelect
              className="mt-2"
              value={banquet.status}
              onChange={(e) => {
                const status = e.target.value as BanquetStatus;
                setBanquetStatus(banquet.id, status);
                if (status === "deposit_paid") {
                  void upsertBanquet({ ...banquet, status, depositPaid: true });
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

      {canWrite ? (
        <div className="mt-4">
          <BanquetEditor
            key={banquet.id}
            value={banquet}
            branches={branches}
            submitLabel="Сохранить карточку"
            onSave={(next) => {
              void upsertBanquet({ ...next, status: banquet.status, depositPaid: banquet.depositPaid }).then((ok) => {
                if (ok === false) return;
                notify("banquet", "Карточка банкета сохранена");
                toast.success("Банкет записан");
              });
            }}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SheetCard title="Официантам" items={banquet.serviceItems} extra={banquet.waiterNotes} />
            <SheetCard title="Шашлычнику" items={banquet.grillItems} extra={banquet.grillNotes} />
            <SheetCard title="На кухню" items={banquet.kitchenItems} extra={banquet.kitchenNotes} />
          </div>
          <Card className="mt-4">
            <div className="text-sm font-medium">Тайминг</div>
            <ul className="mt-3 space-y-2">
              {banquet.timeline.map((t) => (
                <li key={`${t.time}-${t.action}`} className="flex gap-3 text-sm">
                  <span className="w-14 font-mono text-muted tabular-nums">{t.time}</span>
                  <span>{t.action}</span>
                </li>
              ))}
            </ul>
            {banquet.notes ? <p className="mt-3 text-sm text-muted">{banquet.notes}</p> : null}
          </Card>
        </>
      )}
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
        {items.map((it, index) => (
          <li key={`${it.name}-${index}`} className="flex justify-between gap-2">
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
