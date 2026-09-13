import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { DEMO_ACCOUNTS } from "@/lib/data/seed";
import { useHydrated, useOps } from "@/lib/data/store";
import { BootScreen } from "@/components/layout/app-shell";
import { LabsCredit } from "@/components/brand/labs-credit";
import { IosInstallCard, useIosInstall } from "@/components/ios/runtime";
import { APP_NAME, APP_VERSION, LABS_NAME } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/")({ ssr: false, component: LoginPage });

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function LoginPage() {
  const hydrated = useHydrated();
  const session = useOps((s) => s.session);
  const login = useOps((s) => s.login);
  const loginPin = useOps((s) => s.loginPin);
  const loginAs = useOps((s) => s.loginAs);
  const setPeriod = useOps((s) => s.setPeriod);
  const defaultPeriod = usePrefs((s) => s.defaultPeriod);
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner");
  const [password, setPassword] = useState("ochag");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"password" | "pin">("pin");
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

  async function enter(nextEmail: string, nextPassword = "ochag", nextPin?: string) {
    setBusy(true);
    setError("");
    const ok = nextPin
      ? await loginPin(nextEmail, nextPin)
      : nextPassword
        ? await login(nextEmail, nextPassword)
        : await loginAs(nextEmail);
    setBusy(false);
    if (!ok) {
      setError("Неверный логин, пароль или PIN");
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
            Товароучёт, кипер, касса, зарплаты и банкетные листы — без таблиц, которые кто-то сбивает к пятнице.
          </p>
        </div>
        <div>
          <dl className="grid max-w-lg grid-cols-3 gap-6 border-t border-sidebar-fg/10 pt-6">
            <div>
              <dt className="text-xs text-sidebar-muted">Филиалы</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">3</dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-muted">Роли</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">4</dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-muted">Модули MVP</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">8</dd>
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
            <h2 className="mt-2 text-3xl font-medium tracking-tight">Выберите роль</h2>
            <p className="mt-2 text-sm text-muted">
              JWT + PIN. Демо-пароль ochag, PIN на карточке роли. Издатель — {LABS_NAME}.
            </p>
          </div>

          {ios.apple ? (
            <div className="mt-6">
              <IosInstallCard compact />
            </div>
          ) : null}

          <div className="mt-8 grid gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={busy}
                onClick={() => void enter(acc.email, "ochag", acc.pin)}
                className="flex min-h-14 items-start justify-between rounded-xl bg-surface px-4 py-3.5 text-left shadow-(--shadow-border) transition-[box-shadow,transform] duration-150 hover:shadow-(--shadow-border-hover) active:scale-[0.99]"
              >
                <span>
                  <span className="block text-sm font-medium">{acc.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{acc.hint}</span>
                </span>
                <span className="text-xs text-subtle">PIN {acc.pin}</span>
              </button>
            ))}
          </div>

          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void (mode === "pin" ? enter(email, "", pin) : enter(email, password));
            }}
          >
            <div className="flex gap-2 text-xs">
              <button type="button" className={mode === "pin" ? "text-fg" : "text-muted"} onClick={() => setMode("pin")}>
                PIN
              </button>
              <span className="text-subtle">·</span>
              <button type="button" className={mode === "password" ? "text-fg" : "text-muted"} onClick={() => setMode("password")}>
                Пароль
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
                  android
                    ? "border-border-strong text-fg"
                    : "border-border text-muted"
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
