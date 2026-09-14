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
import { useOps, useSessionUser } from "@/lib/data/store";
import { formatHandoff, generatePassword, generatePin } from "@/lib/domain/credentials";
import {
  adminVisibleUsers,
  canEditAccount,
  canManageAccounts,
  hasAbsoluteAccess,
  invitableRoles,
  isNetworkAdmin,
} from "@/lib/domain/permissions";
import { ROLE_LABEL, type Role, type StaffUser } from "@/lib/domain/types";

export const Route = createFileRoute("/_app/accounts")({ component: AccountsPage });

type Issued = {
  name: string;
  login: string;
  password: string;
  pin: string;
  role: Role;
};

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} скопирован`);
  } catch {
    toast.error("Не удалось скопировать");
  }
}

function AccountsPage() {
  const snap = useOps((s) => s);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const inviteStaff = useOps((s) => s.inviteStaff);
  const updateStaff = useOps((s) => s.updateStaff);
  const [q, setQ] = useState("");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [editing, setEditing] = useState<StaffUser | null>(null);

  const actor = {
    role: user.role,
    userId: user.id,
    homeBranchId: user.branchId,
    sessionBranchId: session.branchId,
  };
  const visible = adminVisibleUsers(actor, snap.users);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visible
      .slice()
      .sort((a, b) => Number(Boolean(a.disabled)) - Number(Boolean(b.disabled)) || a.name.localeCompare(b.name, "ru"))
      .filter((u) => {
        if (!needle) return true;
        return [u.name, u.email, ROLE_LABEL[u.role], u.position].join(" ").toLowerCase().includes(needle);
      });
  }, [visible, q]);

  if (!canManageAccounts(user.role)) return null;

  const roles = invitableRoles(user.role);
  const defaultBranch = session.branchId !== "all" ? session.branchId : snap.branches[0]?.id ?? "";

  return (
    <div>
      <PageHeader
        eyebrow="Админка"
        title="Учётки"
        description="Создайте логин, пароль и PIN и передайте клиенту. Публичной регистрации нет."
        actions={
          <CreateAccount
            branches={snap.branches}
            defaultBranch={defaultBranch}
            roles={roles}
            preferOwner={hasAbsoluteAccess(user.role)}
            onCreate={(input) => {
              inviteStaff(input);
              setIssued({
                name: input.name,
                login: input.login,
                password: input.password,
                pin: input.pin,
                role: input.role,
              });
            }}
          />
        }
      />

      {issued ? <HandoffCard issued={issued} onDismiss={() => setIssued(null)} /> : null}

      <Card className="mb-4">
        <Field label="Поиск">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Имя, логин, роль" />
        </Field>
      </Card>

      <div className="grid gap-2">
        {rows.map((row) => {
          const branch = snap.branches.find((b) => b.id === row.branchId);
          const editable = canEditAccount({ role: user.role, userId: user.id }, row);
          return (
            <Card key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <Badge tone={row.disabled ? "danger" : "muted"}>{row.disabled ? "отключена" : ROLE_LABEL[row.role]}</Badge>
                  {row.id === user.id ? <Badge tone="primary">вы</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {row.email}
                  <span className="text-subtle"> · </span>
                  {isNetworkAdmin(row.role) ? "вся сеть" : (branch?.short ?? "без филиала")}
                </p>
              </div>
              {editable ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEditing(row)}>
                    Изменить
                  </Button>
                  <Button
                    type="button"
                    variant={row.disabled ? "secondary" : "danger"}
                    onClick={() => {
                      updateStaff({ userId: row.id, disabled: !row.disabled });
                      toast.success(row.disabled ? "Учётка включена" : "Учётка отключена");
                    }}
                  >
                    {row.disabled ? "Включить" : "Отключить"}
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
        {rows.length === 0 ? <p className="px-1 text-sm text-muted">Учёток нет — создайте первую и передайте логин клиенту.</p> : null}
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
            updateStaff({ userId: editing.id, ...patch });
            if (patch.password || patch.pin) {
              setIssued({
                name: patch.name ?? editing.name,
                login: patch.login ?? editing.email,
                password: patch.password || "без изменения",
                pin: patch.pin || "без изменения",
                role: patch.role ?? editing.role,
              });
            } else {
              toast.success("Учётка обновлена");
            }
            setEditing(null);
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
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-sm bg-bg px-3">
      <div>
        <div className="text-[11px] tracking-wide text-muted uppercase">{label}</div>
        <div className="text-fg">{value}</div>
      </div>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg"
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
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [pin, setPin] = useState(generatePin);
  const [role, setRole] = useState<Role>(preferOwner && roles.includes("owner") ? "owner" : (roles[0] ?? "waiter"));
  const [branchId, setBranchId] = useState(defaultBranch);
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
              className="mt-6 inline-flex size-11 items-center justify-center rounded-sm text-muted hover:bg-bg hover:text-fg"
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
            <Field label={network ? "Филиал" : "Филиал"}>
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
              onCreate({
                name: name.trim(),
                login: login.trim().toLowerCase(),
                password,
                pin,
                role,
                branchId: network ? "" : branchId,
                shiftPay: 0,
                salesPercent: 0,
              });
              setOpen(false);
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
    disabled?: boolean;
  }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [login, setLogin] = useState(user.email);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>(user.role);
  const [branchId, setBranchId] = useState(user.branchId ?? "");
  const [disabled, setDisabled] = useState(Boolean(user.disabled));
  const network = isNetworkAdmin(role);

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
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-sm bg-bg px-3">
            <span className="text-sm">Отключить вход</span>
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
