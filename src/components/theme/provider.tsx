import { useLayoutEffect, type ReactNode } from "react";
import { usePrefs } from "@/lib/prefs";
import { applyThemeChrome, DARK_THEMES, PREFS_STORAGE_KEY } from "@/lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = usePrefs((s) => s.theme);
  const density = usePrefs((s) => s.density);
  const motion = usePrefs((s) => s.motion);
  const typeScale = usePrefs((s) => s.typeScale);

  useLayoutEffect(() => {
    applyThemeChrome(theme, density, motion, typeScale);
  }, [theme, density, motion, typeScale]);

  return children;
}

const DARK_LIST = DARK_THEMES.map((id) => `"${id}"`).join(",");

export const THEME_BOOT_SCRIPT = `(function(){try{var raw=localStorage.getItem("${PREFS_STORAGE_KEY}");var t="hearth";var d="comfortable";var m="system";var s="normal";if(raw){var p=JSON.parse(raw);var st=p.state||p;if(st.theme)t=st.theme;if(st.density)d=st.density;if(st.motion)m=st.motion;if(st.typeScale)s=st.typeScale;}var el=document.documentElement;el.setAttribute("data-theme",t);el.setAttribute("data-density",d);el.setAttribute("data-motion",m);el.setAttribute("data-type",s);var dark=[${DARK_LIST}].indexOf(t)>=0;el.classList.toggle("dark",dark);el.style.colorScheme=dark?"dark":"light";}catch(e){document.documentElement.setAttribute("data-theme","hearth");}})();`;
