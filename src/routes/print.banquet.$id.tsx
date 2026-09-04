import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useHydrated, useOps } from "@/lib/data/store";
import { ruDate, rub } from "@/lib/format";
import { BootScreen } from "@/components/layout/app-shell";
import { APP_NAME, LABS_CREDIT } from "@/lib/brand";

export const Route = createFileRoute("/print/banquet/$id")({ ssr: false, component: PrintBanquet });

function PrintBanquet() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const banquet = useOps((s) => s.banquets.find((b) => b.id === id));
  const branch = useOps((s) => s.branches.find((b) => b.id === banquet?.branchId));

  useEffect(() => {
    if (hydrated && banquet) {
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
  }, [hydrated, banquet]);

  if (!hydrated) return <BootScreen />;
  if (!banquet) return <p className="p-8 text-sm">Банкет не найден.</p>;

  const sheets = [
    {
      role: "Официантам",
      hint: "На холодильник в сервисной",
      lines: banquet.serviceItems,
      notes: banquet.waiterNotes,
    },
    {
      role: "Шашлычнику",
      hint: "На мангал",
      lines: banquet.grillItems,
      notes: "",
    },
    {
      role: "На кухню",
      hint: "Холодный и горячий цех",
      lines: banquet.kitchenItems,
      notes: banquet.notes,
    },
  ];

  return (
    <div className="bg-bg text-fg">
      <div className="no-print flex items-center justify-between px-6 py-4">
        <Button variant="ghost" asChild>
          <Link to="/banquets/$id" params={{ id }}>
            Назад
          </Link>
        </Button>
        <Button onClick={() => window.print()}>Печать</Button>
      </div>
      {sheets.map((sheet) => (
        <section key={sheet.role} className="print-page mx-auto max-w-2xl bg-elevated px-10 py-10">
          <div className="flex items-start justify-between border-b border-fg/15 pb-4">
            <div>
              <div className="text-xs tracking-[0.22em] uppercase">{APP_NAME} · {branch?.short}</div>
              <h1 className="mt-2 text-3xl font-medium tracking-tight">{sheet.role}</h1>
              <p className="text-sm text-muted">{sheet.hint}</p>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">{banquet.number}</div>
              <div>{ruDate(banquet.date, { day: "numeric", month: "long" })}</div>
              <div>
                {banquet.startTime}–{banquet.endTime}
              </div>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Событие</dt>
              <dd className="font-medium">{banquet.title}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Гостей</dt>
              <dd className="font-mono text-lg">{banquet.guests}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Зал</dt>
              <dd>{banquet.hall}</dd>
            </div>
          </dl>
          <table className="mt-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-fg/15 text-xs text-muted">
                <th className="py-2 font-medium">Позиция</th>
                <th className="py-2 font-medium">Кол-во</th>
                <th className="py-2 font-medium">К</th>
                <th className="py-2 font-medium">Заметка</th>
              </tr>
            </thead>
            <tbody>
              {sheet.lines.map((l) => (
                <tr key={l.name} className="border-b border-fg/10">
                  <td className="py-2.5">{l.name}</td>
                  <td className="py-2.5 font-mono">
                    {l.qty} {l.unit}
                  </td>
                  <td className="py-2.5">{l.readyBy ?? "—"}</td>
                  <td className="py-2.5 text-muted">{l.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {banquet.timeline.length > 0 && sheet.role === "Официантам" ? (
            <div className="mt-6">
              <div className="text-xs tracking-wide text-muted uppercase">Тайминг</div>
              <ul className="mt-2 space-y-1 text-sm">
                {banquet.timeline.map((t) => (
                  <li key={t.time}>
                    <span className="font-mono">{t.time}</span> — {t.action}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {sheet.notes ? <p className="mt-6 text-sm">{sheet.notes}</p> : null}
          <div className="mt-10 flex justify-between text-xs text-muted">
            <span>Клиент: {banquet.clientName}</span>
            <span>Сумма {rub(banquet.total)} · залог {banquet.depositPaid ? "есть" : "нет"}</span>
          </div>
          <p className="mt-8 text-[10px] tracking-wide text-subtle">{LABS_CREDIT}</p>
        </section>
      ))}
    </div>
  );
}
