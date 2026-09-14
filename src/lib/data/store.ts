import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Banquet,
  BanquetStatus,
  ExpenseKind,
  InvoiceLine,
  PayrollAdjKind,
  Period,
  Recipe,
  RequestStatus,
  RevisionLine,
  SaleItem,
  Snapshot,
  StopListReason,
  WriteoffReason,
} from "../domain/types";
import { type Session } from "../domain/types";
import { actorFrom, type Actor } from "../authz/actor";
import {
  applyBanquet,
  applyBanquetStatus,
  applyCloseShift,
  applyDeleteStaff,
  applyExpense,
  applyImportProducts,
  applyInviteStaff,
  applyInvoice,
  applyManualSale,
  applyOpenShift,
  applyProfile,
  applyRequestFromNeed,
  applyClosePeriod,
  applyPayrollAdjustment,
  applyRequestStatus,
  applyRevenuePlan,
  applyRevision,
  applySettings,
  applyStopList,
  applyTopUpDebt,
  applyTransfer,
  applyUpdateStaff,
  applyUpsertRecipe,
  applyWriteoff,
} from "../domain/mutations";
import { emptySnapshot, isOnboarded } from "./empty";
import { normalizeSnapshot } from "./normalize";
import { dbAdapter } from "./adapter";
import { getOpsStatus } from "@/lib/data/ops";
import { useSync } from "./sync";
import { api, setToken } from "../api/client";
import { createSeed, USERS } from "./seed";
import {
  applyPublicState,
  ensureSampleCredentials,
  hasBlankSecrets,
  matchLocalPassword,
  matchLocalPin,
} from "./secrets";
import { AUTH_BAD_CREDENTIALS_MSG, recordAuthAttempt, resolveStaffAuth } from "../domain/ops-log";

export type LoginResult = { ok: true } | { ok: false; reason: string };

const AUTH_KNOWN_FAIL = /неверн|отключена|заблок/i;

interface OpsState extends Snapshot {
  session: Session | null;
  period: Period;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginPin: (email: string, pin: string) => Promise<LoginResult>;
  loginAs: (email: string) => Promise<boolean>;
  loadSample: () => Promise<void>;
  logout: () => void;
  setBranch: (branchId: string) => void;
  setPeriod: (period: Period) => void;
  resetDemo: () => Promise<void>;
  updateProfile: (patch: { name?: string; phone?: string; password?: string }) => void;
  addWriteoff: (input: {
    productId: string;
    qty: number;
    reason: WriteoffReason;
    note?: string;
  }) => void;
  addInvoice: (input: { supplier: string; number: string; date: string; lines: InvoiceLine[] }) => void;
  createRequestFromNeed: () => void;
  setRequestStatus: (id: string, status: RequestStatus, supplierId?: string) => void;
  openShift: (input: {
    openCash: number;
    staffIds: string[];
    startList: string[];
    topUpDebtId?: string;
    topUpAmount?: number;
  }) => void;
  closeShift: (input: { closeCash: number; note?: string }) => void;
  topUpDebt: (debtId: string) => void;
  closePeriod: (input: { from: string; to: string; revisionId: string }) => void;
  adjustPayroll: (input: { userId: string; kind: PayrollAdjKind; amount: number; note: string; date?: string }) => void;
  setPlan: (input: { branchId: string; month: string; target: number }) => void;
  addManualSale: (items: Omit<SaleItem, "costAtSale">[], payment: "cash" | "card" | "qr") => void;
  importKeeperSales: (
    sales: Array<
      Omit<Snapshot["sales"][number], "shiftId" | "id" | "number" | "branchId" | "items"> & {
        items: Omit<SaleItem, "costAtSale">[];
      }
    >,
  ) => Promise<number>;
  importKeeperXml: (xml: string) => Promise<number>;
  pullKeeperSales: () => Promise<number>;
  upsertBanquet: (b: Banquet) => void;
  setBanquetStatus: (id: string, status: BanquetStatus) => void;
  completeRevision: (lines: RevisionLine[], note?: string) => void;
  transferStock: (input: {
    fromBranchId: string;
    toBranchId: string;
    productId: string;
    qty: number;
    note?: string;
  }) => void;
  setStopList: (input: { recipeId: string; reason: StopListReason; note?: string; clear?: boolean }) => void;
  addExpense: (input: { category: string; amount: number; note?: string; kind: ExpenseKind; date?: string }) => void;
  upsertRecipe: (recipe: Recipe) => void;
  importProducts: (
    rows: Array<{ name: string; category: string; unit: Snapshot["products"][number]["unit"]; minQty: number; avgCost: number }>,
  ) => void;
  inviteStaff: (input: {
    name: string;
    login: string;
    password: string;
    pin: string;
    role: Snapshot["users"][number]["role"];
    branchId: string;
    shiftPay: number;
    salesPercent: number;
    position?: string;
    phone?: string;
  }) => Promise<boolean>;
  updateStaff: (input: {
    userId: string;
    name?: string;
    login?: string;
    password?: string;
    pin?: string;
    role?: Snapshot["users"][number]["role"];
    branchId?: string | null;
    shiftPay?: number;
    salesPercent?: number;
    position?: string;
    phone?: string;
    disabled?: boolean;
  }) => Promise<boolean>;
  deleteStaff: (input: { userId: string }) => Promise<boolean>;
  updateSettings: (patch: Partial<Snapshot["settings"]>) => void;
  flushNotify: () => Promise<void>;
  simulatePayment: (tariff: "trial" | "basic" | "mid" | "pro") => Promise<boolean>;
  onboardNetwork: (input: {
    ownerName: string;
    login: string;
    password: string;
    pin: string;
    branchName: string;
    city: string;
    address: string;
  }) => Promise<{ ok: true } | { ok: false; reason: string }>;
}

