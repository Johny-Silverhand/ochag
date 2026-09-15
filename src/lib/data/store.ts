import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Banquet,
  BanquetStatus,
  DocumentPhoto,
  ExpenseKind,
  Hall,
  HouseholdMoveType,
  InvoiceLine,
  LedgerDebtKind,
  PayrollAdjKind,
  Period,
  Recipe,
  RequestStatus,
  RevisionLine,
  SaleItem,
  Snapshot,
  StopListReason,
  Unit,
  WriteoffReason,
  MoneySource,
} from "../domain/types";
import { type Session } from "../domain/types";
import { emptySnapshot, isOnboarded } from "./empty";
import { normalizeSnapshot } from "./normalize";
import { dbAdapter } from "./adapter";
import { getOpsStatus } from "@/lib/data/ops";
import { useSync } from "./sync";
import { api, fetchStoreHealth, getToken, setToken } from "../api/client";
import { createSeed, USERS } from "./seed";
import {
  applyPublicState,
  ensureSampleCredentials,
  matchLocalPassword,
  matchLocalPin,
} from "./secrets";
import { AUTH_BAD_CREDENTIALS_MSG, recordAuthAttempt, resolveStaffAuth } from "../domain/ops-log";
import {
  DB_WAIT_MSG,
  clientErrorMessage,
  isTransientClientFailure,
  isUnauthorizedFailure,
  sleep,
} from "../repo/db-errors";
import { keepStoredSession, shouldReplaceSnapshot } from "./session-keep";

export type LoginResult = { ok: true } | { ok: false; reason: string };

