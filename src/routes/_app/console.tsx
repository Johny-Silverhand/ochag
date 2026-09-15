import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OpsLogList } from "@/components/admin/ops-log-list";
import { PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { hasAbsoluteAccess } from "@/lib/domain/permissions";
import type { NetworkApplication, OpsLogLevel } from "@/lib/domain/types";
import { today } from "@/lib/domain/types";
import { addDays, ruDateTime } from "@/lib/format";
import { TARIFFS, type TariffId } from "@/lib/billing/plans";
import { showcaseExists } from "@/lib/data/showcase";

export const Route = createFileRoute("/_app/console")({ component: ConsolePage });

function ConsolePage() {
  const user = useSessionUser()!;
  const snap = useOps((s) => s);
  const ensureShowcase = useOps((s) => s.ensureShowcase);
  const monthStart = today().slice(0, 7) + "-01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today());
  const [level, setLevel] = useState<"all" | OpsLogLevel>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (snap.opsLogs ?? []).filter((e) => {
      if (level !== "all" && e.level !== level) return false;
      const day = e.at.slice(0, 10);
      if (day < addDays(from, 0) || day > addDays(to, 0)) return false;
      if (!needle) return true;
      return [e.detail, e.login, e.path, e.event].join(" ").toLowerCase().includes(needle);
    });
  }, [snap.opsLogs, from, to, level, q]);

  if (!hasAbsoluteAccess(user.role)) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Админка"
        title="Консоль"
        description="Заявки на сеть, витрина показа, входы и отказы. Не складской журнал — операционный лог."
        actions={
          showcaseExists(snap) ? null : (
            <Button
              variant="secondary"
              onClick={() => {
                void ensureShowcase().then((ok) => {
                  if (ok) toast.success("Витрина показа собрана. Логин выдаётся отдельно.");
                });
              }}
            >
              Собрать витрину показа
            </Button>
          )
        }
      />
      <PendingApplications applications={snap.pendingNetworks ?? []} />
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Segmented
            value={level}
            onChange={(v) => setLevel(v as "all" | OpsLogLevel)}
            options={[
              { value: "all", label: "Все" },
              { value: "info", label: "Инфо" },
              { value: "warn", label: "Важно" },
              { value: "error", label: "Ошибки" },
            ]}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Field label="С">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="По">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="Поиск" className="mt-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="логин, событие, текст" />
        </Field>
      </Card>
      <OpsLogList
        entries={rows}
        users={snap.users}
        empty="Пока тихо. Входы, отказы во входе, создание учёток и ошибки очереди появятся здесь."
      />
    </div>
  );
}

function PendingApplications({ applications }: { applications: NetworkApplication[] }) {
  const approveApplication = useOps((s) => s.approveApplication);
  const rejectApplication = useOps((s) => s.rejectApplication);
  const pending = applications.filter((a) => a.status === "pending");
  const done = applications.filter((a) => a.status !== "pending").slice(0, 6);
  return (
    <Card className="mb-4">
      <div className="text-sm font-medium">Заявки на сеть</div>
      <p className="mt-1 text-xs text-muted">
        Клиент ждёт подключения. Свяжитесь, назначьте тариф и активируйте вручную. Telegram: @arachtech.
      </p>
      <ul className="mt-3 space-y-3">
        {pending.map((a) => (
          <ApplicationRow
            key={a.id}
            row={a}
            onApprove={(tariff) => {
              void approveApplication({ id: a.id, tariff, paid: true }).then((ok) => {
                if (ok) toast.success(`Сеть ${a.login} подключена`);
              });
            }}
            onReject={() => {
              void rejectApplication({ id: a.id }).then((ok) => {
                if (ok) toast.success("Заявка отклонена");
              });
            }}
          />
        ))}
        {pending.length === 0 ? <li className="text-sm text-muted">Новых заявок нет.</li> : null}
      </ul>
      {done.length ? (
        <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted">
          {done.map((a) => (
            <li key={a.id}>
              {a.login} · {a.status === "approved" ? "подключена" : "отклонена"} · {ruDateTime(a.decidedAt ?? a.createdAt)}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function ApplicationRow({
  row,
  onApprove,
  onReject,
}: {
  row: NetworkApplication;
  onApprove: (tariff: TariffId) => void;
  onReject: () => void;
}) {
  const [tariff, setTariff] = useState<TariffId>((row.tariff as TariffId) || "trial");
  return (
    <li className="rounded-xl bg-bg p-3">
      <div className="text-sm font-medium">{row.ownerName}</div>
      <div className="mt-1 text-xs text-muted">
        логин {row.login}
        {row.phone ? ` · ${row.phone}` : ""} · {row.city}, {row.address}
      </div>
      <div className="mt-1 text-xs text-muted">
        филиал {row.branchName} · {row.seats} мест · {(row.halls ?? []).join(", ")}
        {row.tariff ? ` · хотели ${row.tariff}` : ""}
        {row.payerName ? ` · ${row.payerName}` : ""}
      </div>
      <div className="mt-2 text-[11px] text-subtle">{ruDateTime(row.createdAt)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <NativeSelect className="h-10 w-40" value={tariff} onChange={(e) => setTariff(e.target.value as TariffId)}>
          {TARIFFS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <Button size="sm" onClick={() => onApprove(tariff)}>
          Подключить
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          Отклонить
        </Button>
      </div>
    </li>
  );
}
