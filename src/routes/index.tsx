import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CommercialGate } from "@/components/auth/commercial";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { isOnboarded } from "@/lib/data/empty";
import { useHydrated, useOps } from "@/lib/data/store";
import { BootScreen } from "@/components/layout/app-shell";
import { IosInstallCard, useIosInstall } from "@/components/ios/runtime";
import { NETWORK_NAME } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/")({
  ssr: false,
  pendingComponent: BootScreen,
  component: LoginPage,
});

function LoginPage() {
  const hydrated = useHydrated();
  const session = useOps((s) => s.session);
  const login = useOps((s) => s.login);
  const loginPin = useOps((s) => s.loginPin);
  const setPeriod = useOps((s) => s.setPeriod);
  const simulatePayment = useOps((s) => s.simulatePayment);
  const onboardNetwork = useOps((s) => s.onboardNetwork);
  const snap = useOps((s) => s);
  const defaultPeriod = usePrefs((s) => s.defaultPeriod);
  const navigate = useNavigate();
  const ready = hydrated && isOnboarded(snap);
  const paidTariff = snap.settings.tariff;
  const canCreateNetwork = snap.users.length === 0 && Boolean(snap.settings.paymentSimulatedAt);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ios = useIosInstall();

  useEffect(() => {
    if (hydrated && session) void navigate({ to: "/dashboard" });
  }, [hydrated, session, navigate]);

  if (hydrated && session) return <BootScreen />;

  async function enter(nextEmail: string, nextPassword = "", nextPin?: string) {
    setBusy(true);
    setError("");
    const result = nextPin
      ? await loginPin(nextEmail, nextPin)
      : await login(nextEmail, nextPassword);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setPeriod(defaultPeriod);
    void navigate({ to: "/dashboard" });
  }

  return (
    <main className="max-h-[var(--app-height,100dvh)] min-h-dvh overflow-y-auto scroll-touch bg-bg text-fg lg:max-h-none lg:grid lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 pt-[max(3rem,env(safe-area-inset-top))] pb-12 text-sidebar-fg lg:flex">
        <div>
          <div className="text-xs font-medium tracking-[0.28em] text-sidebar-muted uppercase">{NETWORK_NAME}</div>
          <h1 className="mt-6 max-w-md text-5xl leading-tight font-medium tracking-tight">
            Товароучёт и управление кафе на продажах r_keeper.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-muted">
            Склад, роли, филиалы, смены, банкеты и прибыль. Новый контур — после тарифа. Выданный логин работает сразу.
          </p>
        </div>
        <img
          src="/marketing/hero.png"
          alt="Очаг на планшете в зале кафе"
          className="mt-8 aspect-video w-full max-w-lg rounded-3xl object-cover"
        />
      </section>

      <section className="relative flex min-h-dvh flex-col justify-center px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10">
        <div className="mx-auto w-full max-w-md pb-10">
          <div className="mb-8">
            <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">{NETWORK_NAME}</div>
            <h1 className="mt-2 text-3xl font-medium tracking-tight lg:hidden">Вход в контур</h1>
            <h2 className="mt-2 hidden text-3xl font-medium tracking-tight lg:block">Вход</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Контур склада, смен и прибыли для кафе и ресторана. Свой логин — форма ниже; если открываете сеть
              впервые, загляните в «Что это?».
            </p>
          </div>

          {ios.apple ? (
            <div className="mb-6">
              <IosInstallCard compact />
            </div>
          ) : null}

          <CommercialGate
            onboarded={ready}
            canCreateNetwork={canCreateNetwork}
            paidTariff={paidTariff}
            simulatePayment={simulatePayment}
            onboardNetwork={async (input) => {
              const result = await onboardNetwork(input);
              if (result.ok) {
                setPeriod(defaultPeriod);
                void navigate({ to: "/dashboard" });
              }
              return result;
            }}
          />

          <form
            className="mt-8 space-y-3 border-t border-border pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              void (mode === "pin" ? enter(email, "", pin) : enter(email, password));
            }}
          >
            <div className="text-xs font-medium tracking-wide text-muted uppercase">Уже есть логин</div>
            <div className="flex gap-2 text-xs">
              <button type="button" className={mode === "password" ? "text-fg" : "text-muted"} onClick={() => setMode("password")}>
                Пароль
              </button>
              <span className="text-subtle">·</span>
              <button type="button" className={mode === "pin" ? "text-fg" : "text-muted"} onClick={() => setMode("pin")}>
                PIN
              </button>
            </div>
            <Field label="Логин">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
            </Field>
            {mode === "password" ? (
              <Field label="Пароль">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  enterKeyHint="go"
                />
              </Field>
            ) : (
              <Field label="PIN">
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  autoComplete="one-time-code"
                  enterKeyHint="go"
                />
              </Field>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {!ready ? (
              <p className="text-sm text-muted">
                Нет своей учётки — её выдаёт администратор сети. Если заводите контур сами, начните с «Что это?».
              </p>
            ) : null}
            <Button type="submit" className="w-full" variant={canCreateNetwork ? "secondary" : "default"} disabled={busy}>
              {busy ? "Входим…" : "Войти"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
