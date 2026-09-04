import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Bell,
  ChefHat,
  Info,
  LogOut,
  Palette,
  Shield,
  Smartphone,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page";
import { LabsCredit, LabsMark } from "@/components/brand/labs-credit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { IosInstallCard, useIosInstall } from "@/components/ios/runtime";
import { downloadWebClip } from "@/lib/ios-profile";
import { APP_NAME, APP_VERSION, LABS_NAME, LABS_YEAR, SETUP_EXE } from "@/lib/brand";
import { useActiveBranch, useOps, useSessionUser } from "@/lib/data/store";
import { ROLE_LABEL, WRITEOFF_LABEL, type Period, type Role, type WriteoffReason } from "@/lib/domain/types";
import { usePrefs } from "@/lib/prefs";
import { applyThemeChrome, THEMES, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { canResetDemo } from "@/lib/domain/permissions";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

type SectionId = "appearance" | "profile" | "alerts" | "role" | "workspace" | "iphone" | "about";

function sectionsFor(role: Role): { id: SectionId; label: string; icon: typeof Palette }[] {
  const items: { id: SectionId; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: "Внешний вид", icon: Palette },
    { id: "profile", label: "Профиль", icon: UserRound },
    { id: "alerts", label: "Сигналы", icon: Bell },
  ];
  if (role === "cook") items.push({ id: "role", label: "Кухня", icon: ChefHat });
  if (role === "waiter") items.push({ id: "role", label: "Зал", icon: UtensilsCrossed });
  if (role === "owner" || role === "manager") items.push({ id: "workspace", label: "Сеть", icon: Shield });
  items.push({ id: "iphone", label: "iPhone", icon: Smartphone });
  items.push({ id: "about", label: "О программе", icon: Info });
  return items;
}

function SettingsPage() {
  const user = useSessionUser()!;
  const role = user.role;
  const nav = sectionsFor(role);
  const [section, setSection] = useState<SectionId>("appearance");

  return (
    <div>
      <PageHeader
        eyebrow="Контур"
        title="Настройки"
        description="Тема, профиль и сигналы — у каждой роли. Дальше страница сужается под вашу смену."
      />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {nav.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-sm px-3 text-sm transition-colors duration-150",
                  active ? "bg-surface text-fg shadow-(--shadow-border)" : "text-muted hover:bg-surface/70 hover:text-fg",
                )}
              >
                <item.icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="min-w-0">
          {section === "appearance" ? <AppearancePanel /> : null}
          {section === "profile" ? <ProfilePanel /> : null}
          {section === "alerts" ? <AlertsPanel role={role} /> : null}
          {section === "role" && role === "cook" ? <KitchenPanel /> : null}
          {section === "role" && role === "waiter" ? <ServicePanel /> : null}
          {section === "workspace" ? <WorkspacePanel role={role} /> : null}
          {section === "iphone" ? <IphonePanel /> : null}
          {section === "about" ? <AboutPanel /> : null}
        </div>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const density = usePrefs((s) => s.density);
  const setDensity = usePrefs((s) => s.setDensity);
  const motion = usePrefs((s) => s.motion);
  const setMotion = usePrefs((s) => s.setMotion);
  const typeScale = usePrefs((s) => s.typeScale);
  const setTypeScale = usePrefs((s) => s.setTypeScale);
  const light = THEMES.filter((t) => t.group === "light");
  const dark = THEMES.filter((t) => t.group === "dark");

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-medium tracking-tight">Цветовая тема</h2>
          <p className="mt-1 text-sm text-muted">Семь палитр под зал, ночную смену и отчёты. Меняется сразу на всём контуре.</p>
        </div>
        <ThemeGroup title="Светлые" items={light} active={theme} onSelect={setTheme} />
        <ThemeGroup title="Тёмные" items={dark} active={theme} onSelect={setTheme} className="mt-5" />
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Плотность и чтение</h2>
        <div className="mt-3 divide-y divide-border">
          <PrefRow title="Компактный вид" hint="Меньше воздуха в карточках — удобно на планшете у кассы.">
            <Switch checked={density === "compact"} onCheckedChange={(v) => setDensity(v ? "compact" : "comfortable")} />
          </PrefRow>
          <PrefRow title="Крупный шрифт" hint="Для зала при плохом свете и для кухни с планшета на стене.">
            <Switch checked={typeScale === "large"} onCheckedChange={(v) => setTypeScale(v ? "large" : "normal")} />
          </PrefRow>
          <PrefRow title="Меньше анимации" hint="Отключает появление блоков, если мешает на слабом устройстве.">
            <Switch checked={motion === "reduce"} onCheckedChange={(v) => setMotion(v ? "reduce" : "system")} />
          </PrefRow>
        </div>
      </Card>
    </div>
  );
}

