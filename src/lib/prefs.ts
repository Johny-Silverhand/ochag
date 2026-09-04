import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyThemeChrome,
  DEFAULT_THEME,
  isThemeId,
  PREFS_STORAGE_KEY,
  readStoredChrome,
  type Density,
  type MotionPref,
  type ThemeId,
  type TypeScale,
} from "./theme";
import type { Period, WriteoffReason } from "./domain/types";
import { INSTALL_DIR_DEFAULT } from "./brand";

const WRITEOFF_REASONS: WriteoffReason[] = ["spoilage", "staff_meal", "error", "theft", "revision"];

function isWriteoffReason(value: unknown): value is WriteoffReason {
  return typeof value === "string" && WRITEOFF_REASONS.includes(value as WriteoffReason);
}

export type { Density, MotionPref, TypeScale };

export interface InstallConfig {
  path: string;
  desktopShortcut: boolean;
  startMenu: boolean;
  autoStart: boolean;
  sampleData: boolean;
  banquetModule: boolean;
}

export const DEFAULT_INSTALL: InstallConfig = {
  path: INSTALL_DIR_DEFAULT,
  desktopShortcut: true,
  startMenu: true,
  autoStart: false,
  sampleData: true,
  banquetModule: true,
};

export interface PrefsState {
  theme: ThemeId;
  density: Density;
  motion: MotionPref;
  typeScale: TypeScale;
  notifyStock: boolean;
  notifyShift: boolean;
  notifyBanquet: boolean;
  notifyPayroll: boolean;
  notifyWriteoff: boolean;
  notifySound: boolean;
  defaultPeriod: Period;
  kitchenPinLowStock: boolean;
  showFoodCost: boolean;
  defaultWriteoffReason: WriteoffReason;
  waiterOwnSalesOnly: boolean;
  requireWriteoffNote: boolean;
  showAdvisor: boolean;
  setupComplete: boolean;
  install: InstallConfig;
  setTheme: (theme: ThemeId) => void;
  setDensity: (density: Density) => void;
  setMotion: (motion: MotionPref) => void;
  setTypeScale: (typeScale: TypeScale) => void;
  setNotify: (
    key:
      | "notifyStock"
      | "notifyShift"
      | "notifyBanquet"
      | "notifyPayroll"
      | "notifyWriteoff"
      | "notifySound",
    value: boolean,
  ) => void;
  setDefaultPeriod: (period: Period) => void;
  setKitchenPinLowStock: (value: boolean) => void;
  setShowFoodCost: (value: boolean) => void;
  setDefaultWriteoffReason: (value: WriteoffReason) => void;
  setWaiterOwnSalesOnly: (value: boolean) => void;
  setRequireWriteoffNote: (value: boolean) => void;
  setShowAdvisor: (value: boolean) => void;
  completeSetup: (install: InstallConfig) => void;
  resetSetup: () => void;
}

function paint(state: Pick<PrefsState, "theme" | "density" | "motion" | "typeScale">) {
  applyThemeChrome(state.theme, state.density, state.motion, state.typeScale);
}

const stored = readStoredChrome();

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: stored.theme,
      density: stored.density,
      motion: stored.motion,
      typeScale: stored.typeScale,
      notifyStock: true,
      notifyShift: true,
      notifyBanquet: true,
      notifyPayroll: true,
      notifyWriteoff: true,
      notifySound: false,
      defaultPeriod: "7d",
      kitchenPinLowStock: true,
      showFoodCost: true,
      defaultWriteoffReason: "spoilage",
      waiterOwnSalesOnly: true,
      requireWriteoffNote: false,
      showAdvisor: true,
      setupComplete: false,
      install: DEFAULT_INSTALL,
      setTheme: (theme) => {
        set({ theme });
        paint(get());
      },
      setDensity: (density) => {
        set({ density });
        paint(get());
      },
      setMotion: (motion) => {
        set({ motion });
        paint(get());
      },
      setTypeScale: (typeScale) => {
        set({ typeScale });
        paint(get());
      },
      setNotify: (key, value) => set({ [key]: value }),
      setDefaultPeriod: (defaultPeriod) => set({ defaultPeriod }),
      setKitchenPinLowStock: (kitchenPinLowStock) => set({ kitchenPinLowStock }),
      setShowFoodCost: (showFoodCost) => set({ showFoodCost }),
      setDefaultWriteoffReason: (defaultWriteoffReason) => set({ defaultWriteoffReason }),
      setWaiterOwnSalesOnly: (waiterOwnSalesOnly) => set({ waiterOwnSalesOnly }),
      setRequireWriteoffNote: (requireWriteoffNote) => set({ requireWriteoffNote }),
      setShowAdvisor: (showAdvisor) => set({ showAdvisor }),
      completeSetup: (install) => set({ setupComplete: true, install }),
      resetSetup: () => set({ setupComplete: false, install: DEFAULT_INSTALL }),
    }),
    {
      name: PREFS_STORAGE_KEY,
      version: 4,
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        motion: s.motion,
        typeScale: s.typeScale,
        notifyStock: s.notifyStock,
        notifyShift: s.notifyShift,
        notifyBanquet: s.notifyBanquet,
        notifyPayroll: s.notifyPayroll,
        notifyWriteoff: s.notifyWriteoff,
        notifySound: s.notifySound,
        defaultPeriod: s.defaultPeriod,
        kitchenPinLowStock: s.kitchenPinLowStock,
        showFoodCost: s.showFoodCost,
        defaultWriteoffReason: s.defaultWriteoffReason,
        waiterOwnSalesOnly: s.waiterOwnSalesOnly,
        requireWriteoffNote: s.requireWriteoffNote,
        showAdvisor: s.showAdvisor,
        setupComplete: s.setupComplete,
        install: s.install,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PrefsState>;
        const next = {
          ...current,
          ...p,
          theme: isThemeId(p.theme) ? p.theme : current.theme,
          density: p.density === "compact" ? ("compact" as const) : current.density,
          motion: p.motion === "reduce" ? ("reduce" as const) : current.motion,
          typeScale: p.typeScale === "large" ? ("large" as const) : current.typeScale,
          defaultWriteoffReason: isWriteoffReason(p.defaultWriteoffReason)
            ? p.defaultWriteoffReason
            : current.defaultWriteoffReason,
          install: { ...DEFAULT_INSTALL, ...(p.install ?? {}) },
          setupComplete: Boolean(p.setupComplete),
        };
        return next;
      },
      onRehydrateStorage: () => (state) => {
        if (state) paint(state);
      },
    },
  ),
);
