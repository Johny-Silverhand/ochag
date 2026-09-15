import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  Ellipsis,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Plug,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  CalendarClock,
  LineChart,
  Terminal,
  Users,
  Wallet,
  Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveBranch, useOps, useSessionUser } from "@/lib/data/store";
import { can, canSeeAllBranches, hasAbsoluteAccess, type ModuleKey } from "@/lib/domain/permissions";
import { ROLE_LABEL, type Role } from "@/lib/domain/types";
import { NativeSelect } from "@/components/ui/input";
import { APP_NAME, NETWORK_NAME } from "@/lib/brand";
import { ThemeSwitcher } from "@/components/theme/switcher";
import { useSync } from "@/lib/data/sync";
import { PinOfferDialog } from "@/components/auth/pin-offer";
import { OwnerContourSelect } from "@/components/admin/owner-contour";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module: ModuleKey;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Обзор", icon: LayoutDashboard, module: "dashboard" },
  { to: "/sales", label: "Продажи", icon: Receipt, module: "sales" },
  { to: "/inventory", label: "Склад", icon: Package, module: "inventory" },
  { to: "/recipes", label: "Техкарты", icon: ChefHat, module: "recipes" },
  { to: "/shifts", label: "Смены", icon: Wallet, module: "shifts" },
  { to: "/procurement", label: "Закупки", icon: ShoppingCart, module: "procurement" },
  { to: "/banquets", label: "Банкеты", icon: CalendarDays, module: "banquets" },
  { to: "/accounts", label: "Пользователи", icon: KeyRound, module: "staff" },
  { to: "/console", label: "Консоль", icon: Terminal, module: "admin" },
  { to: "/journal", label: "Журнал", icon: ScrollText, module: "admin" },
  { to: "/staff", label: "Сотрудники", icon: Users, module: "staff" },
  { to: "/debts", label: "Долги", icon: Scale, module: "debts" },
  { to: "/reports", label: "Отчёты", icon: ClipboardList, module: "reports" },
  { to: "/planning", label: "Аналитика", icon: LineChart, module: "planning" },
  { to: "/schedule", label: "Период", icon: CalendarClock, module: "schedule" },
  { to: "/quality", label: "Журналы", icon: ShieldCheck, module: "quality" },
  { to: "/ai", label: "AI", icon: Sparkles, module: "ai" },
  { to: "/integrations", label: "Интеграции", icon: Plug, module: "integrations" },
];

const SETTINGS_ITEM: NavItem = { to: "/settings", label: "Настройки", icon: Settings, module: "settings" };

function mobilePrimary(role: Role, items: NavItem[]): NavItem[] {
  const prefer =
    role === "cook"
      ? ["/dashboard", "/inventory", "/shifts", "/banquets"]
      : ["/dashboard", "/sales", "/shifts", "/banquets"];
  return prefer.map((to) => items.find((i) => i.to === to)).filter((i): i is NavItem => Boolean(i));
}

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="currentColor" opacity="0.12" />
      <path
        d="M8 22.5c0-6 4-11 8-13.5 4 2.5 8 7.5 8 13.5 0 1.8-1.6 3-4 3H12c-2.4 0-4-1.2-4-3Z"
        fill="currentColor"
      />
      <path
        d="M12.5 22.5c.6-3.2 2.2-5.4 3.5-6.6 1.3 1.2 2.9 3.4 3.5 6.6"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