interface OpsState extends Snapshot {
  session: Session | null;
  period: Period;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginPin: (email: string, pin: string) => Promise<LoginResult>;
  loginAs: (email: string) => Promise<boolean>;
  loadSample: () => Promise<{ ok: true } | { ok: false; reason: string }>;
  logout: () => void;
  setBranch: (branchId: string) => void;
  setOwner: (ownerId: string | null) => Promise<void>;
  setPeriod: (period: Period) => void;
  resetDemo: () => Promise<void>;
  updateProfile: (patch: { name?: string; phone?: string; password?: string }) => void;
  addWriteoff: (input: {
    productId: string;
    qty: number;
    reason: WriteoffReason;
    note?: string;
  }) => void;
  addInvoice: (input: { supplier: string; number: string; date: string; lines: InvoiceLine[]; photos?: DocumentPhoto[] }) => void;
  createRequestFromNeed: () => void;
  setRequestStatus: (id: string, status: RequestStatus, supplierId?: string) => void;
  openShift: (input: {
    openCash: number;
    staffIds: string[];
    startList: string[];
    topUpDebtId?: string;
    topUpAmount?: number;
    incidentals?: Array<{ title: string; amount: number; paidFromTill?: boolean; paidFrom?: MoneySource; note?: string }>;
  }) => Promise<boolean>;
  closeShift: (input: {
    closeCash: number;
    note?: string;
    incidentals?: Array<{ title: string; amount: number; paidFromTill?: boolean; paidFrom?: MoneySource; note?: string }>;
  }) => Promise<boolean>;
  addShiftIncidental: (input: {
    title: string;
    amount: number;
    paidFromTill?: boolean;
    paidFrom?: MoneySource;
    note?: string;
    phase?: "open" | "close" | "during";
  }) => Promise<boolean>;
  topUpDebt: (debtId: string) => void;
  addLedgerDebt: (input: { kind: LedgerDebtKind; partyName: string; partyId?: string; amount: number; note?: string }) => void;
  payLedgerDebt: (input: { debtId: string; amount: number; note?: string }) => void;
  updateLedgerDebt: (input: { debtId: string; partyName?: string; amount?: number; note?: string }) => void;
  upsertHouseholdItem: (input: { id?: string; name: string; category?: string; unit?: Unit; minQty?: number }) => void;
  householdMove: (input: {
    itemId: string;
    type: HouseholdMoveType;
    qty: number;
    cost?: number;
    note?: string;
    photos?: DocumentPhoto[];
  }) => Promise<boolean>;
  closePeriod: (input: { from: string; to: string; revisionId: string }) => void;
  adjustPayroll: (input: { userId: string; kind: PayrollAdjKind; amount: number; note: string; date?: string }) => Promise<boolean>;
  accruePremiums: (input: { month?: string; userIds: string[] }) => Promise<boolean>;
  setPlan: (input: { branchId: string; month: string; target: number }) => void;
  addManualSale: (items: Omit<SaleItem, "costAtSale">[], payment: "cash" | "card" | "qr" | "transfer") => void;
  voidSale: (input: { saleId: string; reason?: string }) => void;
  discountSale: (input: { saleId: string; amount: number; reason?: string }) => void;
  importKeeperSales: (
    sales: Array<
      Omit<Snapshot["sales"][number], "shiftId" | "id" | "number" | "branchId" | "items"> & {
        items: Omit<SaleItem, "costAtSale">[];
      }
    >,
  ) => Promise<number>;
  importKeeperXml: (xml: string) => Promise<number>;
  pullKeeperSales: () => Promise<number>;
  upsertBanquet: (b: Banquet) => Promise<boolean>;
  deleteBanquet: (id: string) => Promise<boolean>;
  setBanquetStatus: (id: string, status: BanquetStatus) => void;
  completeRevision: (lines: RevisionLine[], note?: string, photos?: DocumentPhoto[]) => void;
  transferStock: (input: {
    fromBranchId: string;
    toBranchId: string;
    productId: string;
    qty: number;
    note?: string;
  }) => void;
  setStopList: (input: { recipeId: string; reason: StopListReason; note?: string; clear?: boolean }) => void;
  addExpense: (input: { category: string; amount: number; note?: string; kind: ExpenseKind; date?: string }) => Promise<boolean>;
  upsertRecipe: (recipe: Recipe) => void;
  createProduct: (input: { name: string; category?: string; unit?: Snapshot["products"][number]["unit"]; minQty?: number; avgCost?: number }) => Promise<boolean>;
  importProducts: (
    rows: Array<{ name: string; category: string; unit: Snapshot["products"][number]["unit"]; minQty: number; avgCost: number }>,
    csv?: string,
  ) => Promise<boolean>;
  inviteStaff: (input: {
    name: string;
    login: string;
    password: string;
    pin: string;
    role: Snapshot["users"][number]["role"];
    branchId: string;
    shiftPay: number;
    salesPercent: number;
    monthlyPremium?: number;
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
    monthlyPremium?: number;
    position?: string;
    phone?: string;
    disabled?: boolean;
  }) => Promise<boolean>;
  deleteStaff: (input: { userId: string }) => Promise<boolean>;
  addBranch: (input: {
    name: string;
    city: string;
    address: string;
    short?: string;
    seats?: number;
    phone?: string;
    halls?: string[];
    hallDetails?: Hall[];
  }) => Promise<boolean>;
  updateBranch: (input: {
    branchId: string;
    name?: string;
    city?: string;
    address?: string;
    short?: string;
    seats?: number;
    phone?: string;
    halls?: string[];
    hallDetails?: Hall[];
  }) => Promise<boolean>;
  deleteBranch: (input: { branchId: string }) => Promise<boolean>;
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
    seats?: number;
    halls?: string[];
    phone?: string;
    tariff?: "trial" | "basic" | "mid" | "pro";
  }) => Promise<{ ok: true } | { ok: false; reason: string }>;
  ensureShowcase: () => Promise<boolean>;
  approveApplication: (input: { id: string; tariff?: "trial" | "basic" | "mid" | "pro"; paid?: boolean }) => Promise<boolean>;
  rejectApplication: (input: { id: string; reason?: string }) => Promise<boolean>;
}

async function applyRemote(path: string, body: unknown) {
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
    if (isUnauthorizedFailure(err)) {
      setToken(null);
      useOps.setState((s) => ({ ...s, session: null }));
      toast.error("Сессия истекла");
      return false;
    }
    // Never pretend a local-only write succeeded: that was the production
    // «сотрудник создан, после обновления исчез» failure.
    toast.error(clientErrorMessage(err, "Операция не записана в базу"));
    return false;
  }
}

