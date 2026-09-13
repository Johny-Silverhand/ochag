import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  Banquet,
  BanquetStatus,
  ExpenseKind,
  InvoiceLine,
  Period,
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
  applyInvoice,
  applyKeeperSales,
  applyManualSale,
  applyOpenShift,
  applyProfile,
  applyRequestFromNeed,
  applyRequestStatus,
  applyRevision,
  applyStopList,
  applyTransfer,
  applyWriteoff,
} from "../domain/mutations";
import { createSeed } from "./seed";
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
  setRequestStatus: (id: string, status: RequestStatus) => void;
  openShift: (input: { openCash: number; staffIds: string[] }) => void;
  closeShift: (input: { closeCash: number; note?: string }) => void;
  addManualSale: (items: Omit<SaleItem, "costAtSale">[], payment: "cash" | "card" | "qr") => void;
  importKeeperSales: (sales: Omit<Snapshot["sales"][number], "shiftId" | "id" | "number" | "branchId">[]) => number;
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
  } catch {
    const s = useOps.getState();
    const actor = actorOf(s);
    if (!actor) return;
    const next = local(snapshotOf(s), actor);
    useOps.setState({ ...next });
  }
}

function snapshotOf(s: OpsState): Snapshot {
  return {
    branches: s.branches,
    users: s.users,
    products: s.products,
    recipes: s.recipes,
    stock: s.stock,
    movements: s.movements,
    invoices: s.invoices,
    sales: s.sales,
    shifts: s.shifts,
    requests: s.requests,
    banquets: s.banquets,
    expenses: s.expenses,
    payroll: s.payroll,
    revisions: s.revisions,
    stopList: s.stopList,
  };
}

function withSeed(): Omit<
  OpsState,
  | "login"
  | "loginPin"
  | "loginAs"
  | "logout"
  | "setBranch"
  | "setPeriod"
  | "resetDemo"
  | "updateProfile"
  | "addWriteoff"
  | "addInvoice"
  | "createRequestFromNeed"
  | "setRequestStatus"
  | "openShift"
  | "closeShift"
  | "addManualSale"
  | "importKeeperSales"
  | "importKeeperXml"
  | "upsertBanquet"
  | "setBanquetStatus"
  | "completeRevision"
  | "transferStock"
  | "setStopList"
  | "addExpense"
> {
  return { ...createSeed(), session: null, period: "7d" };
}

let applyingRemote = false;
let bootDone = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useOps = create<OpsState>()(
  persist(
    (set, get) => ({
      ...withSeed(),

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
        const session = get().session;
        const snap = await dbAdapter.reset();
        applyingRemote = true;
        set({ ...snap, session });
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

      setRequestStatus: (id, status) => {
        void applyRemote("procurement/status", { id, status }, (snap) => applyRequestStatus(snap, id, status));
      },

      openShift: (input) => {
        void applyRemote("shifts/open", input, (snap, actor) => applyOpenShift(snap, actor, input));
      },

      closeShift: (input) => {
        void applyRemote("shifts/close", input, (snap, actor) => applyCloseShift(snap, actor, input));
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
    }),
    {
      name: "ochag-session-v2",
      version: 2,
      partialize: (s) => ({ session: s.session, period: s.period }),
    },
  ),
);

if (typeof window !== "undefined") {
  useOps.subscribe((state) => {
    if (!bootDone || applyingRemote || !state.branches.length) return;
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
      const api = useOps.persist;
      if (api && !api.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = api.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }
      try {
        const snap = await dbAdapter.load();
        if (cancelled) return;
        applyingRemote = true;
        useOps.setState((s) => ({ ...s, ...snap }));
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
  return useOps((s) => s.branches.find((b) => b.id === s.session?.branchId) ?? s.branches[0]);
}

export function selectSnap(s: OpsState): Snapshot {
  return snapshotOf(s);
}