function actorOf(s: { session: Session | null; users: Snapshot["users"] }): Actor | null {
  if (!s.session) return null;
  const user = s.users.find((u) => u.id === s.session?.userId);
  if (!user) return null;
  return actorFrom(user, s.session);
}

async function applyRemote(path: string, body: unknown, local: (snap: Snapshot, actor: Actor) => Snapshot) {
  const session = useOps.getState().session;
  try {
    const res = await api<{ state: Snapshot }>(path, { method: "POST", body });
    applyingRemote = true;
    useOps.setState((s) => ({
      ...s,
      ...applyIncoming(s, res.state),
      session: session ?? s.session,
    }));
    applyingRemote = false;
    return true;
  } catch (err) {
    const s = useOps.getState();
    const actor = actorOf(s);
    if (!actor) {
      toast.error(err instanceof Error ? err.message : "Нужен вход");
      return false;
    }
    try {
      const next = local(snapshotOf(s), actor);
      useOps.setState({ ...next });
      return true;
    } catch (localErr) {
      toast.error(localErr instanceof Error ? localErr.message : err instanceof Error ? err.message : "Операция отклонена");
      return false;
    }
  }
}

function snapshotOf(s: OpsState | Snapshot): Snapshot {
  return normalizeSnapshot(s);
}

function applyIncoming(s: OpsState | Snapshot, incoming: Snapshot): Snapshot {
  return applyPublicState(snapshotOf(s), incoming, USERS);
}

async function localSampleSnapshot(): Promise<Snapshot> {
  try {
    const snap = ensureSampleCredentials(await dbAdapter.loadSample(), USERS, createSeed);
    if (snap.settings.sampleLoaded && !hasBlankSecrets(snap)) return snap;
  } catch {
    /* server fn may fail or return a stripped public snapshot */
  }
  return createSeed();
}

const ACTION_KEYS = [
  "login",
  "loginPin",
  "loginAs",
  "loadSample",
  "logout",
  "setBranch",
  "setPeriod",
  "resetDemo",
  "updateProfile",
  "addWriteoff",
  "addInvoice",
  "createRequestFromNeed",
  "setRequestStatus",
  "openShift",
  "closeShift",
  "topUpDebt",
  "closePeriod",
  "adjustPayroll",
  "setPlan",
  "addManualSale",
  "importKeeperSales",
  "importKeeperXml",
  "pullKeeperSales",
  "upsertBanquet",
  "setBanquetStatus",
  "completeRevision",
  "transferStock",
  "setStopList",
  "addExpense",
  "upsertRecipe",
  "importProducts",
  "inviteStaff",
  "updateStaff",
  "deleteStaff",
  "updateSettings",
  "flushNotify",
  "simulatePayment",
  "onboardNetwork",
] as const;

function withEmpty(): Omit<OpsState, (typeof ACTION_KEYS)[number]> {
  return { ...emptySnapshot(), session: null, period: "7d" };
}