function NavLink({ item, pathname, className, activeClass, idleClass, iconClass }: {
  item: NavItem;
  pathname: string;
  className: string;
  activeClass: string;
  idleClass: string;
  iconClass?: string;
}) {
  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
  return (
    <Link to={item.to} className={cn(className, active ? activeClass : idleClass)}>
      <item.icon className={iconClass ?? "size-[var(--nav-icon)] shrink-0"} strokeWidth={2} />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useSessionUser();
  const branch = useActiveBranch();
  const session = useOps((s) => s.session);
  const branches = useOps((s) => s.branches);
  const setBranch = useOps((s) => s.setBranch);
  const setOwner = useOps((s) => s.setOwner);
  const logout = useOps((s) => s.logout);
  const navigate = useNavigate();
  const role = user?.role ?? "waiter";
  const [moreOpen, setMoreOpen] = useState(false);

  const items = NAV.filter((n) => can(role, n.module));
  const primary = mobilePrimary(role, items);
  const moreItems = [
    ...items.filter((i) => !primary.some((p) => p.to === i.to)),
    SETTINGS_ITEM,
  ];
  const current = [...NAV, SETTINGS_ITEM].find(
    (n) => pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(`${n.to}/`)),
  );

  useEffect(() => {
    if (current && !can(role, current.module)) {
      void navigate({ to: "/dashboard" });
    }
  }, [current, role, navigate]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
  const moreActive = moreOpen || moreItems.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  const sync = useSync();

  return (
    <div className="app-frame flex h-[var(--app-height,100dvh)] min-h-0 flex-col overflow-hidden bg-bg text-fg lg:grid lg:h-dvh lg:grid-cols-[var(--shell-sidebar)_minmax(0,1fr)]">
      <div className="app-scene" aria-hidden="true" />
      <aside className="no-print relative z-10 hidden bg-sidebar text-sidebar-fg lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-4 pb-3">
          <Mark className="size-7 text-sidebar-fg" />
          <div>
            <div className="text-sm font-semibold tracking-wide">{NETWORK_NAME}</div>
            <div className="text-xs text-sidebar-muted">Контур кафе</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 scroll-touch">
          {items.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              pathname={pathname}
              className="app-nav-link flex min-w-0 items-center gap-2 rounded-lg px-2.5 text-[13px] leading-tight transition-[color,background-color,transform] duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.98]"
              activeClass="bg-sidebar-fg/14 text-sidebar-fg"
              idleClass="text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
            />
          ))}
        </nav>
        <div className="mt-auto px-2 pb-1">
          <NavLink
            item={SETTINGS_ITEM}
            pathname={pathname}
            className="app-nav-link flex min-w-0 items-center gap-2 rounded-lg px-2.5 text-[13px] leading-tight transition-[color,background-color,transform] duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.98]"
            activeClass="bg-sidebar-fg/14 text-sidebar-fg"
            idleClass="text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
          />
        </div>
        <div className="border-t border-sidebar-fg/10 px-3 py-3">
          <Link to="/settings" className="block rounded-xl py-1 hover:opacity-90">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-sidebar-muted">{ROLE_LABEL[role]}</div>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              void navigate({ to: "/" });
            }}
            className="mt-3 flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm text-sidebar-muted transition-colors duration-200 hover:text-sidebar-fg"
          >
            <LogOut className="size-5" strokeWidth={2} />
            Выйти
          </button>
        </div>
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scroll-touch pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:col-start-2 lg:row-start-1 lg:h-full lg:overflow-hidden lg:pb-0">
        <header className="glass-chrome no-print sticky top-0 z-30 flex min-w-0 items-center gap-2 border-b border-border px-[var(--page-pad-x)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <Mark className="size-8 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold tracking-wide">{NETWORK_NAME}</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            {hasAbsoluteAccess(role) ? <OwnerContourSelect value={session?.actingOwnerId ?? ""} onChange={setOwner} /> : null}
            {canSeeAllBranches(role) ? (
              <NativeSelect
                className="h-11 w-[min(9rem,38vw)] min-w-0 shrink bg-surface sm:w-52 md:h-10"
                value={session?.branchId ?? "all"}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="all">Все филиалы</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <span className="truncate text-sm text-muted">{branch?.name}</span>
            )}
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:inline-flex",
                sync.status === "error" ? "bg-danger-soft text-danger" : "bg-surface text-muted",
              )}
              title={
                sync.status === "error"
                  ? sync.error || "База временно недоступна"
                  : sync.source === "neon"
                    ? "Neon Postgres"
                    : sync.source === "json"
                      ? "JSON store"
                      : "Память / контур"
              }
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  sync.status === "saving"
                    ? "bg-warning"
                    : sync.status === "error"
                      ? "bg-danger"
                      : "bg-success",
                )}
              />
              {sync.status === "saving"
                ? "запись"
                : sync.status === "error"
                  ? "нет базы"
                  : "база"}
            </span>
            <ThemeSwitcher />
            <Link
              to="/settings"
              aria-label="Настройки"
              className={cn(
                "flex size-11 items-center justify-center rounded-xl text-muted transition-[color,background-color] duration-200 hover:bg-surface hover:text-fg md:size-10",
                settingsActive && "bg-surface text-primary",
              )}
            >
              <Settings className="size-5" strokeWidth={2} />
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-[var(--page-pad-x)] py-[var(--page-pad-y)] lg:min-h-0 lg:overflow-y-auto lg:scroll-touch">
          <div key={pathname} className="route-enter flex-1">
            {current && !can(role, current.module) ? (
              <p className="text-sm text-muted">Раздел закрыт для вашей роли. Прямой адрес не открывает чужие модули.</p>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      <div className={cn("fixed inset-0 z-50 lg:hidden", moreOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <button
          type="button"
          className={cn("sheet-backdrop absolute inset-0 bg-fg/40", moreOpen ? "opacity-100" : "opacity-0")}
          aria-label="Закрыть"
          tabIndex={moreOpen ? 0 : -1}
          onClick={() => setMoreOpen(false)}
        />
        <div
          className={cn(
            "sheet-up glass-sheet absolute inset-x-0 bottom-0 max-h-[var(--dialog-max-h)] overflow-y-auto rounded-t-3xl px-[var(--page-pad-x)] pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]",
            moreOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Ещё</div>
          <nav className="grid grid-cols-2 gap-2">
            {moreItems.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-14 min-w-0 items-center gap-3 rounded-2xl px-3 text-sm transition-[color,background-color,transform] duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.98]",
                    active ? "bg-bg text-fg" : "text-muted hover:bg-bg hover:text-fg",
                  )}
                >
                  <item.icon className="size-6 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <nav
        className="ios-tabbar glass-chrome no-print fixed inset-x-0 bottom-0 z-40 grid border-t border-border lg:hidden"
        style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
      >
        {primary.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-medium transition-[color,transform] duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.96]",
                active ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="size-[var(--tab-icon)] shrink-0" strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-medium transition-[color,transform] duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.96]",
            moreActive ? "text-primary" : "text-muted",
          )}
        >
          <Ellipsis className="size-[var(--tab-icon)] shrink-0" strokeWidth={2} />
          <span>Ещё</span>
        </button>
      </nav>
      <PinOfferDialog />
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg">
      <div className="text-center">
        <div className="text-sm font-semibold tracking-[0.22em] uppercase">{APP_NAME}</div>
        <div className="mt-2 text-xs text-muted">Загрузка контура…</div>
      </div>
    </div>
  );
}

export function useRole(): Role {
  const user = useSessionUser();
  return user?.role ?? "waiter";
}
