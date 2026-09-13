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
  applyExpense,
  applyImportProducts,
  applyInviteStaff,
  applyInvoice,
  applyKeeperSales,
  applyManualSale,
  applyOnboard,
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
  applyUpsertRecipe,
  applyWriteoff,
} from "../domain/mutations";
import { emptySnapshot, isOnboarded } from "./empty";
import { normalizeSnapshot } from "./normalize";
import { dbAdapter } from "./adapter";
import { getOpsStatus } from "@/lib/data/ops";
import { useSync } from "./sync";
import { api, setToken } from "../api/client";
import { mapKeeperReceipts } from "../integrations/keeper";
import { parseKeeperXml } from "../integrations/keeper-xml";

export type BranchFilter = string | "all";

interface OpsState extends Snapshot {
  session: Session | null;
  period: Period;
  login: (email: string, password: string) => Promise<boolean>;
  loginPin: (email: string, pin: string) => Promise<boolean>;
  loginAs: (email: string) => Promise<boolean>;
  onboard: (input: {
    ownerName: string;
    login: string;
    password: string;
    pin: string;
    branchName: string;
    city: string;
    address: string;
  }) => Promise<void>;
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
  ) => number;
  importKeeperXml: (xml: string) => void;
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
  }) => void;
  updateSettings: (patch: Partial<Snapshot["settings"]>) => void;
  flushNotify: () => Promise<void>;
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
    useOps.setState((s) => ({ ...s, ...res.state, session: session ?? s.session }));
    applyingRemote = false;
  } catch (err) {
    const s = useOps.getState();
    const actor = actorOf(s);
    if (!actor) {
      toast.error(err instanceof Error ? err.message : "Нужен вход");
      return;
    }
    try {
      const next = local(snapshotOf(s), actor);
      useOps.setState({ ...next });
    } catch (localErr) {
      toast.error(localErr instanceof Error ? localErr.message : err instanceof Error ? err.message : "Операция отклонена");
    }
  }
}

function snapshotOf(s: OpsState | Snapshot): Snapshot {
  return normalizeSnapshot(s);
}

const ACTION_KEYS = [
  "login",
  "loginPin",
  "loginAs",
  "onboard",
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
  "addManualSale",
  "importKeeperSales",
  "importKeeperXml",
  "upsertBanquet",
  "setBanquetStatus",
  "completeRevision",
  "transferStock",
  "setStopList",
  "addExpense",
  "upsertRecipe",
  "importProducts",
  "inviteStaff",
  "updateSettings",
  "flushNotify",
] as const;

function withEmpty(): Omit<OpsState, (typeof ACTION_KEYS)[number]> {
  return { ...emptySnapshot(), session: null, period: "7d" };
}

let applyingRemote = false;
let bootDone = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

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
          set({ ...res.state, session: { userId: res.user.userId, branchId: res.user.branchId } });
          applyingRemote = false;
          return true;
        } catch {
          const user = get().users.find(
            (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
          );
          if (!user) return false;
          set({ session: { userId: user.id, branchId: user.branchId ?? "all" } });
          return true;
        }
      },

      loginPin: async (email, pin) => {
        try {
          const res = await api<{ user: { userId: string; branchId: string }; state: Snapshot }>("auth/pin", {
            method: "POST",
            body: { login: email, pin },
          });
          applyingRemote = true;
          set({ ...res.state, session: { userId: res.user.userId, branchId: res.user.branchId } });
          applyingRemote = false;
          return true;
        } catch {
          const user = get().users.find(
            (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.pin === pin,
          );
          if (!user) return false;
          set({ session: { userId: user.id, branchId: user.branchId ?? "all" } });
          return true;
        }
      },

      loginAs: async (email) => get().login(email, "ochag"),

      onboard: async (input) => {
        try {
          const res = await api<{ user: { userId: string; branchId: string }; state: Snapshot }>("auth/onboard", {
            method: "POST",
            body: input,
          });
          applyingRemote = true;
          set({ ...res.state, session: { userId: res.user.userId, branchId: res.user.branchId } });
          applyingRemote = false;
        } catch (err) {
          try {
            const next = applyOnboard(snapshotOf(get()), input);
            const owner = next.users[0]!;
            applyingRemote = true;
            set({ ...next, session: { userId: owner.id, branchId: next.branches[0]?.id ?? "all" } });
            applyingRemote = false;
            void dbAdapter.save(next);
          } catch (localErr) {
            throw localErr instanceof Error ? localErr : err;
          }
        }
      },

      loadSample: async () => {
        try {
          const res = await api<{ state: Snapshot }>("state/sample", { method: "POST" });
          setToken(null);
          applyingRemote = true;
          set({ ...res.state, session: null });
          applyingRemote = false;
        } catch {
          const snap = await dbAdapter.loadSample();
          setToken(null);
          applyingRemote = true;
          set({ ...snap, session: null });
          applyingRemote = false;
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

      importKeeperSales: (incoming) => {
        void applyRemote("sales/import", { sales: incoming }, (snap, actor) => applyKeeperSales(snap, actor, incoming).snap);
        return incoming.length;
      },

      importKeeperXml: (xml) => {
        void applyRemote("sales/keeper-xml", { xml }, (snap, actor) => {
          const mapped = mapKeeperReceipts(parseKeeperXml(xml), snap.recipes, actor.userId);
          return applyKeeperSales(snap, actor, mapped).snap;
        });
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

      inviteStaff: (input) => {
        void applyRemote("staff/invite", input, (snap, actor) => applyInviteStaff(snap, actor, input));
      },

      updateSettings: (patch) => {
        void applyRemote("settings/network", patch, (snap, actor) => applySettings(snap, actor, patch));
      },

      flushNotify: async () => {
        try {
          const res = await api<{ state: Snapshot }>("notify/flush", { method: "POST" });
          const session = get().session;
          applyingRemote = true;
          set({ ...res.state, session });
          applyingRemote = false;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Очередь не отправлена");
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
    useSync.getState().setStatus("saving");
    window.clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void dbAdapter
        .save(snapshotOf(state))
        .then(() => {
          useSync.getState().setMeta({
            source: useSync.getState().source ?? "memory",
            updatedAt: new Date().toISOString(),
            sales: state.sales.length,
          });
        })
        .catch((err: unknown) => {
          useSync.getState().setError(err instanceof Error ? err.message : "Не удалось записать");
        });
    }, 500);
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
          const session =
            s.session && snap.users.some((u) => u.id === s.session?.userId) ? s.session : null;
          return { ...s, ...snap, session };
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
