import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { PAYMENT_NOTE, TARIFFS, tariffById, type TariffId, type TariffPlan } from "@/lib/billing/plans";
import { MARKETING_HERO_SRC, NETWORK_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { parseHalls } from "@/lib/domain/types";

export type OnboardInput = {
  ownerName: string;
  login: string;
  password: string;
  pin: string;
  branchName: string;
  city: string;
  address: string;
  seats?: number;
  halls?: string[];
};

export function CommercialGate({
  onboarded,
  canCreateNetwork,
  paidTariff,
  simulatePayment,
  onboardNetwork,
}: {
  onboarded: boolean;
  canCreateNetwork: boolean;
  paidTariff: TariffId | null;
  simulatePayment: (tariff: TariffId) => Promise<boolean>;
  onboardNetwork: (input: OnboardInput) => Promise<{ ok: true } | { ok: false; reason: string }>;
}) {
  const [about, setAbout] = useState(false);
  const [flow, setFlow] = useState<"plans" | "checkout" | "onboard" | null>(null);
  const [picked, setPicked] = useState<TariffId>(paidTariff ?? "trial");

  useEffect(() => {
    if (paidTariff) setPicked(paidTariff);
  }, [paidTariff]);

  const flowOpen = flow !== null;
  const flowTitle =
    flow === "checkout" ? "Оплата тарифа" : flow === "onboard" ? "Создать сеть" : `Тарифы ${NETWORK_NAME}`;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="w-full" onClick={() => setAbout(true)}>
          Что это?
        </Button>
        {!onboarded ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setFlow("plans")}
          >
            Выбрать тариф
          </Button>
        ) : null}
      </div>
      {canCreateNetwork ? (
        <Button type="button" className="w-full" onClick={() => setFlow("onboard")}>
          Создать сеть
        </Button>
      ) : null}
      {canCreateNetwork && paidTariff ? (
        <p className="text-xs text-muted">
          Тариф «{tariffById(paidTariff).name}» зафиксирован. Осталось создать сеть.
        </p>
      ) : null}

      <Dialog open={about} onOpenChange={setAbout}>
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
            Учётку после оплаты создаёте сами. Уже выданный логин — форма входа ниже, без повторной регистрации.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={flowOpen} onOpenChange={(open) => { if (!open) setFlow(null); }}>
        <DialogContent
          title={flowTitle}
          className={cn("bg-elevated", flow === "plans" ? "max-w-3xl" : "max-w-lg")}
        >
          {flow === "plans" ? (
            <PlansStep
              selected={picked}
              onSelect={setPicked}
              onCheckout={() => setFlow("checkout")}
            />
          ) : null}
          {flow === "checkout" ? (
            <CheckoutStep
              plan={tariffById(picked)}
              onBack={() => setFlow("plans")}
              onPay={async () => {
                const ok = await simulatePayment(picked);
                if (!ok) return;
                toast.success("Оплата зафиксирована. Создайте сеть.");
                setFlow("onboard");
              }}
            />
          ) : null}
          {flow === "onboard" ? (
            <OnboardStep
              submit={onboardNetwork}
              onBack={() => setFlow(canCreateNetwork ? null : "plans")}
              onDone={() => setFlow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlansStep({
  selected,
  onSelect,
  onCheckout,
}: {
  selected: TariffId;
  onSelect: (id: TariffId) => void;
  onCheckout: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Четыре тарифа для сети. После оплаты создадите владельца и первый филиал.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TARIFFS.map((plan) => (
          <TariffCard
            key={plan.id}
            plan={plan}
            selected={selected === plan.id}
            onSelect={() => onSelect(plan.id)}
          />
        ))}
      </div>
      <div className="sticky bottom-0 z-10 -mx-5 mt-4 bg-inherit px-5 pt-3 max-md:-mx-[var(--page-pad-x)] max-md:px-[var(--page-pad-x)]">
        <Button type="button" className="w-full" onClick={onCheckout}>
          Перейти к оплате · {tariffById(selected).name}
        </Button>
      </div>
    </div>
  );
}

function TariffCard({
  plan,
  selected,
  onSelect,
}: {
  plan: TariffPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "min-w-0 rounded-2xl bg-surface p-3 text-left shadow-(--shadow-border) transition-[box-shadow,transform] duration-200 ease-[var(--ease-out-smooth)]",
        selected ? "ring-2 ring-ring/40" : "hover:shadow-(--shadow-border-hover)",
      )}
    >
      <img src={plan.image} alt="" className="mb-3 aspect-video w-full rounded-xl object-cover" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium tracking-tight">{plan.name}</div>
          <p className="mt-0.5 text-xs text-muted">{plan.tagline}</p>
        </div>
        {plan.ai ? <Badge tone="primary">ИИ</Badge> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-lg tabular-nums">{plan.price}</span>
        <span className="text-xs text-muted">{plan.period}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted">
        {plan.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </button>
  );
}

function CheckoutStep({
  plan,
  onBack,
  onPay,
}: {
  plan: TariffPlan;
  onBack: () => void;
  onPay: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [holder, setHolder] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  return (
    <div className="form-narrow">
      <p className="mb-3 text-xs leading-snug text-muted">{PAYMENT_NOTE}</p>
      <div className="mb-4 flex gap-3 rounded-2xl bg-bg p-3">
        <img src={plan.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
        <div>
          <div className="text-sm font-medium">{plan.name}</div>
          <div className="mt-0.5 font-mono text-sm tabular-nums">
            {plan.price} · {plan.period}
          </div>
        </div>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void onPay().finally(() => setBusy(false));
        }}
      >
        <Field label="Плательщик">
          <Input value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="cc-name" placeholder="ООО «Ромашка»" />
        </Field>
        <Field label="Номер карты">
          <Input value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" autoComplete="cc-number" placeholder="•••• •••• •••• ••••" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Действует до">
            <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} autoComplete="cc-exp" placeholder="ММ/ГГ" />
          </Field>
          <Field label="CVC">
            <Input value={cvc} onChange={(e) => setCvc(e.target.value)} autoComplete="cc-csc" placeholder="•••" />
          </Field>
        </div>
        <p className="text-xs text-muted">
          Нажмите «Оплатить», чтобы подтвердить тариф. Карта на сервер не уходит.
        </p>
        <div className="flex min-w-0 gap-2">
          <Button type="button" variant="outline" className="min-w-0 flex-1" onClick={onBack} disabled={busy}>
            Назад
          </Button>
          <Button type="submit" className="min-w-0 flex-1" disabled={busy}>
            {busy ? "Проводим…" : "Оплатить"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function OnboardStep({
  submit,
  onBack,
  onDone,
}: {
  submit: (input: OnboardInput) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onBack: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [branchName, setBranchName] = useState("Филиал 1");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [seats, setSeats] = useState("40");
  const [halls, setHalls] = useState("Основной зал");

  return (
    <div className="form-narrow">
      <p className="mb-4 text-sm text-muted">
        Владелец, первый филиал, залы и места. Пароль — от 4 знаков, PIN — 4 цифры для зала.
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
            branchName,
            city,
            address,
            seats: Number(seats) || 40,
            halls: parseHalls(halls),
          }).then((result) => {
            setBusy(false);
            if (!result.ok) {
              setError(result.reason);
              return;
            }
            toast.success("Сеть создана. Вы вошли как владелец.");
            onDone();
          });
        }}
      >
        <Field label="Имя владельца">
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" />
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex min-w-0 gap-2">
          <Button type="button" variant="outline" className="min-w-0 flex-1" onClick={onBack} disabled={busy}>
            Назад
          </Button>
          <Button type="submit" className="min-w-0 flex-1" disabled={busy}>
            {busy ? "Создаём…" : "Создать и войти"}
          </Button>
        </div>
      </form>
    </div>
  );
}