let applyingRemote = false;
let bootDone = false;

export const useOps = create<OpsState>()(
  persist(
    (set, get) => ({
      ...withEmpty(),

      login: async (email, password) => {
        try {
          const res = await api<{ user: { userId: string; branchId: string }; state: Snapshot }>("auth/login", {
            method: "POST",
            body: { login: email, password },
          });
          applyingRemote = true;
          set({
            ...applyIncoming(get(), res.state),
            session: { userId: res.user.userId, branchId: res.user.branchId },
          });
          applyingRemote = false;
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (AUTH_KNOWN_FAIL.test(msg)) return { ok: false, reason: msg || AUTH_BAD_CREDENTIALS_MSG };
          const { snap, user } = matchLocalPassword(snapshotOf(get()), email, password, USERS);
          const verdict = resolveStaffAuth({ user, credentialsOk: Boolean(user) });
          const logged = recordAuthAttempt(snap, {
            login: email,
            via: "password",
            user,
            ok: verdict.ok,
            reason: verdict.reason,
          });
          if (!logged.ok) {
            applyingRemote = true;
            set({ ...logged.snap });
            applyingRemote = false;
            return { ok: false, reason: logged.reason ?? AUTH_BAD_CREDENTIALS_MSG };
          }
          applyingRemote = true;
          set({ ...logged.snap, session: { userId: user!.id, branchId: user!.branchId ?? "all" } });
          applyingRemote = false;
          return { ok: true };
        }
      },

      loginPin: async (email, pin) => {
        try {
          const res = await api<{ user: { userId: string; branchId: string }; state: Snapshot }>("auth/pin", {
            method: "POST",
            body: { login: email, pin },
          });
          applyingRemote = true;
          set({
            ...applyIncoming(get(), res.state),
            session: { userId: res.user.userId, branchId: res.user.branchId },
          });
          applyingRemote = false;
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (AUTH_KNOWN_FAIL.test(msg)) return { ok: false, reason: msg || AUTH_BAD_CREDENTIALS_MSG };
          const { snap, user } = matchLocalPin(snapshotOf(get()), email, pin, USERS);
          const verdict = resolveStaffAuth({ user, credentialsOk: Boolean(user) });
          const logged = recordAuthAttempt(snap, {
            login: email,
            via: "pin",
            user,
            ok: verdict.ok,
            reason: verdict.reason,
          });
          if (!logged.ok) {
            applyingRemote = true;
            set({ ...logged.snap });
            applyingRemote = false;
            return { ok: false, reason: logged.reason ?? AUTH_BAD_CREDENTIALS_MSG };
          }
          applyingRemote = true;
          set({ ...logged.snap, session: { userId: user!.id, branchId: user!.branchId ?? "all" } });
          applyingRemote = false;
          return { ok: true };
        }
      },

      loginAs: async (email) => {
        const result = await get().login(email, "ochag");
        return result.ok;
      },

      loadSample: async () => {
        const commit = (snap: Snapshot) => {
          setToken(null);
          applyingRemote = true;
          set({ ...snap, session: null });
          applyingRemote = false;
        };

        try {
          const res = await api<{ state: Snapshot }>("state/sample", { method: "POST" });
          const next = ensureSampleCredentials(applyIncoming(get(), res.state), USERS, createSeed);
          if (!next.settings.sampleLoaded || hasBlankSecrets(next)) {
            commit(await localSampleSnapshot());
            return;
          }
          commit(next);
        } catch {
          commit(await localSampleSnapshot());
        }
      },

      logout: () => {
        setToken(null);
        set({ session: null });
      },

      setBranch: (branchId) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, branchId } });
        void api("session/branch", { method: "POST", body: { branchId } }).catch(() => undefined);
      },

      setPeriod: (period) => set({ period }),

      resetDemo: async () => {
        useSync.getState().setStatus("saving");
        const snap = await dbAdapter.reset();
        setToken(null);
        applyingRemote = true;
        set({ ...snap, session: null });
        applyingRemote = false;
        useSync.getState().setMeta({
          source: useSync.getState().source ?? "memory",
          updatedAt: new Date().toISOString(),
          sales: snap.sales.length,
        });
      },

      updateProfile: (patch) => {
        void applyRemote("profile", patch, (snap, actor) => applyProfile(snap, actor, patch));
      },

      addWriteoff: (input) => {
        void applyRemote("stock/writeoff", input, (snap, actor) => applyWriteoff(snap, actor, input));
      },

      addInvoice: (input) => {
        void applyRemote("stock/receipt", input, (snap, actor) => applyInvoice(snap, actor, input));
      },

      createRequestFromNeed: () => {
        void applyRemote("procurement/request", {}, (snap, actor) => applyRequestFromNeed(snap, actor));
      },

      setRequestStatus: (id, status, supplierId) => {
        void applyRemote("procurement/status", { id, status, supplierId }, (snap, actor) =>
          applyRequestStatus(snap, actor, id, status, supplierId),
        );
      },

      openShift: (input) => {
        void applyRemote("shifts/open", input, (snap, actor) => applyOpenShift(snap, actor, input));
      },

      closeShift: (input) => {
        void applyRemote("shifts/close", input, (snap, actor) => applyCloseShift(snap, actor, input));
      },

      topUpDebt: (debtId) => {
        void applyRemote("debts/topup", { debtId }, (snap, actor) => applyTopUpDebt(snap, actor, { debtId }));
      },

      closePeriod: (input) => {
        void applyRemote("period/close", input, (snap, actor) => applyClosePeriod(snap, actor, input));
      },

      adjustPayroll: (input) => {
        void applyRemote("staff/adjust", input, (snap, actor) => applyPayrollAdjustment(snap, actor, input));
      },

      setPlan: (input) => {
        void applyRemote("plan", input, (snap, actor) => applyRevenuePlan(snap, actor, input));
      },

      addManualSale: (items, payment) => {
        void applyRemote("sales/manual", { items, payment }, (snap, actor) => applyManualSale(snap, actor, items, payment));
      },

      importKeeperSales: async (incoming) => {
        const session = get().session;
        const res = await api<{ state: Snapshot; added?: number }>("sales/import", {
          method: "POST",
          body: { sales: incoming },
        });
        applyingRemote = true;
        set({ ...applyIncoming(get(), res.state), session: session ?? get().session });
        applyingRemote = false;
        return res.added ?? incoming.length;
      },

      importKeeperXml: async (xml) => {
        const session = get().session;
        const res = await api<{ state: Snapshot; added?: number }>("sales/keeper-xml", { method: "POST", body: { xml } });
        applyingRemote = true;
        set({ ...applyIncoming(get(), res.state), session: session ?? get().session });
        applyingRemote = false;
        return res.added ?? 0;
      },

      pullKeeperSales: async () => {
        const session = get().session;
        const res = await api<{ state: Snapshot; added?: number }>("sales/keeper-pull", { method: "POST", body: {} });
        applyingRemote = true;
        set({ ...applyIncoming(get(), res.state), session: session ?? get().session });
        applyingRemote = false;
        return res.added ?? 0;
      },

      upsertBanquet: (b) => {
        void applyRemote("banquets", b, (snap, actor) => applyBanquet(snap, actor, b));
      },

      setBanquetStatus: (id, status) => {
        void applyRemote("banquets/status", { id, status }, (snap, actor) => applyBanquetStatus(snap, actor, id, status));
      },

      completeRevision: (lines, note) => {
        void applyRemote("stock/revision", { lines, note }, (snap, actor) => applyRevision(snap, actor, lines, note));
      },

      transferStock: (input) => {
        void applyRemote("stock/transfer", input, (snap, actor) => applyTransfer(snap, actor, input));
      },

      setStopList: (input) => {
        void applyRemote("shifts/stop-list", input, (snap, actor) => applyStopList(snap, actor, input));
      },

      addExpense: (input) => {
        void applyRemote("expenses", input, (snap, actor) => applyExpense(snap, actor, input));
      },

      upsertRecipe: (recipe) => {
        void applyRemote("recipes", recipe, (snap, actor) => applyUpsertRecipe(snap, actor, recipe));
      },

      importProducts: (rows) => {
        void applyRemote("nomenclature/import", { rows }, (snap, actor) => applyImportProducts(snap, actor, rows));
      },

      inviteStaff: (input) => applyRemote("staff/invite", input, (snap, actor) => applyInviteStaff(snap, actor, input)),

      updateStaff: (input) => applyRemote("staff/update", input, (snap, actor) => applyUpdateStaff(snap, actor, input)),

      deleteStaff: (input) => applyRemote("staff/delete", input, (snap, actor) => applyDeleteStaff(snap, actor, input)),

      updateSettings: (patch) => {
        void applyRemote("settings/network", patch, (snap, actor) => applySettings(snap, actor, patch));
      },

      flushNotify: async () => {
        try {
          const res = await api<{ state: Snapshot }>("notify/flush", { method: "POST" });
          const session = get().session;
          applyingRemote = true;
          set({ ...applyIncoming(get(), res.state), session });
          applyingRemote = false;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Очередь не отправлена");
        }
      },

      simulatePayment: async (tariff) => {
        try {
          const res = await api<{
            billing: { tariff: "trial" | "basic" | "mid" | "pro"; paymentSimulatedAt: string | null };
          }>("billing/simulate", { method: "POST", body: { tariff } });
          applyingRemote = true;
          const paidAt = res.billing?.paymentSimulatedAt ?? new Date().toISOString();
          const paidTariff = res.billing?.tariff ?? tariff;
          set((s) => ({
            ...s,
            settings: {
              ...s.settings,
              tariff: paidTariff,
              paymentSimulatedAt: paidAt,
            },
            session: s.session,
          }));
          applyingRemote = false;
          return true;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Не удалось зафиксировать тариф");
          return false;
        }
      },

      onboardNetwork: async (input) => {
        try {
          const res = await api<{ user: { userId: string; branchId: string }; state: Snapshot }>("auth/onboard", {
            method: "POST",
            body: input,
          });
          applyingRemote = true;
          set({
            ...applyIncoming(get(), res.state),
            session: { userId: res.user.userId, branchId: res.user.branchId },
          });
          applyingRemote = false;
          return { ok: true as const };
        } catch (err) {
          return { ok: false as const, reason: err instanceof Error ? err.message : "Не удалось создать сеть" };
        }
      },
    }),
    {
      name: "ochag-session-v3",
      version: 3,
      partialize: (s) => ({ session: s.session, period: s.period }),
    },
  ),
);

