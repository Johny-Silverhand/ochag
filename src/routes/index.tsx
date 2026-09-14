import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CommercialGate } from "@/components/auth/commercial";
import { StoreHealthBanner } from "@/components/auth/store-health";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { isOnboarded } from "@/lib/data/empty";
import { useHydrated, useOps } from "@/lib/data/store";
import { BootScreen } from "@/components/layout/app-shell";
import { IosInstallCard, useIosInstall } from "@/components/ios/runtime";
import { LOGIN_INTRO, NETWORK_NAME } from "@/lib/brand";
import { canSelfOnboard } from "@/lib/billing/simulate";
import { looksLikeSeedNetwork } from "@/lib/data/bootstrap";
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
  const canCreateNetwork = canSelfOnboard(snap);
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
    <main className="login-scene max-h-[var(--app-height,100dvh)] min-h-dvh min-w-0 overflow-x-clip overflow-y-auto scroll-touch text-fg lg:max-h-none lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
      <div className="login-scene-bg" aria-hidden="true" />
      <section className="relative z-10 hidden min-w-0 flex-col justify-end overflow-hidden px-[var(--login-pad-x)] pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:flex">
        <div className="login-card max-w-md">
          <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">{NETWORK_NAME}</div>
          <h1 className="login-hero-title mt-6 max-w-md font-medium tracking-tight">
            Товароучёт и управление кафе на продажах r_keeper.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            Склад, роли, филиалы, смены, банкеты и прибыль. Новый контур — после тарифа. Выданный логин работает сразу.
          </p>
        </div>
      </section>

      <section className="relative z-10 flex min-h-dvh min-w-0 flex-col justify-start px-[var(--login-pad-x)] pt-[max(3.25rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:justify-center md:py-[max(2.25rem,env(safe-area-inset-top))]">
        <div className="login-card mx-auto w-full max-w-md pb-10">
          <div className="mb-8">
            <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">{NETWORK_NAME}</div>
            <h1 className="login-title mt-2 font-medium tracking-tight lg:hidden">Вход в контур</h1>
            <h2 className="login-title mt-2 hidden font-medium tracking-tight lg:block">Вход</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{LOGIN_INTRO}</p>
          </div>

          <StoreHealthBanner />

          {ios.apple ? (
            <div className="mb-6">
              <IosInstallCard compact />
            </div>
          ) : null}

          <CommercialGate
            onboarded={Boolean(snap.settings.paymentSimulatedAt) && !looksLikeSeedNetwork(snap)}
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
