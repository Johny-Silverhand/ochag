import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { getOpsStatus } from "@/lib/data/ops";
import { useOps, useSessionUser } from "@/lib/data/store";
import { useSync } from "@/lib/data/sync";
import { ruDateTime } from "@/lib/format";
import { canLoadSample, canResetDemo } from "@/lib/domain/permissions";

export const Route = createFileRoute("/_app/integrations")({ component: IntegrationsPage });

type KeeperStatus = {
  xmlImport: boolean;
  store?: string;
  http: {
    configured: boolean;
    urlHost: string;
    userSet: boolean;
    passwordSet: boolean;
    querySet: boolean;
    terminalId: string;
  };
};

function IntegrationsPage() {
  const resetDemo = useOps((s) => s.resetDemo);
  const loadSample = useOps((s) => s.loadSample);
  const logout = useOps((s) => s.logout);
  const user = useSessionUser();
  const role = user?.role ?? "owner";
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    source: "neon" | "pglite" | "memory" | "json";
    ready: boolean;
    updatedAt: string | null;
    sales: number;
  } | null>(null);
  const [keeper, setKeeper] = useState<KeeperStatus | null>(null);

  useEffect(() => {
    void getOpsStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
    void api<KeeperStatus>("integrations/keeper")
      .then(setKeeper)
      .catch(() => setKeeper(null));
  }, [sync.updatedAt]);

  const source = status?.source ?? sync.source;
  const dbLive =
    source === "neon"
      ? "Neon Postgres"
      : source === "json"
        ? "JSON-файл"
        : source === "memory"
          ? "Память процесса — учётки пропадут после перезапуска"
          : "Postgres (локальный контур)";
  const dbOk = source === "neon" || source === "json";

  return (
    <div>
      <PageHeader
        eyebrow="Подключения"
        title="Интеграции"
        description="Касса r_keeper, база сети и операционные сигналы. Здесь же — как подключить кипер на кафе."
      />

      <div className="grid gap-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">База</div>
              <h2 className="mt-1 text-lg font-medium">{dbLive}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                {source === "neon"
                  ? "Снимок сети пишется в Postgres. Пользователи, смены и чеки переживают холодный старт сервера."
                  : "На проде нужен DATABASE_URL (Neon). Без него новый экземпляр сервера забывает созданные учётки."}
              </p>
            </div>
            <Badge tone={dbOk && (status?.ready || sync.status === "ok") && sync.status !== "error" ? "success" : "warning"}>
              {sync.status === "saving"
                ? "запись"
                : sync.status === "error" || status?.ready === false
                  ? "нет связи"
                  : dbOk
                    ? "онлайн"
                    : "не постоянно"}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Чеков в базе</dt>
              <dd className="mt-0.5 font-mono tabular-nums">{status?.sales ?? sync.sales}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Последняя запись</dt>
              <dd className="mt-0.5 text-sm">
                {status?.updatedAt ? ruDateTime(status.updatedAt) : sync.updatedAt ? ruDateTime(sync.updatedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Движок</dt>
              <dd className="mt-0.5 font-mono text-sm">{source ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <KeeperSection keeper={keeper} />

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">Сигналы</div>
              <h2 className="mt-1 text-lg font-medium">Операционный советник</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                На обзоре считаются аномалии: фудкост, списания, касса, дефицит — по формулам контура. Разбор периода,
              плана и покрытия — в Аналитике и «RestoPro AI»; туда ходит ваша Ollama, если включена.
              </p>
            </div>
            <Badge tone="success">в работе</Badge>
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Учебный срез</div>
            <p className="text-sm text-muted">
              Пример для демонстрации продукта. На живой сети загрузка не стирает логины владельцев: сервер откажет.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canLoadSample(role) ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void loadSample()
                    .then((result) => {
                      if (!result.ok) return;
                      logout();
                      toast.success("Демо-контур загружен. Это учебные данные, не боевая сеть.");
                    })
                    .finally(() => setBusy(false));
                }}
              >
                Загрузить пример
              </Button>
            ) : (
              <p className="text-xs text-muted">Только администратор-техник, и не поверх коммерческой сети.</p>
            )}
            {canResetDemo(role) ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void resetDemo()
                    .then(() => toast.success("Сеть очищена"))
                    .catch(() => toast.error("Не удалось записать в базу"))
                    .finally(() => setBusy(false));
                }}
              >
                Очистить
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KeeperSection({ keeper }: { keeper: KeeperStatus | null }) {
  const httpOn = Boolean(keeper?.http.configured);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs tracking-wide text-muted uppercase">Касса</div>
          <h2 className="mt-1 text-lg font-medium">Кипер · r_keeper 7</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            RestoPro не заменяет кассу и фискальный регистратор. Продажи забираются из RK7: надёжный путь на этом хостинге —
            XML / Z-отчёт файлом. Живой HTTP с облака работает, только если XML-интерфейс кассы торчит в интернет.
          </p>
        </div>
        <Badge tone={httpOn ? "success" : "warning"}>{httpOn ? "HTTP задан" : "файл XML"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Хост XML-интерфейса">
          <Input value={keeper?.http.urlHost || "не задан"} readOnly />
        </Field>
        <Field label="Терминал">
          <Input value={keeper?.http.terminalId || "POS-01"} readOnly />
        </Field>
      </div>
      <p className="mt-2 text-xs text-muted">
        Логин XML: {keeper?.http.userSet ? "задан" : "нет"} · пароль: {keeper?.http.passwordSet ? "задан" : "нет"} · своя
        команда: {keeper?.http.querySet ? "да" : "GetOrderList по умолчанию"}
      </p>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-sm font-medium tracking-tight">Как подключить — по шагам</h3>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-muted">
          <li>
            <span className="font-medium text-fg">У дилера r_keeper</span> закажите лицензию{" "}
            <span className="font-medium text-fg">«XML-интерфейс RK7»</span> (иногда в прайсе как XML interface / RK7 API)
            и учётку для обмена. Без этой лицензии касса не отдаёт чеки наружу. Складской SH5 / StoreHouse для этого
            контура не нужен.
          </li>
          <li>
            На менеджерской станции включите XML-интерфейс: порт (часто 8080 или 9000), пользователь и пароль. Дилер
            покажет точный URL вида <span className="font-mono text-xs text-fg">http://касса:порт/rk7api/v0/xmlinterface.xml</span>.
          </li>
          <li>
            <span className="font-medium text-fg">Рабочий путь сегодня — файл.</span> В RK7 распечатайте или выгрузите
            Z-отчёт / список чеков смены в XML (UTF-8). Если в файле «кракозябры», откройте его в Блокноте и сохраните как
            UTF-8.
          </li>
          <li>
            В RestoPro выберите филиал в шапке, откройте смену на экране «Смены», затем «Продажи» → «Загрузить XML». После
            импорта чеки появляются в списке с меткой «кипер», склад списывается по техкартам с тем же названием блюда.
          </li>
          <li>
            Проверка: сумма смены в RestoPro совпадает с Z-отчётом кассы. Повтор той же выгрузки не дублирует чеки. Блюдо
            без техкарты попадёт в чек, но со склада не спишется — заведите карту с тем же именем.
          </li>
        </ol>
      </div>

      <div className="mt-5 rounded-lg bg-bg px-4 py-3">
        <h3 className="text-sm font-medium">Что умеет контур сейчас</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>
            <span className="font-medium text-fg">Работает:</span> загрузка XML (Receipt/Item, Check/Dish, Order), разбор
            Z-отчёта, списание по техкарте, защита от дублей.
          </li>
          <li>
            <span className="font-medium text-fg">Mini-API RK7:</span> рабочая команда —{" "}
            <span className="font-mono text-xs">GetOrderList</span> (чеки смены). Справочник меню{" "}
            <span className="font-mono text-xs">GetRefData</span> и один заказ{" "}
            <span className="font-mono text-xs">GetOrder</span> не подключены: блюда стыкуются по имени техкарты, не по
            коду RK7.
          </li>
          <li>
            <span className="font-medium text-fg">HTTP с облака:</span> кнопка «Забрать с кассы» на Продажах бьёт в{" "}
            <span className="font-mono text-xs">OCHAG_KEEPER_URL</span>. Касса в локальной сети кафе с Vercel, как
            правило, <span className="font-medium text-fg">не видна</span> — нужен белый IP, VPN или туннель, которые
            поднимает дилер. Без этого пользуйтесь файлом.
          </li>
          <li>
            <span className="font-medium text-fg">Не заменяет:</span> фискальный регистратор, ОФД, оплату картой,
            лояльность RK7.
          </li>
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium">Переменные окружения (хостинг)</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Переменная</th>
                <th className="py-1 font-medium">Зачем</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-xs text-fg">OCHAG_KEEPER_URL</td>
                <td className="py-1.5">Полный URL XML-интерфейса RK7. Пусто — только файл.</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-xs text-fg">OCHAG_KEEPER_USER</td>
                <td className="py-1.5">Логин XML-учётки (Basic auth).</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-xs text-fg">OCHAG_KEEPER_PASSWORD</td>
                <td className="py-1.5">Пароль XML-учётки. В интерфейс не показывается.</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-xs text-fg">OCHAG_KEEPER_TERMINAL</td>
                <td className="py-1.5">Код кассы / терминала в запросе GetOrderList.</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-xs text-fg">OCHAG_KEEPER_QUERY</td>
                <td className="py-1.5">Свой XML-запрос вместо GetOrderList, если дилер дал другую команду.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link to="/sales">Открыть продажи и загрузить XML</Link>
        </Button>
      </div>
    </Card>
  );
}