function ThemeGroup({
  title,
  items,
  active,
  onSelect,
  className,
}: {
  title: string;
  items: typeof THEMES;
  active: ThemeId;
  onSelect: (id: ThemeId) => void;
  className?: string;
}) {
  const density = usePrefs((s) => s.density);
  const motion = usePrefs((s) => s.motion);
  const typeScale = usePrefs((s) => s.typeScale);

  return (
    <div className={className}>
      <div className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">{title}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <ThemeSwatch
            key={item.id}
            id={item.id}
            label={item.label}
            hint={item.hint}
            bg={item.preview.bg}
            sidebar={item.preview.sidebar}
            primary={item.preview.primary}
            surface={item.preview.surface}
            active={active === item.id}
            onSelect={() => {
              applyThemeChrome(item.id, density, motion, typeScale);
              onSelect(item.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeSwatch({
  label,
  hint,
  bg,
  sidebar,
  primary,
  surface,
  active,
  onSelect,
}: {
  id: ThemeId;
  label: string;
  hint: string;
  bg: string;
  sidebar: string;
  primary: string;
  surface: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={() => onSelect()}
      onClick={onSelect}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "rounded-xl p-2 text-left transition-[box-shadow,transform] duration-150 ease-[var(--ease-out-smooth)] active:scale-[0.99]",
        active ? "shadow-(--shadow-border-hover) ring-2 ring-ring/50" : "shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)",
      )}
    >
      <div className="overflow-hidden rounded-md" style={{ background: bg }}>
        <div className="flex h-16">
          <div className="w-7" style={{ background: sidebar }} />
          <div className="flex flex-1 flex-col gap-1.5 p-2">
            <div className="h-6 rounded-sm shadow-(--shadow-border)" style={{ background: surface }} />
            <div className="flex gap-1">
              <span className="h-2 w-8 rounded-full" style={{ background: primary }} />
              <span className="h-2 w-5 rounded-full opacity-40" style={{ background: sidebar }} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          {active ? (
            <Badge tone="primary" className="px-1.5 py-0 text-[10px]">
              сейчас
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</p>
      </div>
    </button>
  );
}

function ProfilePanel() {
  const user = useSessionUser()!;
  const session = useOps((s) => s.session);
  const branch = useActiveBranch();
  const updateProfile = useOps((s) => s.updateProfile);
  const logout = useOps((s) => s.logout);
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");

  const dirty = name !== user.name || phone !== user.phone;

  function saveProfile() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Укажите имя");
      return;
    }
    updateProfile({ name: trimmed, phone: phone.trim() });
    toast.success("Профиль сохранён");
  }

  function savePassword() {
    if (current !== user.password) {
      toast.error("Текущий пароль не совпал");
      return;
    }
    if (next.length < 4) {
      toast.error("Новый пароль — минимум 4 символа");
      return;
    }
    if (next !== again) {
      toast.error("Подтверждение не совпало");
      return;
    }
    updateProfile({ password: next });
    setCurrent("");
    setNext("");
    setAgain("");
    toast.success("Пароль обновлён");
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Учётная запись</h2>
        <p className="mt-1 text-sm text-muted">
          {ROLE_LABEL[user.role]} · {user.position}
          {session?.branchId && session.branchId !== "all" && branch ? ` · ${branch.short}` : user.role === "owner" ? " · вся сеть" : ""}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Имя">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Телефон">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </Field>
          <Field label="Логин">
            <Input value={user.email} readOnly />
          </Field>
          <Field label="Роль">
            <Input value={ROLE_LABEL[user.role]} readOnly />
          </Field>
        </div>
        <div className="mt-4">
          <Button type="button" disabled={!dirty} onClick={saveProfile}>
            Сохранить
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Пароль</h2>
        <p className="mt-1 text-sm text-muted">Пароль пишется в базу сети. Для стартовых учёток — ochag.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Текущий">
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="Новый">
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Ещё раз">
            <Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={savePassword}>
            Сменить пароль
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Сессия</h2>
        <p className="mt-1 text-sm text-muted">Выход возвращает на экран входа. Операции остаются в базе.</p>
        <div className="mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              logout();
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" />
            Выйти
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AlertsPanel({ role }: { role: Role }) {
  const prefs = usePrefs();
  const showStock = role !== "waiter";
  const showPayroll = role === "owner" || role === "manager";
  const showWriteoff = role !== "waiter";

  return (
    <Card>
      <h2 className="text-sm font-medium tracking-tight">Что приходит в контур</h2>
      <p className="mt-1 text-sm text-muted">Сигналы на обзоре и в тостах. На этом срезе они живут в устройстве, без сервера.</p>
      <div className="mt-3 divide-y divide-border">
        {showStock ? (
          <PrefRow title="Остатки ниже минимума" hint="Когда мясо, соусы или хлеб уходят за красную черту.">
            <Switch checked={prefs.notifyStock} onCheckedChange={(v) => prefs.setNotify("notifyStock", v)} />
          </PrefRow>
        ) : null}
        <PrefRow title="Смена" hint="Открытие, закрытие и расхождение кассы.">
          <Switch checked={prefs.notifyShift} onCheckedChange={(v) => prefs.setNotify("notifyShift", v)} />
        </PrefRow>
        <PrefRow title="Банкеты" hint="Подтверждение, залог и листы на кухню/зал.">
          <Switch checked={prefs.notifyBanquet} onCheckedChange={(v) => prefs.setNotify("notifyBanquet", v)} />
        </PrefRow>
        {showWriteoff ? (
          <PrefRow title="Списания" hint="Порча, питание персонала и недостача.">
            <Switch checked={prefs.notifyWriteoff} onCheckedChange={(v) => prefs.setNotify("notifyWriteoff", v)} />
          </PrefRow>
        ) : null}
        {showPayroll ? (
          <PrefRow title="Начисления ФОТ" hint="После закрытия кассы — ставка и процент официанта.">
            <Switch checked={prefs.notifyPayroll} onCheckedChange={(v) => prefs.setNotify("notifyPayroll", v)} />
          </PrefRow>
        ) : null}
        <PrefRow title="Звук" hint="Короткий сигнал на событие. По умолчанию выключен в зале.">
          <Switch checked={prefs.notifySound} onCheckedChange={(v) => prefs.setNotify("notifySound", v)} />
        </PrefRow>
      </div>
    </Card>
  );
}

function KitchenPanel() {
  const pin = usePrefs((s) => s.kitchenPinLowStock);
  const setPin = usePrefs((s) => s.setKitchenPinLowStock);
  const showCost = usePrefs((s) => s.showFoodCost);
  const setShowCost = usePrefs((s) => s.setShowFoodCost);
  const reason = usePrefs((s) => s.defaultWriteoffReason);
  const setReason = usePrefs((s) => s.setDefaultWriteoffReason);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Кухня</h2>
        <p className="mt-1 text-sm text-muted">Как шеф и шашлычник видят склад и техкарты.</p>
        <div className="mt-3 divide-y divide-border">
          <PrefRow title="Держать дефицит сверху" hint="Позиции ниже минимума не прячутся за выручкой.">
            <Switch checked={pin} onCheckedChange={setPin} />
          </PrefRow>
          <PrefRow title="Себестоимость в техкартах" hint="Фудкост блюда. Можно скрыть, если на планшете работает стажёр.">
            <Switch checked={showCost} onCheckedChange={setShowCost} />
          </PrefRow>
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Списание по умолчанию</h2>
        <p className="mt-1 text-sm text-muted">Причина, которая сразу стоит в форме списания.</p>
        <div className="mt-4 max-w-xs">
          <NativeSelect value={reason} onChange={(e) => setReason(e.target.value as WriteoffReason)}>
            {Object.entries(WRITEOFF_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Card>
    </div>
  );
}

function ServicePanel() {
  const own = usePrefs((s) => s.waiterOwnSalesOnly);
  const setOwn = usePrefs((s) => s.setWaiterOwnSalesOnly);
  const typeScale = usePrefs((s) => s.typeScale);
  const setTypeScale = usePrefs((s) => s.setTypeScale);

  return (
    <Card>
      <h2 className="text-sm font-medium tracking-tight">Зал</h2>
      <p className="mt-1 text-sm text-muted">Чеки официанта и размер шрифта на планшете у кассы.</p>
      <div className="mt-3 divide-y divide-border">
        <PrefRow title="Только мои продажи" hint="На экране продаж остаются чеки, закрытые вашей рукой.">
          <Switch checked={own} onCheckedChange={setOwn} />
        </PrefRow>
        <PrefRow title="Крупный шрифт в зале" hint="То же, что в «Внешний вид» — здесь дубль для быстрой смены.">
          <Switch checked={typeScale === "large"} onCheckedChange={(v) => setTypeScale(v ? "large" : "normal")} />
        </PrefRow>
      </div>
    </Card>
  );
}

function WorkspacePanel({ role }: { role: Role }) {
  const branches = useOps((s) => s.branches);
  const users = useOps((s) => s.users);
  const resetDemo = useOps((s) => s.resetDemo);
  const snap = useOps((s) => s);
  const period = usePrefs((s) => s.defaultPeriod);
  const setDefaultPeriod = usePrefs((s) => s.setDefaultPeriod);
  const setPeriod = useOps((s) => s.setPeriod);
  const requireNote = usePrefs((s) => s.requireWriteoffNote);
  const setRequireNote = usePrefs((s) => s.setRequireWriteoffNote);
  const showAdvisor = usePrefs((s) => s.showAdvisor);
  const setShowAdvisor = usePrefs((s) => s.setShowAdvisor);
  const [confirmReset, setConfirmReset] = useState(false);

  const staffCount = users.filter((u) => u.role !== "owner").length;

  function applyPeriod(next: Period) {
    setDefaultPeriod(next);
    setPeriod(next);
    toast.success("Период обзора обновлён");
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: APP_NAME,
      version: APP_VERSION,
      studio: LABS_NAME,
      branches: snap.branches,
      users: snap.users.map(({ password: _p, ...u }) => u),
      products: snap.products,
      recipes: snap.recipes,
      stock: snap.stock,
      movements: snap.movements,
      invoices: snap.invoices,
      sales: snap.sales,
      shifts: snap.shifts,
      requests: snap.requests,
      banquets: snap.banquets,
      expenses: snap.expenses,
      payroll: snap.payroll,
      revisions: snap.revisions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ochag-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Снимок выгружен");
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Филиалы</h2>
        <p className="mt-1 text-sm text-muted">
          {staffCount} сотрудников · {branches.length} точки
        </p>
        <ul className="mt-4 divide-y divide-border">
          {branches.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">{b.name}</div>
                <div className="text-xs text-muted">
                  {b.address} · {b.seats} мест
                </div>
              </div>
              <span className="font-mono text-xs text-subtle tabular-nums">{b.phone}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Обзор и склад</h2>
        <p className="mt-1 text-sm text-muted">Период дашборда и правила списаний для управляющих.</p>
        <div className="mt-4 max-w-xs">
          <Field label="Период по умолчанию">
            <NativeSelect value={period} onChange={(e) => applyPeriod(e.target.value as Period)}>
              <option value="today">Сегодня</option>
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
            </NativeSelect>
          </Field>
        </div>
        <div className="mt-2 divide-y divide-border">
          <PrefRow title="Комментарий к списанию обязателен" hint="Повар не проведёт порчу без короткой причины.">
            <Switch checked={requireNote} onCheckedChange={setRequireNote} />
          </PrefRow>
          {role === "owner" ? (
            <PrefRow title="Сигналы контура на обзоре" hint="Аномалии списаний, фудкост и касса на обзоре владельца.">
              <Switch checked={showAdvisor} onCheckedChange={setShowAdvisor} />
            </PrefRow>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Данные</h2>
        <p className="mt-1 text-sm text-muted">Выгрузка без паролей. Восстановление возвращает сеть «Очаг» к срезу 2 сентября 2026 и записывает его в базу.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={exportJson}>
            Выгрузить JSON
          </Button>
          {canResetDemo(role) ? (
            <Button type="button" variant="danger" onClick={() => setConfirmReset(true)}>
              Восстановить срез
            </Button>
          ) : null}
        </div>
      </Card>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent title="Восстановить стартовый срез?">
          <p className="text-sm text-muted">Чеки, списания и банкеты, которые вы внесли, заменятся исходным срезом сети. Тема на этом устройстве останется.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                void resetDemo().then(() => {
                  setConfirmReset(false);
                  toast.success("Срез восстановлен");
                });
              }}
            >
              Сбросить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IphonePanel() {
  return (
    <div className="space-y-4">
      <IosInstallCard forceGuide />
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Профиль на Домой</h2>
        <p className="mt-1 text-sm text-muted">
          iPhone ставит иконку сам, без App Store. Откройте файл в Safari и подтвердите установку профиля.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            void downloadWebClip().then(() => toast.success("Файл профиля скачан"));
          }}
        >
          Скачать Ochag.mobileconfig
        </Button>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Файл .ipa</h2>
        <p className="mt-1 text-sm text-muted">
          iPhone принимает .ipa только с подписью Apple Developer. Без сертификата пакет выглядит как приложение, но
          система его не пустит — это ограничение Apple, не контура.
        </p>
        <p className="mt-2 text-sm text-muted">
          Нативная оболочка Xcode уже собрана: тот же контур внутри WKWebView, bundle{" "}
          <span className="font-mono text-xs">labs.victimok.ochag</span>. Из неё архивируется настоящий .ipa, когда
          появится команда разработчика.
        </p>
        <a
          href="/downloads/Ochag-iOS-Xcode.zip"
          download
          className="mt-4 inline-flex h-11 items-center rounded-sm bg-primary px-4 text-sm text-primary-fg"
        >
          Скачать проект Xcode
        </a>
      </Card>
      <Card>
        <h2 className="text-sm font-medium tracking-tight">Как удобнее на смене</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>Горизонтальный iPad — боковое меню, как на компьютере.</li>
          <li>iPhone — нижние вкладки под большой палец, вырез не перекрывает шапку.</li>
          <li>Клавиатура на чеке прячет панель вкладок, чтобы сумма не уезжала.</li>
          <li>Печать банкетных листов — через «Поделиться» → Принтер.</li>
        </ul>
      </Card>
    </div>
  );
}

function AboutPanel() {
  const user = useSessionUser()!;
  const year = LABS_YEAR;
  const ios = useIosInstall();
  const modules = useMemo(() => {
    if (user.role === "owner") return "10 модулей, вся сеть";
    if (user.role === "manager") return "филиал, касса, склад, банкеты";
    if (user.role === "cook") return "склад, техкарты, банкетные листы";
    return "касса, смена, банкеты зала";
  }, [user.role]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <LabsMark className="size-11 text-primary" />
          <div>
            <div className="text-xs tracking-[0.22em] text-muted uppercase">{APP_NAME}</div>
            <h2 className="mt-1 text-lg font-medium tracking-tight">Операционный контур общепита</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Версия {APP_VERSION}. Ваш доступ: {ROLE_LABEL[user.role]} — {modules}.
            </p>
            {ios.apple ? (
              <p className="mt-4 text-sm text-muted">Установка на iPhone — в разделе «iPhone» слева. App Store не нужен.</p>
            ) : (
              <>
                <a
                  href="/downloads/test-v1.0-Setup.exe"
                  download
                  className="mt-4 inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm text-primary-fg"
                >
                  Скачать {SETUP_EXE}
                </a>
                <p className="mt-2 text-xs text-muted">
                  Установщик Windows: ярлыки, «Программы и компоненты», подпись {LABS_NAME}.
                </p>
              </>
            )}
          </div>
        </div>
        <Separator className="my-5" />
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Студия</dt>
            <dd className="mt-0.5 font-medium">{LABS_NAME}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Год</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{year}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Права</dt>
            <dd className="mt-0.5">защищены</dd>
          </div>
        </dl>
      </Card>
      <Card className="bg-sidebar text-sidebar-fg">
        <LabsCredit tone="sidebar" align="left" />
        <p className="mt-3 text-xs leading-relaxed text-sidebar-muted">
          Товарный знак и код контура «Очаг» принадлежат {LABS_NAME}. Копирование, разбор и перепродажа — только с
          письменного согласия.
        </p>
      </Card>
    </div>
  );
}

function PrefRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-1">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
