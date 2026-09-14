import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { PAYMENT_SIM_BADGE, TARIFFS, tariffById, type TariffId, type TariffPlan } from "@/lib/billing/plans";
import { NETWORK_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type OnboardInput = {
  ownerName: string;
  login: string;
  password: string;
  pin: string;
  branchName: string;
  city: string;
  address: string;
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

  const flowOpen = flow !== null;
  const flowTitle =
    flow === "checkout" ? "Оплата тарифа" : flow === "onboard" ? "Создать сеть" : "Тарифы Очаг";

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
            onClick={() => setFlow(canCreateNetwork ? "onboard" : "plans")}
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
      {paidTariff && !onboarded ? (
        <p className="text-xs text-muted">
          Тариф «{tariffById(paidTariff).name}» зафиксирован. Осталось создать сеть.
        </p>
      ) : null}

      <Dialog open={about} onOpenChange={setAbout}>
        <DialogContent title={`Что такое ${NETWORK_NAME}`} className="max-h-[min(90dvh,44rem)] max-w-2xl overflow-y-auto bg-elevated">
          <img
            src="/marketing/hero.png"
            alt="Планшет с контуром Очаг на фоне кафе"
            className="mb-4 aspect-video w-full rounded-lg object-cover"
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

      <Dialog open={flowOpen} onOpenChange={(open) => setFlow(open ? flow ?? "plans" : null)}>
        <DialogContent title={flowTitle} className="max-h-[min(92dvh,48rem)] max-w-3xl overflow-y-auto bg-elevated">
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
        Цены-заглушки. Оплата на этом экране — симуляция: боевой эквайринг подключит другой разработчик.
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
      <Button type="button" className="mt-4 w-full" onClick={onCheckout}>
        Перейти к оплате · {tariffById(selected).name}
      </Button>
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
        "rounded-xl bg-surface p-3 text-left shadow-(--shadow-border) transition-[box-shadow,transform] duration-150",
        selected ? "ring-2 ring-ring/40" : "hover:shadow-(--shadow-border-hover)",
      )}
    >
      <img src={plan.image} alt="" className="mb-3 aspect-video w-full rounded-md object-cover" />
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
  const [holder, setHolder] = useState("ООО Ромашка");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("000");

  return (
    <div>
      <Badge tone="warning" className="mb-3 whitespace-normal text-left leading-snug">
        {PAYMENT_SIM_BADGE}
      </Badge>
      <div className="mb-4 flex gap-3 rounded-lg bg-bg p-3">
        <img src={plan.image} alt="" className="size-16 shrink-0 rounded-md object-cover" />
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
          <Input value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="cc-name" />
        </Field>
        <Field label="Номер карты (не уходит на сервер)">
          <Input value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" autoComplete="cc-number" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Срок">
            <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} autoComplete="cc-exp" />
          </Field>
          <Field label="CVC">
            <Input value={cvc} onChange={(e) => setCvc(e.target.value)} autoComplete="cc-csc" />
          </Field>
        </div>
        <p className="text-xs text-muted">
          Нажмите «Оплатить» — симуляция всегда проходит, карта никуда не отправляется.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={busy}>
            Назад
          </Button>
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy ? "Проводим…" : "Оплатить"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function OnboardStep({
  submit,
  onDone,
}: {
  submit: (input: OnboardInput) => Promise<{ ok: true } | { ok: false; reason: string }>;
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

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Владелец сети, первый филиал и вход. Пароль — от 4 знаков, PIN — 4 цифры для зала.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void submit({ ownerName, login, password, pin, branchName, city, address }).then((result) => {
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Город">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Адрес">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Создаём…" : "Создать и войти"}
        </Button>
      </form>
    </div>
  );
}
