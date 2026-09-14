import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { formatHandoff, generatePassword, generatePin } from "@/lib/domain/credentials";
import { OwnerContourPanel } from "@/components/admin/owner-contour";
import {
  adminVisibleUsers,
  accountPlaceLabel,
  canDeleteAccount,
  canEditAccount,
  canManageAccounts,
  hasAbsoluteAccess,
  invitableRoles,
  isNetworkAdmin,
} from "@/lib/domain/permissions";
import { ROLE_LABEL, type Role, type StaffUser } from "@/lib/domain/types";
import { ruDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/accounts")({ component: AccountsPage });

type Issued = {
  name: string;
  login: string;
  password: string;
  pin: string;
  role: Role;
};

type StatusFilter = "all" | "active" | "blocked";

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} скопирован`);
  } catch {
    toast.error("Не удалось скопировать");
  }
}

function scopeLabel(user: StaffUser, branches: { id: string; short: string; name: string; city?: string }[]) {
  return accountPlaceLabel(user, branches);
}

function AccountsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const inviteStaff = useOps((s) => s.inviteStaff);
  const updateStaff = useOps((s) => s.updateStaff);
  const deleteStaff = useOps((s) => s.deleteStaff);
  const setOwner = useOps((s) => s.setOwner);
  const setBranch = useOps((s) => s.setBranch);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [deleting, setDeleting] = useState<StaffUser | null>(null);

  const actor = {
    role: user.role,
    userId: user.id,
    homeBranchId: user.branchId,
    sessionBranchId: session.branchId,
    actingOwnerId: session.actingOwnerId ?? null,
  };
  const visible = adminVisibleUsers(actor, snap.users);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visible
      .slice()
      .sort((a, b) => Number(Boolean(a.disabled)) - Number(Boolean(b.disabled)) || a.name.localeCompare(b.name, "ru"))
      .filter((u) => {
        if (status === "blocked" && !u.disabled) return false;
        if (status === "active" && u.disabled) return false;
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        if (!needle) return true;
        const branch = scopeLabel(u, snap.branches);
        return [u.name, u.email, ROLE_LABEL[u.role], u.position, branch].join(" ").toLowerCase().includes(needle);
      });
  }, [visible, q, status, roleFilter, snap.branches]);

  if (!canManageAccounts(user.role)) return null;

  const roles = invitableRoles(user.role);
  const defaultBranch = session.branchId !== "all" ? session.branchId : snap.branches[0]?.id ?? "";
  const blockedCount = visible.filter((u) => u.disabled).length;

  return (
    <div>
      <PageHeader
        eyebrow="Админка"
        title="Пользователи"
        description={
          hasAbsoluteAccess(user.role)
            ? "Все учётки контура: роль, статус, сеть/филиал и последний вход. Саморегистрация владельца тоже здесь."
            : "Создайте логин, пароль и PIN и передайте сотруднику. Публичной регистрации нет."
        }
        actions={
          <CreateAccount
            branches={snap.branches}
            defaultBranch={defaultBranch}
            roles={roles}
            preferOwner={hasAbsoluteAccess(user.role)}
            onCreate={async (input) => {
              const ok = await inviteStaff(input);
              if (!ok) return false;
              setIssued({
                name: input.name,
                login: input.login,
                password: input.password,
                pin: input.pin,
                role: input.role,
              });
              return true;
            }}
          />
        }
      />

      {issued ? <HandoffCard issued={issued} onDismiss={() => setIssued(null)} /> : null}

      {hasAbsoluteAccess(user.role) ? (
        <OwnerContourPanel
          actingOwnerId={session.actingOwnerId}
          onSelectOwner={setOwner}
          branches={snap.branches}
          sessionBranchId={session.branchId}
          onSelectBranch={setBranch}
        />
      ) : null}

      <Card className="mb-4">
        <div className="grid gap-3">
          <Field label="Поиск">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Имя, логин, роль, сеть, филиал" />
          </Field>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Segmented
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                { value: "all", label: "Все" },
                { value: "active", label: "Активные" },
                { value: "blocked", label: "Заблокированы" },
              ]}
            />
            <Field label="Роль">
              <NativeSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")}>
                <option value="all">Все роли</option>
                {(hasAbsoluteAccess(user.role) ? (Object.keys(ROLE_LABEL) as Role[]) : roles).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <p className="text-xs text-muted">
            {visible.length} учёток
            {blockedCount ? ` · ${blockedCount} заблокированы` : ""}
            {hasAbsoluteAccess(user.role) ? " · все сети и филиалы" : ""}
          </p>
        </div>
      </Card>

      <div className="grid gap-2">
        {rows.map((row) => {
          const editable = canEditAccount({ role: user.role, userId: user.id }, row);
          const removable = canDeleteAccount({ role: user.role, userId: user.id }, row, snap.users);
          return (
            <Card key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <Badge tone="muted">{ROLE_LABEL[row.role]}</Badge>
                  <Badge tone={row.disabled ? "danger" : "success"}>{row.disabled ? "заблокирована" : "активна"}</Badge>
                  {row.id === user.id ? <Badge tone="primary">вы</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {row.email}
                  <span className="text-subtle"> · </span>
                  {scopeLabel(row, snap.branches)}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {row.lastLoginAt ? `вход ${ruDateTime(row.lastLoginAt)}` : "ещё не входил"}
                </p>
              </div>
              {editable || removable ? (
                <div className="flex flex-wrap gap-2">
                  {editable ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setIssued(null);
                          setEditing(row);
                        }}
                      >
                        Изменить
                      </Button>
                      <Button
                        type="button"
                        variant={row.disabled ? "secondary" : "danger"}
                        onClick={() => {
                          void updateStaff({ userId: row.id, disabled: !row.disabled }).then((ok) => {
                            if (ok) toast.success(row.disabled ? "Учётка разблокирована" : "Учётка заблокирована");
                          });
                        }}
                      >
                        {row.disabled ? "Разблокировать" : "Заблокировать"}
                      </Button>
                    </>
                  ) : null}
                  {removable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIssued(null);
                        setDeleting(row);
                      }}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
        {rows.length === 0 ? (
          <p className="px-1 text-sm text-muted">
            {visible.length === 0 ? "Учёток нет — создайте первую и передайте логин клиенту." : "Нет учёток по фильтру."}
          </p>
        ) : null}
      </div>

      {editing ? (
        <EditAccount
          user={editing}
          branches={snap.branches}
          roles={roles}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSave={(patch) => {
            void updateStaff({ userId: editing.id, ...patch }).then((ok) => {
              if (!ok) return;
              if (patch.password || patch.pin) {
                setIssued({
                  name: patch.name ?? editing.name,
                  login: patch.login ?? editing.email,
                  password: patch.password || "без изменения",
                  pin: patch.pin || "без изменения",
                  role: patch.role ?? editing.role,
                });
              } else if (patch.disabled && !editing.disabled) {
                toast.success("Учётка заблокирована");
              } else if (patch.disabled === false && editing.disabled) {
                toast.success("Учётка разблокирована");
              } else {
                toast.success("Учётка обновлена");
              }
              setEditing(null);
            });
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteAccount
          user={deleting}
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          onConfirm={() => {
            void deleteStaff({ userId: deleting.id }).then((ok) => {
              if (!ok) return;
              toast.success("Учётка удалена");
              setDeleting(null);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function HandoffCard({ issued, onDismiss }: { issued: Issued; onDismiss: () => void }) {
  const blob = formatHandoff({
    name: issued.name,
    login: issued.login,
    password: issued.password,
    pin: issued.pin,
    roleLabel: ROLE_LABEL[issued.role],
  });
  return (
    <Card className="mb-4 border border-border-strong">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-4 text-primary" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium tracking-tight">Передайте клиенту</h2>
          <p className="mt-1 text-sm text-muted">Пароль и PIN показываем один раз. Скопируйте сейчас.</p>
          <dl className="mt-3 grid gap-2 font-mono text-sm">
            <HandoffRow label="Имя" value={issued.name} />
            <HandoffRow label="Роль" value={ROLE_LABEL[issued.role]} />
            <HandoffRow label="Логин" value={issued.login} />
            <HandoffRow label="Пароль" value={issued.password} />
            <HandoffRow label="PIN" value={issued.pin} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void copyText("Блок", blob)}>
              Копировать всё
            </Button>
            <Button type="button" variant="ghost" onClick={onDismiss}>
              Скрыть
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HandoffRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-bg px-3">
      <div>
        <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
        <div className="text-fg">{value}</div>
      </div>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-fg"
        onClick={() => void copyText(label, value)}
        aria-label={`Копировать ${label}`}
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function CreateAccount({
  branches,
  defaultBranch,
  roles,
  preferOwner,
  onCreate,
}: {
  branches: { id: string; short: string; name: string }[];
  defaultBranch: string;
  roles: Role[];
  preferOwner: boolean;
  onCreate: (input: {
    name: string;
    login: string;
    password: string;
    pin: string;
    role: Role;
    branchId: string;
    shiftPay: number;
    salesPercent: number;
    monthlyPremium?: number;
  }) => boolean | void | Promise<boolean | void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [pin, setPin] = useState(generatePin);
  const [role, setRole] = useState<Role>(preferOwner && roles.includes("owner") ? "owner" : (roles[0] ?? "waiter"));
  const [branchId, setBranchId] = useState(defaultBranch);
  const [shiftPay, setShiftPay] = useState("0");
  const [salesPercent, setSalesPercent] = useState("0");
  const [monthlyPremium, setMonthlyPremium] = useState("0");
  const network = isNetworkAdmin(role);

  function resetSecrets() {
    setPassword(generatePassword());
    setPin(generatePin());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName("");
          setLogin("");
          resetSecrets();
          setRole(preferOwner && roles.includes("owner") ? "owner" : (roles[0] ?? "waiter"));
          setBranchId(defaultBranch);
          setShiftPay("0");
          setSalesPercent("0");
          setMonthlyPremium("0");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Создать учётку</Button>
      </DialogTrigger>
      <DialogContent title="Новая учётка">
        <div className="grid gap-3">
          <Field label="Имя">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Логин">
            <Input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" autoComplete="off" />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field label="Пароль">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <button
              type="button"
              className="mt-6 inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-bg hover:text-fg"
              onClick={resetSecrets}
              aria-label="Сгенерировать пароль и PIN"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          <Field label="PIN (4 цифры)">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Роль">
              <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Филиал">
              <NativeSelect value={network ? "" : branchId} onChange={(e) => setBranchId(e.target.value)} disabled={network}>
                {network ? <option value="">Вся сеть</option> : null}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ставка за смену, ₽">
              <Input value={shiftPay} onChange={(e) => setShiftPay(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="% с выручки">
              <Input value={salesPercent} onChange={(e) => setSalesPercent(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Мес. премия, ₽">
              <Input value={monthlyPremium} onChange={(e) => setMonthlyPremium(e.target.value)} inputMode="numeric" />
            </Field>
          </div>
          {role === "tech_admin" ? (
            <p className="text-xs text-muted">Администратор-техник видит всю сеть и может создавать любые роли.</p>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              if (!name.trim() || !login.trim() || password.length < 4 || pin.length !== 4) {
                toast.error("Имя, логин, пароль от 4 знаков и PIN из 4 цифр обязательны");
                return;
              }
              if (!network && !branchId) {
                toast.error("Выберите филиал");
                return;
              }
              void Promise.resolve(
                onCreate({
                  name: name.trim(),
                  login: login.trim().toLowerCase(),
                  password,
                  pin,
                  role,
                  branchId: network ? "" : branchId,
                  shiftPay: Number(shiftPay) || 0,
                  salesPercent: Number(salesPercent) || 0,
                  monthlyPremium: Number(monthlyPremium) || 0,
                }),
              ).then((ok) => {
                if (ok !== false) setOpen(false);
              });
            }}
          >
            Создать и показать доступ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAccount({
  user,
  branches,
  roles,
  open,
  onOpenChange,
  onSave,
}: {
  user: StaffUser;
  branches: { id: string; short: string; name: string }[];
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: {
    name?: string;
    login?: string;
    password?: string;
    pin?: string;
    role?: Role;
    branchId?: string | null;
    shiftPay?: number;
    salesPercent?: number;
    monthlyPremium?: number;
    disabled?: boolean;
  }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [login, setLogin] = useState(user.email);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>(user.role);
  const [branchId, setBranchId] = useState(user.branchId ?? "");
  const [shiftPay, setShiftPay] = useState(String(user.shiftPay ?? 0));
  const [salesPercent, setSalesPercent] = useState(String(user.salesPercent ?? 0));
  const [monthlyPremium, setMonthlyPremium] = useState(String(user.monthlyPremium ?? 0));
  const [disabled, setDisabled] = useState(Boolean(user.disabled));
  const network = isNetworkAdmin(role);
  const roleOptions = roles.includes(user.role) ? roles : [user.role, ...roles];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Учётка · ${user.name}`}>
        <div className="grid gap-3">
          <Field label="Имя">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Логин">
            <Input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" />
          </Field>
          <Field label="Новый пароль (пусто — не менять)">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Новый PIN (пусто — не менять)">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Роль">
              <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Филиал">
              <NativeSelect value={network ? "" : branchId} onChange={(e) => setBranchId(e.target.value)} disabled={network}>
                {network ? <option value="">Вся сеть</option> : null}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ставка за смену, ₽">
              <Input value={shiftPay} onChange={(e) => setShiftPay(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="% с выручки">
              <Input value={salesPercent} onChange={(e) => setSalesPercent(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Мес. премия, ₽">
              <Input value={monthlyPremium} onChange={(e) => setMonthlyPremium(e.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-bg px-3">
            <span className="text-sm">Заблокировать вход</span>
            <Switch checked={disabled} onCheckedChange={setDisabled} />
          </div>
          <Button
            type="button"
            onClick={() => {
              if (!name.trim() || !login.trim()) {
                toast.error("Имя и логин обязательны");
                return;
              }
              if (password && password.length < 4) {
                toast.error("Пароль от 4 знаков");
                return;
              }
              if (pin && pin.length !== 4) {
                toast.error("PIN — 4 цифры");
                return;
              }
              if (!network && !branchId) {
                toast.error("Выберите филиал");
                return;
              }
              onSave({
                name: name.trim(),
                login: login.trim().toLowerCase(),
                password: password || undefined,
                pin: pin || undefined,
                role,
                branchId: network ? null : branchId,
                shiftPay: Number(shiftPay) || 0,
                salesPercent: Number(salesPercent) || 0,
                monthlyPremium: Number(monthlyPremium) || 0,
                disabled,
              });
            }}
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccount({
  user,
  open,
  onOpenChange,
  onConfirm,
}: {
  user: StaffUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Удалить учётку?">
        <p className="text-sm text-muted">
          {user.name} ({user.email}) будет удалена. Войти по логину и PIN будет нельзя. Это нельзя отменить.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="danger" onClick={onConfirm}>
            Удалить
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
