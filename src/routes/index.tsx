import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { DEMO_ACCOUNTS } from "@/lib/data/seed";
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
  const onboard = useOps((s) => s.onboard);
  const loadSample = useOps((s) => s.loadSample);
  const setPeriod = useOps((s) => s.setPeriod);
  const snap = useOps((s) => s);
  const defaultPeriod = usePrefs((s) => s.defaultPeriod);
  const navigate = useNavigate();
  const ready = hydrated && isOnboarded(snap);
  const sample = snap.settings.sampleLoaded;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ios = useIosInstall();
  const [android, setAndroid] = useState(() => isAndroidDevice());
  const [ownerName, setOwnerName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [setupPin, setSetupPin] = useState("");

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
    const ok = nextPin
      ? await loginPin(nextEmail, nextPin)
      : await login(nextEmail, nextPassword);
    setBusy(false);
    if (!ok) {
      setError("Неверный логин, пароль или PIN");
      return;
    }
    setPeriod(defaultPeriod);
    void navigate({ to: "/dashboard" });
  }

  async function createNetwork() {
    setBusy(true);
    setError("");
    try {
      await onboard({
        ownerName,
        login: email,
        password,
        pin: setupPin,
        branchName,
        city,
        address,
      });
      setPeriod(defaultPeriod);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать сеть");
    } finally {
      setBusy(false);
    }
  }

  async function loadQaNetwork() {
    setBusy(true);
    setError("");
    try {
      await loadSample();
      setEmail("owner");
      setPassword("ochag");
      setMode("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить учебную сеть");
    } finally {
      setBusy(false);
    }
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
            Товароучёт, кипер, касса, зарплаты и банкетные листы — в одном контуре. Пустая сеть, пока вы её не создадите.
          </p>
        </div>
        <div>
          <dl className="grid max-w-lg grid-cols-3 gap-6 border-t border-sidebar-fg/10 pt-6">
            <div>
              <dt className="text-xs text-sidebar-muted">Роли</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">4</dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-muted">Модули</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">8</dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-muted">Этап</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">1</dd>
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
            <h1 className="mt-2 text-3xl font-medium tracking-tight">{ready ? "Вход в контур" : "Создать сеть"}</h1>
          </div>
          <div className="hidden lg:block">
            <div className="text-xs font-medium tracking-[0.28em] text-muted uppercase">
              {APP_NAME} · {APP_VERSION}
            </div>
            <h2 className="mt-2 text-3xl font-medium tracking-tight">{ready ? "Вход" : "Первый запуск"}</h2>
            <p className="mt-2 text-sm text-muted">
              {ready
                ? `Логин и пароль. PIN — для зала и кухни. Издатель — ${LABS_NAME}.`
                : "Создайте владельца и первый филиал. Учебную сеть можно подгрузить отдельно для приёмки."}
            </p>
          </div>

          {ios.apple ? (
            <div className="mt-6">
              <IosInstallCard compact />
            </div>
          ) : null}

          {!ready ? (
            <form
              className="mt-8 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void createNetwork();
              }}
            >
              <Field label="Ваше имя">
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" required />
              </Field>
              <Field label="Логин">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                />
              </Field>
              <Field label="Пароль">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
              </Field>
              <Field label="PIN зала (4 цифры)">
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  value={setupPin}
                  onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                />
              </Field>
              <Field label="Первый филиал">
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
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
                {busy ? "Создаём…" : "Создать сеть"}
              </Button>
              <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={() => void loadQaNetwork()}>
                Загрузить учебную сеть для приёмки
              </Button>
            </form>
          ) : (
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
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Входим…" : "Войти"}
              </Button>
            </form>
          )}

          {ready && sample ? (
            <div className="mt-8">
              <p className="mb-2 text-xs tracking-wide text-muted uppercase">Учебные роли (только после загрузки примера)</p>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={busy}
                    onClick={() => void enter(acc.email, "ochag")}
                    className="flex min-h-12 items-start justify-between rounded-xl bg-surface px-4 py-3 text-left shadow-(--shadow-border)"
                  >
                    <span>
                      <span className="block text-sm font-medium">{acc.name}</span>
                      <span className="mt-0.5 block text-xs text-muted">{acc.hint}</span>
                    </span>
                    <span className="text-xs text-subtle">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
