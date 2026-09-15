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
import { LabsCredit } from "@/components/brand/labs-credit";
import { LOGIN_INTRO, NETWORK_NAME } from "@/lib/brand";
import { canSubmitNetworkApplication } from "@/lib/billing/simulate";
import { usePrefs } from "@/lib/prefs";
import { canEnterWithPin, queuePinOffer } from "@/lib/auth/pin-gate";

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
  const onboardNetwork = useOps((s) => s.onboardNetwork);
  const snap = useOps((s) => s);
  const defaultPeriod = usePrefs((s) => s.defaultPeriod);
  const navigate = useNavigate();
  const ready = hydrated && isOnboarded(snap);
  const canSubmit = canSubmitNetworkApplication(snap);
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
    if (!nextPin) queuePinOffer(nextEmail);
    setPeriod(defaultPeriod);
    void navigate({ to: "/dashboard" });
  }

  return (
    <main className="login-scene min-h-dvh min-w-0 overflow-x-clip text-fg lg:grid lg:h-dvh lg:max-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] lg:overflow-hidden">
      <div className="login-scene-bg" aria-hidden="true" />
      <section className="relative z-10 hidden min-h-0 min-w-0 flex-col justify-center overflow-hidden px-[var(--login-pad-x)] py-[max(2rem,env(safe-area-inset-top))] lg:flex">
        <div className="login-card max-w-md">
          <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">{NETWORK_NAME}</div>
          <h1 className="login-hero-title mt-6 max-w-md font-medium tracking-tight">
            Товароучёт и управление кафе на продажах r_keeper.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            Склад, роли, филиалы, смены, банкеты и прибыль. Новый контур — по заявке. Выданный логин работает сразу.
          </p>
        </div>
      </section>

      <section className="relative z-10 flex min-h-dvh min-w-0 flex-col justify-center overflow-y-auto px-[var(--login-pad-x)] py-[max(1.5rem,env(safe-area-inset-top))] lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:py-8">
        <div className="login-card mx-auto w-full max-w-md lg:max-h-[calc(100dvh-4.5rem)] lg:overflow-y-auto">
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
            canSubmit={canSubmit}
            submitApplication={async (input) => onboardNetwork(input)}
          />

          <form
            className="mt-8 space-y-3 border-t border-border pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              const usePin = mode === "pin" && canEnterWithPin(email);
              void (usePin ? enter(email, "", pin) : enter(email, password));
            }}
          >
            <div className="text-xs font-medium tracking-wide text-muted uppercase">Уже есть логин</div>
            {canEnterWithPin(email) ? (
              <div className="flex gap-2 text-xs">
                <button type="button" className={mode === "password" ? "text-fg" : "text-muted"} onClick={() => setMode("password")}>
                  Пароль
                </button>
                <span className="text-subtle">·</span>
                <button type="button" className={mode === "pin" ? "text-fg" : "text-muted"} onClick={() => setMode("pin")}>
                  PIN
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted">Первый вход — логин и пароль. PIN появится после согласия на этом устройстве.</p>
            )}
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
            {mode === "pin" && canEnterWithPin(email) ? (
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
            ) : (
              <Field label="Пароль">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  enterKeyHint="go"
                />
              </Field>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {!ready ? (
              <p className="text-sm text-muted">
                Нет своей учётки — её выдаёт администратор сети. Если открываете контур впервые, начните с «Что такое RestoPro?».
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Входим…" : "Войти"}
            </Button>
          </form>
        </div>
        <LabsCredit
          compact
          align="center"
          className="mx-auto mt-4 w-full max-w-md pb-[env(safe-area-inset-bottom)] lg:absolute lg:inset-x-0 lg:bottom-3 lg:mt-0 lg:pb-0"
        />
      </section>
    </main>
  );
}