if (typeof window !== "undefined") {
  useOps.subscribe((state) => {
    if (!bootDone || applyingRemote || !isOnboarded(state)) return;
    // Mutations persist through /api/v1. Do not PUT the browser snapshot back:
    // publicSnapshot blanks secrets, and a stale dump drops newly created users
    // (the production "accounts disappear" bug on top of the memory store).
    if (useSync.getState().status === "loading") return;
    useSync.getState().setStatus("ok");
  });
}

export function useHydrated() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const apiPersist = useOps.persist;
      if (apiPersist && !apiPersist.hasHydrated()) {
        await Promise.race([
          new Promise<void>((resolve) => {
            if (apiPersist.hasHydrated()) {
              resolve();
              return;
            }
            const unsub = apiPersist.onFinishHydration(() => {
              unsub();
              resolve();
            });
            if (apiPersist.hasHydrated()) {
              unsub();
              resolve();
            }
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 800)),
        ]);
      }
      try {
        const snap = await dbAdapter.load();
        if (cancelled) return;
        applyingRemote = true;
        useOps.setState((s) => {
          const merged = applyIncoming(s, snap);
          const session =
            s.session && merged.users.some((u) => u.id === s.session?.userId) ? s.session : null;
          return { ...s, ...merged, session };
        });
        applyingRemote = false;
        try {
          const meta = await getOpsStatus();
          if (!cancelled) {
            useSync.getState().setMeta({
              source: meta.source,
              updatedAt: meta.updatedAt,
              sales: meta.sales || snap.sales.length,
            });
          }
        } catch {
          useSync.getState().setMeta({
            source: "memory",
            updatedAt: new Date().toISOString(),
            sales: snap.sales.length,
          });
        }
      } catch (err) {
        applyingRemote = false;
        useSync.getState().setError(err instanceof Error ? err.message : "База недоступна");
      } finally {
        bootDone = true;
        if (!cancelled) setOk(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);
  return ok;
}

export function useSessionUser() {
  return useOps((s) => {
    if (!s.session) return null;
    return s.users.find((u) => u.id === s.session?.userId) ?? null;
  });
}

export function useActiveBranch() {
  return useOps((s) => s.branches.find((b) => b.id === s.session?.branchId) ?? null);
}

export function selectSnap(s: OpsState): Snapshot {
  return snapshotOf(s);
}
