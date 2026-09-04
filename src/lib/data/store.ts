import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  Banquet,
  BanquetStatus,
  InvoiceLine,
  Period,
  PurchaseLine,
  RequestStatus,
  RevisionLine,
  SaleItem,
  Snapshot,
  WriteoffReason,
} from "../domain/types";
import { TODAY, type Session } from "../domain/types";
import {
  applyMovement,
  deductSaleFromStock,
  needToBuy,
  openShiftFor,
  payrollForShift,
  shiftTotals,
} from "../domain/engine";
import { createSeed } from "./seed";
import { dbAdapter } from "./adapter";
import { getOpsStatus } from "@/lib/data/ops";
import { useSync } from "./sync";
import { uid } from "../utils";

export type BranchFilter = string | "all";

interface OpsState extends Snapshot {
  session: Session | null;
  period: Period;
  login: (email: string, password: string) => boolean;
  loginAs: (email: string) => boolean;
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
  addManualSale: (items: SaleItem[], payment: "cash" | "card" | "qr") => void;
  importKeeperSales: (sales: Omit<Snapshot["sales"][number], "shiftId" | "id" | "number" | "branchId">[]) => number;
  upsertBanquet: (b: Banquet) => void;
  setBanquetStatus: (id: string, status: BanquetStatus) => void;
  completeRevision: (lines: RevisionLine[], note?: string) => void;
}

function writeBranch(s: { session: Session | null; branches: Snapshot["branches"] }) {
  const id = s.session?.branchId;
  if (!id || id === "all") return s.branches[0]?.id ?? "br-pushkin";
  return id;
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
  };
}

