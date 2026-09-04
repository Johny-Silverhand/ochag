export const THEME_IDS = ["hearth", "night", "ember", "wine", "slate", "linen", "copper"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  hint: string;
  scheme: "light" | "dark";
  group: "light" | "dark";
  preview: { bg: string; sidebar: string; primary: string; surface: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "hearth",
    label: "Очаг",
    hint: "Кремовый зал и хвойный контур",
    scheme: "light",
    group: "light",
    preview: { bg: "#f3f1ec", sidebar: "#17352b", primary: "#1e4336", surface: "#fcfbf8" },
  },
  {
    id: "wine",
    label: "Вино",
    hint: "Бордо на бумаге меню",
    scheme: "light",
    group: "light",
    preview: { bg: "#f6f1ef", sidebar: "#3d1c20", primary: "#6b2d32", surface: "#fcf8f6" },
  },
  {
    id: "linen",
    label: "Лён",
    hint: "Светлый высокий контраст",
    scheme: "light",
    group: "light",
    preview: { bg: "#f4f1ea", sidebar: "#2a2420", primary: "#2c2a27", surface: "#fbfaf6" },
  },
  {
    id: "copper",
    label: "Медь",
    hint: "Мангал и тёплый латунный акцент",
    scheme: "light",
    group: "light",
    preview: { bg: "#f4efe8", sidebar: "#2c1e14", primary: "#8a5a32", surface: "#fbf7f1" },
  },
  {
    id: "night",
    label: "Ночь",
    hint: "Тёмная смена, спокойный Sage",
    scheme: "dark",
    group: "dark",
    preview: { bg: "#121614", sidebar: "#0d1210", primary: "#8fbfa6", surface: "#1a201d" },
  },
  {
    id: "ember",
    label: "Угли",
    hint: "Тёплый зал после закрытия",
    scheme: "dark",
    group: "dark",
    preview: { bg: "#14110f", sidebar: "#1a1411", primary: "#c46a4a", surface: "#1c1815" },
  },
  {
    id: "slate",
    label: "Сланец",
    hint: "Холодный операционный контур",
    scheme: "dark",
    group: "dark",
    preview: { bg: "#0f1418", sidebar: "#0b1014", primary: "#5b8a8a", surface: "#161c22" },
  },
];

export const DEFAULT_THEME: ThemeId = "hearth";

export const DARK_THEMES: ThemeId[] = THEMES.filter((t) => t.scheme === "dark").map((t) => t.id);

export type Density = "comfortable" | "compact";
export type MotionPref = "system" | "reduce";
export type TypeScale = "normal" | "large";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Paint the document chrome immediately — must not wait for React. */
export function applyThemeChrome(
  theme: string,
  density: string = "comfortable",
  motion: string = "system",
  typeScale: string = "normal",
) {
  if (typeof document === "undefined") return;
  const id = isThemeId(theme) ? theme : DEFAULT_THEME;
  const meta = themeMeta(id);
  const root = document.documentElement;
  root.setAttribute("data-theme", id);
  root.setAttribute("data-density", density === "compact" ? "compact" : "comfortable");
  root.setAttribute("data-motion", motion === "reduce" ? "reduce" : "system");
  root.setAttribute("data-type", typeScale === "large" ? "large" : "normal");
  root.classList.toggle("dark", meta.scheme === "dark");
  root.style.colorScheme = meta.scheme;
  const color = document.querySelector('meta[name="theme-color"]');
  if (color) color.setAttribute("content", meta.preview.sidebar);
}

export const PREFS_STORAGE_KEY = "ochag-prefs-v1";

export function readStoredChrome(): {
  theme: ThemeId;
  density: Density;
  motion: MotionPref;
  typeScale: TypeScale;
} {
  const fallback = {
    theme: DEFAULT_THEME,
    density: "comfortable" as Density,
    motion: "system" as MotionPref,
    typeScale: "normal" as TypeScale,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } & Record<string, unknown>;
    const st: Record<string, unknown> = parsed.state ?? parsed;
    return {
      theme: isThemeId(st.theme) ? st.theme : fallback.theme,
      density: st.density === "compact" ? "compact" : "comfortable",
      motion: st.motion === "reduce" ? "reduce" : "system",
      typeScale: st.typeScale === "large" ? "large" : "normal",
    };
  } catch {
    return fallback;
  }
}

if (typeof document !== "undefined") {
  const boot = readStoredChrome();
  applyThemeChrome(boot.theme, boot.density, boot.motion, boot.typeScale);
}
