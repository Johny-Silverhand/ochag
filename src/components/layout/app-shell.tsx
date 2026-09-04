import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Package,
  Plug,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveBranch, useOps, useSessionUser } from "@/lib/data/store";
import { can, canSeeAllBranches, type ModuleKey } from "@/lib/domain/permissions";
import { ROLE_LABEL, type Role } from "@/lib/domain/types";
import { NativeSelect } from "@/components/ui/input";
import { APP_NAME } from "@/lib/brand";
import { LabsCredit, LabsFooter } from "@/components/brand/labs-credit";
import { ThemeSwitcher } from "@/components/theme/switcher";
import { useSync } from "@/lib/data/sync";

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
  { to: "/staff", label: "Сотрудники", icon: Users, module: "staff" },
  { to: "/reports", label: "Отчёты", icon: ClipboardList, module: "reports" },
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
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
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

function NavLink({ item, pathname, className, activeClass, idleClass }: {
  item: NavItem;
  pathname: string;
  className: string;
  activeClass: string;
  idleClass: string;
}) {
  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
  return (
    <Link to={item.to} className={cn(className, active ? activeClass : idleClass)}>
      <item.icon className="size-4" strokeWidth={1.75} />
      {item.label}
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
    <div className="app-frame min-h-dvh bg-bg text-fg md:grid md:h-dvh md:grid-cols-[220px_1fr] md:overflow-hidden">
      <aside className="no-print hidden bg-sidebar text-sidebar-fg md:flex md:h-full md:flex-col md:overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <Mark className="size-8 text-sidebar-fg" />
          <div>
            <div className="text-sm font-semibold tracking-wide">{APP_NAME}</div>
            <div className="text-xs text-sidebar-muted">Victimok Labs</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 scroll-touch">
          {items.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              pathname={pathname}
              className="flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm transition-colors duration-150"
              activeClass="bg-sidebar-fg/12 text-sidebar-fg"
              idleClass="text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
            />
          ))}
        </nav>
        <div className="mt-auto px-3 pb-2">
          <NavLink
            item={SETTINGS_ITEM}
            pathname={pathname}
            className="flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm transition-colors duration-150"
            activeClass="bg-sidebar-fg/12 text-sidebar-fg"
            idleClass="text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
          />
        </div>
        <div className="border-t border-sidebar-fg/10 p-4">
          <Link to="/settings" className="block rounded-sm py-0.5 hover:opacity-90">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-sidebar-muted">{ROLE_LABEL[role]}</div>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              void navigate({ to: "/" });
            }}
            className="mt-3 flex h-9 items-center gap-2 text-xs text-sidebar-muted hover:text-sidebar-fg"
          >
            <LogOut className="size-3.5" />
            Выйти
          </button>
          <LabsCredit tone="sidebar" align="left" compact className="mt-4" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto pb-[calc(5.25rem+env(safe-area-inset-bottom))] scroll-touch md:h-full md:overflow-hidden md:pb-0">
        <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Mark className="size-7 text-primary" />
            <span className="text-sm font-semibold tracking-wide">{APP_NAME}</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            {canSeeAllBranches(role) ? (
              <NativeSelect
                className="h-11 w-36 bg-surface sm:w-52 md:h-9"
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
                "hidden items-center gap-1.5 rounded-full px-2 py-1 text-[11px] sm:inline-flex",
                sync.status === "error" ? "bg-danger-soft text-danger" : "bg-surface text-muted",
              )}
              title={sync.source === "neon" ? "Neon Postgres" : "Postgres"}
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
              {sync.status === "saving" ? "запись" : sync.status === "error" ? "база" : "база"}
            </span>
            <ThemeSwitcher />
            <Link
              to="/settings"
              aria-label="Настройки"
              className={cn(
                "flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-fg md:size-9",
                settingsActive && "bg-surface text-primary",
              )}
            >
              <Settings className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 py-5 scroll-touch sm:px-6 sm:py-6">
          <div className="flex-1">
            <Outlet />
          </div>
          <LabsFooter className="mt-12 mb-1" />
        </main>
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-fg/35" aria-label="Закрыть" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-(--shadow-border)">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
            <div className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Ещё</div>
            <nav className="grid grid-cols-2 gap-1.5">
              {moreItems.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex h-14 items-center gap-2.5 rounded-md px-3 text-sm",
                      active ? "bg-bg text-fg" : "text-muted hover:bg-bg hover:text-fg",
                    )}
                  >
                    <item.icon className="size-4" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <LabsCredit className="mt-4" compact />
          </div>
        </div>
      ) : null}

      <nav
        className="ios-tabbar no-print fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-surface/95 backdrop-blur-sm md:hidden"
        style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
      >
        {primary.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 pt-1.5 text-[11px]",
                active ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 pt-1.5 text-[11px]",
            moreActive ? "text-primary" : "text-muted",
          )}
        >
          <Ellipsis className="size-5" strokeWidth={1.75} />
          Ещё
        </button>
      </nav>
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg">
      <div className="text-center">
        <div className="text-sm font-semibold tracking-[0.22em]">ОЧАГ</div>
        <div className="mt-2 text-xs text-muted">Загрузка контура…</div>
      </div>
      <LabsCredit className="absolute inset-x-0 bottom-8" />
    </div>
  );
}

export function useRole(): Role {
  const user = useSessionUser();
  return user?.role ?? "waiter";
}