function withSeed(): Omit<
  OpsState,
  | "login"
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
  | "upsertBanquet"
  | "setBanquetStatus"
  | "completeRevision"
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

      login: (email, password) => {
        const user = get().users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        );
        if (!user) return false;
        const branchId = user.branchId ?? "all";
        set({ session: { userId: user.id, branchId } });
        return true;
      },

      loginAs: (email) => {
        const user = get().users.find((u) => u.email === email);
        if (!user) return false;
        const branchId = user.branchId ?? "all";
        set({ session: { userId: user.id, branchId } });
        return true;
      },

      logout: () => set({ session: null }),

      setBranch: (branchId) => {
        const session = get().session;
        if (!session) return;
        set({ session: { ...session, branchId } });
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
          source: useSync.getState().source ?? "pglite",
          updatedAt: new Date().toISOString(),
          sales: snap.sales.length,
        });
      },

      updateProfile: (patch) => {
        const session = get().session;
        if (!session) return;
        set((s) => ({
          users: s.users.map((u) => (u.id === session.userId ? { ...u, ...patch } : u)),
        }));
      },

      addWriteoff: ({ productId, qty, reason, note }) => {
        const { session, products } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        const product = products.find((p) => p.id === productId);
        const q = -Math.abs(qty);
        const mov = {
          id: uid("wo"),
          at: new Date().toISOString(),
          branchId,
          productId,
          type: "writeoff" as const,
          qty: q,
          cost: Math.abs(q) * (product?.avgCost ?? 0),
          reason,
          note,
          userId: session.userId,
        };
        set((s) => ({
          movements: [mov, ...s.movements],
          stock: applyMovement(s.stock, mov),
        }));
      },

      addInvoice: ({ supplier, number, date, lines }) => {
        const { session } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
        const inv = {
          id: uid("inv"),
          number,
          branchId,
          supplier,
          date,
          lines,
          total,
          userId: session.userId,
        };
        const movs = lines.map((l) => ({
          id: uid("m"),
          at: `${date}T10:00:00.000Z`,
          branchId,
          productId: l.productId,
          type: "receipt" as const,
          qty: l.qty,
          cost: l.qty * l.price,
          refId: inv.id,
          userId: session.userId,
          note: supplier,
        }));
        set((s) => {
          let stock = s.stock;
          for (const m of movs) stock = applyMovement(stock, m);
          const productsNext = s.products.map((p) => {
            const line = lines.find((l) => l.productId === p.id);
            if (!line) return p;
            return { ...p, avgCost: Math.round((p.avgCost * 0.6 + line.price * 0.4) * 100) / 100 };
          });
          return {
            invoices: [inv, ...s.invoices],
            movements: [...movs, ...s.movements],
            stock,
            products: productsNext,
          };
        });
      },

      createRequestFromNeed: () => {
        const { session } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        const need = needToBuy(snapshotOf(get()), branchId);
        if (need.length === 0) return;
        const lines: PurchaseLine[] = need.map((n) => ({
          productId: n.product.id,
          qty: Math.ceil(n.deficit * 10) / 10,
        }));
        set((s) => ({
          requests: [
            {
              id: uid("pr"),
              number: `ЗК-${100 + s.requests.length + 1}`,
              branchId,
              date: TODAY,
              status: "draft",
              lines,
              userId: session.userId,
            },
            ...s.requests,
          ],
        }));
      },

      setRequestStatus: (id, status) => {
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        }));
      },

      openShift: ({ openCash, staffIds }) => {
        const { session, shifts } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        if (openShiftFor(shifts, branchId)) return;
        set((s) => ({
          shifts: [
            {
              id: uid("sh"),
              branchId,
              date: TODAY,
              status: "open",
              openedAt: new Date().toISOString(),
              openedBy: session.userId,
              openCash,
              cashTotal: 0,
              cardTotal: 0,
              qrTotal: 0,
              staffIds,
            },
            ...s.shifts,
          ],
        }));
      },

      closeShift: ({ closeCash, note }) => {
        const { session } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        const shift = openShiftFor(get().shifts, branchId);
        if (!shift) return;
        const totals = shiftTotals(shift, get().sales);
        const discrepancy = Math.round(closeCash - totals.expected);
        const pays = payrollForShift(shift, get().sales, get().users);
        set((s) => ({
          shifts: s.shifts.map((sh) =>
            sh.id === shift.id
              ? {
                  ...sh,
                  status: "closed" as const,
                  closedAt: new Date().toISOString(),
                  closedBy: session.userId,
                  closeCash,
                  expectedCash: totals.expected,
                  discrepancy,
                  cashTotal: totals.cash,
                  cardTotal: totals.card,
                  qrTotal: totals.qr,
                  note,
                }
              : sh,
          ),
          payroll: [
            ...pays.map((p) => ({
              id: uid("pay"),
              userId: p.userId,
              branchId,
              date: TODAY,
              shiftId: shift.id,
              hours: p.hours,
              base: p.base,
              bonus: p.bonus,
              total: p.total,
            })),
            ...s.payroll,
          ],
        }));
      },

      addManualSale: (items, payment) => {
        const { session, shifts, sales, recipes, products, stock } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        const shift = openShiftFor(shifts, branchId);
        if (!shift) return;
        const total = items.reduce((sum, i) => sum + i.sum, 0);
        const sale = {
          id: uid("sale"),
          number: `ЧК-${String(10000 + sales.length + 1).padStart(4, "0")}`,
          branchId,
          shiftId: shift.id,
          at: new Date().toISOString(),
          items,
          payments: [{ type: payment, amount: total }],
          total,
          waiterId: session.userId,
          source: "manual" as const,
        };
        const deducted = deductSaleFromStock(stock, sale, recipes, products, session.userId);
        set((s) => ({
          sales: [sale, ...s.sales],
          stock: deducted.stock,
          movements: [...deducted.movements, ...s.movements],
        }));
      },

      importKeeperSales: (incoming) => {
        const { session, shifts, recipes, products } = get();
        if (!session) return 0;
        const branchId = writeBranch(get());
        const shift = openShiftFor(shifts, branchId);
        if (!shift) return 0;
        let added = 0;
        set((s) => {
          let stock = s.stock;
          const movs = [];
          const newSales = [];
          for (const row of incoming) {
            const sale = {
              ...row,
              id: uid("sale"),
              number: `КПР-${String(s.sales.length + added + 1).padStart(4, "0")}`,
              shiftId: shift.id,
              branchId,
              source: "keeper" as const,
            };
            const d = deductSaleFromStock(stock, sale, recipes, products, session.userId);
            stock = d.stock;
            movs.push(...d.movements);
            newSales.push(sale);
            added += 1;
          }
          return {
            sales: [...newSales, ...s.sales],
            stock,
            movements: [...movs, ...s.movements],
          };
        });
        return added;
      },

      upsertBanquet: (b) => {
        set((s) => {
          const i = s.banquets.findIndex((x) => x.id === b.id);
          if (i < 0) return { banquets: [b, ...s.banquets] };
          const next = s.banquets.slice();
          next[i] = b;
          return { banquets: next };
        });
      },

      setBanquetStatus: (id, status) => {
        set((s) => ({
          banquets: s.banquets.map((b) => (b.id === id ? { ...b, status } : b)),
        }));
      },

      completeRevision: (lines, note) => {
        const { session, products } = get();
        if (!session) return;
        const branchId = writeBranch(get());
        const movs = lines
          .filter((l) => l.factQty !== l.bookQty)
          .map((l) => {
            const p = products.find((x) => x.id === l.productId);
            const qty = l.factQty - l.bookQty;
            return {
              id: uid("rev"),
              at: new Date().toISOString(),
              branchId,
              productId: l.productId,
              type: "revision" as const,
              qty,
              cost: Math.abs(qty) * (p?.avgCost ?? 0),
              reason: "revision" as const,
              note,
              userId: session.userId,
            };
          });
        set((s) => {
          let stock = s.stock;
          for (const m of movs) stock = applyMovement(stock, m);
          return {
            stock,
            movements: [...movs, ...s.movements],
            revisions: [
              {
                id: uid("r"),
                branchId,
                date: TODAY,
                status: "done" as const,
                lines,
                userId: session.userId,
                note,
              },
              ...s.revisions,
            ],
          };
        });
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
            source: useSync.getState().source ?? "pglite",
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
            source: "pglite",
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
