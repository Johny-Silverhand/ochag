import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { isOnboarded } from "@/lib/data/empty";
import { useHydrated, useOps } from "@/lib/data/store";
import { BootScreen } from "@/components/layout/app-shell";
import { LabsCredit } from "@/components/brand/labs-credit";
import { IosInstallCard, useIosInstall } from "@/components/ios/runtime";
import { APP_NAME, APP_VERSION, LABS_NAME } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/")({
  ssr: false,
  pendingComponent: BootScreen,
  component: LoginPage,
});

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function LoginPage() {
  const hydrated = useHydrated();
  const session = useOps((s) => s.session);
  const login = useOps((s) => s.login);
  const loginPin = useOps((s) => s.loginPin);
  const setPeriod = useOps((s) => s.setPeriod);
  const snap = useOps((s) => s);
  const defaultPeriod = usePrefs((s) => s.defaultPeriod);
  const navigate = useNavigate();
  const ready = hydrated && isOnboarded(snap);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ios = useIosInstall();
  const [android, setAndroid] = useState(() => isAndroidDevice());

  useEffect(() => {
    setAndroid(isAndroidDevice());
  }, []);

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

  const showDesktopDownloads = !ios.apple;

  return (
    <main className="max-h-[var(--app-height,100dvh)] min-h-dvh overflow-y-auto scroll-touch bg-bg text-fg lg:max-h-none lg:grid lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 pt-[max(3rem,env(safe-area-inset-top))] pb-12 text-sidebar-fg lg:flex">
        <div>
          <div className="text-xs font-medium tracking-[0.28em] text-sidebar-muted uppercase">{APP_NAME}</div>
          <h1 className="mt-6 max-w-md text-5xl leading-tight font-medium tracking-tight">
            Контур смены, склада и прибыли. Без таблиц, которые сбивают к пятнице.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-muted">
            Товароучёт, кипер, касса, зарплаты и банкетные листы — в одном контуре. Вход по логину, который выдаёт администратор.
          </p>
        </div>
        <div>
          <dl className="grid max-w-lg grid-cols-3 gap-6 border-t border-sidebar-fg/10 pt-6">
            <div>
              <dt className="text-xs text-sidebar-muted">Роли</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">5</dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-muted">Модули</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">8</dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-muted">Этап</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">3</dd>
            </div>
          </dl>
          <LabsCredit tone="sidebar" align="left" className="mt-8" />
        </div>
      </section>

      <section className="relative flex min-h-dvh flex-col justify-center px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10">
        {showDesktopDownloads ? (
          <a
            href="/win-setup/index.html"
            className="absolute top-5 right-5 text-[11px] tracking-[0.16em] text-muted uppercase hover:text-fg sm:top-8 sm:right-10"
          >
            Windows Setup
          </a>
        ) : null}
        <div className="mx-auto w-full max-w-md pb-16">
          <div className="mb-8 lg:hidden">
            <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">{APP_NAME}</div>
            <h1 className="mt-2 text-3xl font-medium tracking-tight">Вход в контур</h1>
          </div>
          <div className="hidden lg:block">
            <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">
              {APP_NAME} · {APP_VERSION}
            </div>
            <h2 className="mt-2 text-3xl font-medium tracking-tight">Вход</h2>
            <p className="mt-2 text-sm text-muted">
              Логин и пароль. PIN — для зала и кухни. Издатель — {LABS_NAME}.
            </p>
          </div>

          {ios.apple ? (
            <div className="mt-6">
              <IosInstallCard compact />
            </div>
          ) : null}

          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void (mode === "pin" ? enter(email, "", pin) : enter(email, password));
            }}
          >
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
              <p className="text-sm text-muted">Нет учётки? Обратитесь к администратору.</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Входим…" : "Войти"}
            </Button>
          </form>

          {showDesktopDownloads ? (
            <div className="mt-4 grid gap-2">
              <a
                href="/downloads/test-v1.0-Setup.exe"
                download
                className="flex h-11 items-center justify-center border border-border text-sm text-muted transition-colors hover:border-border-strong hover:text-fg"
              >
                Скачать test v1.0 Setup.exe
              </a>
              <a
                href="/downloads/test-v1.0.apk"
                download
                className={`flex h-11 items-center justify-center border text-sm transition-colors hover:border-border-strong hover:text-fg ${
                  android ? "border-border-strong text-fg" : "border-border text-muted"
                }`}
              >
                Скачать APK
              </a>
            </div>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] px-5 sm:px-10">
          <LabsCredit />
        </div>
      </section>
    </main>
  );
}
