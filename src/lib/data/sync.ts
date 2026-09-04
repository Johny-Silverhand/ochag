import { create } from "zustand";

export type SyncState = "loading" | "ok" | "saving" | "error";
export type DbSource = "neon" | "pglite";

interface SyncStore {
  status: SyncState;
  source: DbSource | null;
  updatedAt: string | null;
  sales: number;
  error: string | null;
  setStatus: (status: SyncState) => void;
  setMeta: (meta: { source: DbSource; updatedAt: string | null; sales: number }) => void;
  setError: (message: string) => void;
}

export const useSync = create<SyncStore>((set) => ({
  status: "loading",
  source: null,
  updatedAt: null,
  sales: 0,
  error: null,
  setStatus: (status) => set({ status, error: null }),
  setMeta: (meta) => set({ ...meta, status: "ok", error: null }),
  setError: (error) => set({ status: "error", error }),
}));