function snapshotOf(s: OpsState | Snapshot): Snapshot {
  return normalizeSnapshot(s);
}

function applyIncoming(s: OpsState | Snapshot, incoming: Snapshot): Snapshot {
  return applyPublicState(snapshotOf(s), incoming, USERS);
}

const ACTION_KEYS = [
  "login",
  "loginPin",
  "loginAs",
  "loadSample",
  "logout",
  "setBranch",
  "setOwner",
  "setPeriod",
  "resetDemo",
  "updateProfile",
  "addWriteoff",
  "addInvoice",
  "createRequestFromNeed",
  "setRequestStatus",
  "openShift",
  "closeShift",
  "addShiftIncidental",
  "topUpDebt",
  "addLedgerDebt",
  "payLedgerDebt",
  "updateLedgerDebt",
  "upsertHouseholdItem",
  "householdMove",
  "closePeriod",
  "adjustPayroll",
  "accruePremiums",
  "setPlan",
  "addManualSale",
  "voidSale",
  "discountSale",
  "importKeeperSales",
  "importKeeperXml",
  "pullKeeperSales",
  "upsertBanquet",
  "deleteBanquet",
  "setBanquetStatus",
  "completeRevision",
  "transferStock",
  "setStopList",
  "addExpense",
  "upsertRecipe",
  "createProduct",
  "importProducts",
  "inviteStaff",
  "updateStaff",
  "deleteStaff",
  "addBranch",
  "updateBranch",
  "deleteBranch",
  "updateSettings",
  "flushNotify",
  "simulatePayment",
  "onboardNetwork",
  "ensureShowcase",
  "approveApplication",
  "rejectApplication",
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
            session: {
              userId: res.user.userId,
              branchId: res.user.branchId,
              actingOwnerId: "actingOwnerId" in res.user ? (res.user as { actingOwnerId?: string | null }).actingOwnerId : null,
              sessionId: "sessionId" in res.user ? (res.user as { sessionId?: string }).sessionId : undefined,
            },
          });
          applyingRemote = false;
          return { ok: true };
        } catch (err) {
          if (isTransientClientFailure(err)) {
            return { ok: false, reason: DB_WAIT_MSG };
          }
          const msg = clientErrorMessage(err);
          if (/отключена|заблок/i.test(msg)) {
            return { ok: false, reason: msg };
          }
          if (!isUnauthorizedFailure(err) && !/неверн/i.test(msg)) {
            return { ok: false, reason: msg };
          }
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
            session: {
              userId: res.user.userId,
              branchId: res.user.branchId,
              actingOwnerId: "actingOwnerId" in res.user ? (res.user as { actingOwnerId?: string | null }).actingOwnerId : null,
              sessionId: "sessionId" in res.user ? (res.user as { sessionId?: string }).sessionId : undefined,
            },
          });
          applyingRemote = false;
          return { ok: true };
        } catch (err) {
          if (isTransientClientFailure(err)) {
            return { ok: false, reason: DB_WAIT_MSG };
          }
          const msg = clientErrorMessage(err);
          if (/отключена|заблок/i.test(msg)) {
            return { ok: false, reason: msg };
          }
          if (!isUnauthorizedFailure(err) && !/неверн/i.test(msg)) {
            return { ok: false, reason: msg };
          }
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
        try {
          const res = await api<{ state: Snapshot }>("state/sample", { method: "POST" });
          const next = ensureSampleCredentials(applyIncoming(get(), res.state), USERS, createSeed);
          setToken(null);
          applyingRemote = true;
          set({ ...next, session: null });
          applyingRemote = false;
          return { ok: true as const };
        } catch (err) {
          const reason = clientErrorMessage(err, "Учебные данные не загружены");
          toast.error(reason);
          return { ok: false as const, reason };
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
        void api<{ user?: { userId: string; branchId: string; actingOwnerId?: string | null; sessionId?: string }; state?: Snapshot }>(
          "session/branch",
          { method: "POST", body: { branchId } },
        )
          .then((res) => {
            if (!res.state || !res.user) return;
            applyingRemote = true;
            set({
              ...applyIncoming(get(), res.state),
              session: {
                userId: res.user.userId,
                branchId: res.user.branchId,
                actingOwnerId: res.user.actingOwnerId,
                sessionId: res.user.sessionId,
              },
            });
            applyingRemote = false;
          })
          .catch(() => undefined);
      },

      setOwner: async (ownerId) => {
        const session = get().session;
        if (!session) return;
        try {
          const res = await api<{
            user: { userId: string; branchId: string; actingOwnerId?: string | null; sessionId?: string };
            state: Snapshot;
          }>("session/owner", { method: "POST", body: { ownerId } });
          applyingRemote = true;
          set({
            ...applyIncoming(get(), res.state),
            session: {
              userId: res.user.userId,
              branchId: res.user.branchId,
              actingOwnerId: res.user.actingOwnerId,
              sessionId: res.user.sessionId,
            },
          });
          applyingRemote = false;
        } catch (err) {
          toast.error(clientErrorMessage(err, "Не удалось переключить контур"));
        }
      },

      setPeriod: (period) => set({ period }),

      resetDemo: async () => {
        try {
          useSync.getState().setStatus("saving");
          const res = await api<{ state: Snapshot }>("state/reset", { method: "POST" });
          setToken(null);
          applyingRemote = true;
          set({ ...applyIncoming(get(), res.state), session: null });
          applyingRemote = false;
          useSync.getState().setMeta({
            source: useSync.getState().source ?? "memory",
            updatedAt: new Date().toISOString(),
            sales: 0,
          });
        } catch (err) {
          useSync.getState().setStatus("error");
          toast.error(clientErrorMessage(err, "Сброс недоступен"));
        }
      },

      updateProfile: (patch) => {
        void applyRemote("profile", patch);
      },

      addWriteoff: (input) => {
        void applyRemote("stock/writeoff", input);
      },

      addInvoice: (input) => {
        void applyRemote("stock/receipt", input);
      },

      createRequestFromNeed: () => {
        void applyRemote("procurement/request", {});
      },

      setRequestStatus: (id, status, supplierId) => {
        void applyRemote("procurement/status", { id, status, supplierId });
      },

      openShift: (input) => applyRemote("shifts/open", input),

      closeShift: (input) => applyRemote("shifts/close", input),

      addShiftIncidental: (input) => applyRemote("shifts/incidental", input),

      topUpDebt: (debtId) => {
        void applyRemote("debts/topup", { debtId });
      },

      addLedgerDebt: (input) => {
        void applyRemote("debts/ledger", input);
      },

      payLedgerDebt: (input) => {
        void applyRemote("debts/ledger/pay", input);
      },

      updateLedgerDebt: (input) => {
        void applyRemote("debts/ledger/update", input);
      },

      upsertHouseholdItem: (input) => {
        void applyRemote("household/item", input);
      },

      householdMove: (input) => applyRemote("household/move", input),

      closePeriod: (input) => {
        void applyRemote("period/close", input);
      },

      adjustPayroll: (input) => applyRemote("staff/adjust", input),

      accruePremiums: (input) => applyRemote("staff/premiums", input),

      setPlan: (input) => {
        void applyRemote("plan", input);
      },

      addManualSale: (items, payment) => {
        void applyRemote("sales/manual", { items, payment });
      },

      voidSale: (input: { saleId: string; reason?: string }) => {
        void applyRemote("sales/void", input);
      },

      discountSale: (input: { saleId: string; amount: number; reason?: string }) => {
        void applyRemote("sales/discount", input);
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

      upsertBanquet: (b) => applyRemote("banquets", b),

      deleteBanquet: (id) => applyRemote("banquets/delete", { id }),

      setBanquetStatus: (id, status) => {
        void applyRemote("banquets/status", { id, status });
      },

      completeRevision: (lines, note, photos) => {
        void applyRemote("stock/revision", { lines, note, photos });
      },

      transferStock: (input) => {
        void applyRemote("stock/transfer", input);
      },

      setStopList: (input) => {
        void applyRemote("shifts/stop-list", input);
      },

      addExpense: (input) => applyRemote("expenses", input),

      upsertRecipe: (recipe) => {
        void applyRemote("recipes", recipe);
      },

      createProduct: (input) => applyRemote("nomenclature/product", input),

      importProducts: (rows, csv) => applyRemote("nomenclature/import", csv ? { csv } : { rows }),

      inviteStaff: (input) => applyRemote("staff/invite", input),

      updateStaff: (input) => applyRemote("staff/update", input),

      deleteStaff: (input) => applyRemote("staff/delete", input),

      addBranch: (input) => applyRemote("branches", input),

      updateBranch: (input) => applyRemote("branches/update", input),

      deleteBranch: (input) => applyRemote("branches/delete", input),

      updateSettings: (patch) => {
        void applyRemote("settings/network", patch);
      },

      flushNotify: async () => {
        try {
          const res = await api<{ state: Snapshot }>("notify/flush", { method: "POST" });
          const session = get().session;
          applyingRemote = true;
          set({ ...applyIncoming(get(), res.state), session });
          applyingRemote = false;
        } catch (err) {
          toast.error(clientErrorMessage(err, "Очередь не отправлена"));
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
          toast.error(clientErrorMessage(err, "Не удалось зафиксировать тариф"));
          return false;
        }
      },

      onboardNetwork: async (input) => {
        try {
          await api<{ ok: boolean; pending?: boolean }>("auth/apply", {
            method: "POST",
            body: input,
          });
          return { ok: true as const };
        } catch (err) {
          const reason = clientErrorMessage(err, "Не удалось отправить заявку");
          toast.error(reason);
          return { ok: false as const, reason };
        }
      },

      ensureShowcase: () => applyRemote("state/showcase", {}),

      approveApplication: (input) => applyRemote("admin/applications/approve", input),

      rejectApplication: (input) => applyRemote("admin/applications/reject", input),
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
        let snap = await dbAdapter.load();
        if (cancelled) return;
        const prev = useOps.getState();
        const hadSession = Boolean(prev.session) || Boolean(getToken());
        if (hadSession && snap.users.length === 0) {
          await sleep(1000);
          try {
            snap = await dbAdapter.load();
          } catch (retryErr) {
            if (isUnauthorizedFailure(retryErr)) throw retryErr;
          }
        }
        applyingRemote = true;
        useOps.setState((s) => {
          const incoming = shouldReplaceSnapshot(s, snap) ? snap : snapshotOf(s);
          const merged = applyIncoming(s, incoming);
          return { ...s, ...merged, session: keepStoredSession(s.session, merged) };
        });
        applyingRemote = false;
        const live = useOps.getState();
        try {
          const meta = await getOpsStatus();
          if (!cancelled) {
            useSync.getState().setMeta({
              source: meta.source,
              updatedAt: meta.updatedAt,
              sales: meta.sales || live.sales.length,
            });
            if (meta.ready === false) {
              const health = await fetchStoreHealth().catch(() => null);
              const message = health?.error || DB_WAIT_MSG;
              useSync.getState().setError(message);
              toast.error(message);
            }
          }
        } catch {
          const health = await fetchStoreHealth().catch(() => null);
          if (health && health.store?.ready === false) {
            useSync.getState().setError(health.error || DB_WAIT_MSG);
            toast.error(health.error || DB_WAIT_MSG);
          } else if (hadSession && live.users.length === 0) {
            useSync.getState().setError(DB_WAIT_MSG);
            toast.error(DB_WAIT_MSG);
          } else {
            useSync.getState().setMeta({
              source: "memory",
              updatedAt: new Date().toISOString(),
              sales: live.sales.length,
            });
          }
        }
        if (!cancelled && hadSession && live.users.length === 0 && useSync.getState().status !== "error") {
          useSync.getState().setError(DB_WAIT_MSG);
          toast.error(DB_WAIT_MSG);
        }
      } catch (err) {
        applyingRemote = false;
        if (isUnauthorizedFailure(err)) {
          setToken(null);
          useOps.setState((s) => ({ ...s, session: null }));
          useSync.getState().setError("Сессия истекла");
          toast.error("Сессия истекла");
        } else {
          const msg = clientErrorMessage(err, DB_WAIT_MSG);
          useSync.getState().setError(msg);
          toast.error(msg);
        }
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
