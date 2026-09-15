import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { TARIFFS, tariffById, type TariffId, type TariffPlan } from "@/lib/billing/plans";
import { MARKETING_HERO_SRC, NETWORK_NAME } from "@/lib/brand";
import { parseHalls } from "@/lib/domain/types";

const WAIT_KEY = "restopro-wait-application";
const TELEGRAM = "https://t.me/arachtech";

export type ApplicationInput = {
  ownerName: string;
  login: string;
  password: string;
  pin: string;
  phone?: string;
  branchName: string;
  city: string;
  address: string;
  seats?: number;
  halls?: string[];
  tariff?: TariffId;
};

export function CommercialGate({
  canSubmit,
  submitApplication,
}: {
  onboarded?: boolean;
  canCreateNetwork?: boolean;
  paidTariff?: TariffId | null;
  simulatePayment?: (tariff: TariffId) => Promise<boolean>;
  onboardNetwork?: (input: ApplicationInput) => Promise<{ ok: true } | { ok: false; reason: string }>;
  canSubmit: boolean;
  submitApplication: (input: ApplicationInput) => Promise<{ ok: true } | { ok: false; reason: string }>;
}) {
  const [about, setAbout] = useState(false);
  const [flow, setFlow] = useState<"form" | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    try {
      setWaiting(sessionStorage.getItem(WAIT_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  if (waiting) {
    return <WaitingScreen onAbout={() => setAbout(true)} about={about} setAbout={setAbout} />;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="w-full" onClick={() => setAbout(true)}>
          Что такое RestoPro?
        </Button>
        {canSubmit ? (
          <Button type="button" className="w-full" onClick={() => setFlow("form")}>
            Оставить заявку
          </Button>
        ) : null}
      </div>
      {canSubmit ? (
        <p className="text-xs text-muted">
          Сеть не открывается сама. После заявки администратор свяжется и подключит контур вручную.
        </p>
      ) : null}

      <AboutDialog open={about} onOpenChange={setAbout} />

      <Dialog open={flow === "form"} onOpenChange={(open) => { if (!open) setFlow(null); }}>
        <DialogContent title="Заявка на сеть" className="max-w-lg">
          <ApplyStep
            submit={submitApplication}
            onBack={() => setFlow(null)}
            onDone={() => {
              try {
                sessionStorage.setItem(WAIT_KEY, "1");
              } catch {
                /* ignore */
              }
              setFlow(null);
              setWaiting(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Что такое ${NETWORK_NAME}`} className="max-w-2xl">
        <img
          src={MARKETING_HERO_SRC}
          alt="Планшет с контуром RestoPro на фоне кафе"
          className="mb-4 aspect-video w-full rounded-2xl object-cover"
        />
        <p className="text-sm leading-relaxed text-muted">
          {NETWORK_NAME} — товароучёт и управление кафе поверх продаж r_keeper: склад и техкарты, роли
          сотрудников, филиалы, смены с кассой, банкеты и прибыль без таблиц «к пятнице».
        </p>
        <ul className="mt-4 space-y-2 text-sm text-fg">
          <li>
            <span className="font-medium">Продажи с кипера.</span> Чеки приходят XML-файлом или с XML-интерфейса RK7.
            Касса и фискальный регистратор остаются на месте.
          </li>
          <li>
            <span className="font-medium">Роли.</span> Владелец видит сеть, управляющий — филиал, зал и кухня — свои
            экраны. PIN для смены, пароль для кабинета.
          </li>
          <li>
            <span className="font-medium">Филиалы.</span> Несколько точек, перемещения, ревизии, единый контур.
          </li>
          <li>
            <span className="font-medium">Смены и банкеты.</span> Открытие смены, старт-лист, стоп-лист, банкетные листы.
          </li>
          <li>
            <span className="font-medium">Прибыль.</span> Фудкост, ФОТ, период, план-факт. ИИ-сводка — на тарифе
            «Профессиональный + ИИ».
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted">
          Заявку рассматривает администратор. Уже выданный логин — форма входа ниже, без повторной регистрации.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function WaitingScreen({
  onAbout,
  about,
  setAbout,
}: {
  onAbout: () => void;
  about: boolean;
  setAbout: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-bg p-4">
        <div className="text-sm font-medium">Заявка принята</div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Сеть ещё не подключена. Дождитесь, пока администратор свяжется и откроет доступ. Пишите в Telegram{" "}
          <a href={TELEGRAM} className="font-medium text-fg underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
            @arachtech
          </a>
          .
        </p>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onAbout}>
        Что такое RestoPro?
      </Button>
      <AboutDialog open={about} onOpenChange={setAbout} />
    </div>
  );
}

function ApplyStep({
  submit,
  onBack,
  onDone,
}: {
  submit: (input: ApplicationInput) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onBack: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [branchName, setBranchName] = useState("Филиал 1");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [seats, setSeats] = useState("40");
  const [halls, setHalls] = useState("Основной зал");
  const [tariff, setTariff] = useState<TariffId>("trial");

  return (
    <div className="form-narrow">
      <p className="mb-4 text-sm text-muted">
        Данные уйдут администратору. После отправки сеть не откроется сама — только после ручного подключения.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void submit({
            ownerName,
            login,
            password,
            pin,
            phone,
            branchName,
            city,
            address,
            seats: Number(seats) || 40,
            halls: parseHalls(halls),
            tariff,
          }).then((result) => {
            setBusy(false);
            if (!result.ok) {
              setError(result.reason);
              return;
            }
            toast.success("Заявка отправлена. Ждите подключения.");
            onDone();
          });
        }}
      >
        <Field label="Имя владельца">
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Телефон для связи">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+7 …" />
        </Field>
        <Field label="Логин">
          <Input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Пароль">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="PIN (4 цифры)">
          <Input
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            autoComplete="off"
          />
        </Field>
        <Field label="Первый филиал">
          <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Город">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Адрес">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Посадочных мест">
            <Input value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Залы (через запятую)">
            <Input value={halls} onChange={(e) => setHalls(e.target.value)} placeholder="Основной зал, Веранда" />
          </Field>
        </div>
        <Field label="Желаемый тариф">
          <NativeSelect value={tariff} onChange={(e) => setTariff(e.target.value as TariffId)}>
            {TARIFFS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {plan.price}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <TariffHint plan={tariffById(tariff)} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex min-w-0 gap-2">
          <Button type="button" variant="outline" className="min-w-0 flex-1" onClick={onBack} disabled={busy}>
            Назад
          </Button>
          <Button type="submit" className="min-w-0 flex-1" disabled={busy}>
            {busy ? "Отправляем…" : "Отправить заявку"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function TariffHint({ plan }: { plan: TariffPlan }) {
  return (
    <div className="rounded-xl bg-bg p-3 text-xs text-muted">
      <div className="flex items-center gap-2 text-fg">
        <span className="font-medium">{plan.name}</span>
        {plan.ai ? <Badge tone="primary">ИИ</Badge> : null}
      </div>
      <p className="mt-1">{plan.tagline}</p>
    </div>
  );
}
