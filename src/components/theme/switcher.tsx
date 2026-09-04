import { Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePrefs } from "@/lib/prefs";
import { applyThemeChrome, THEMES, themeMeta } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const density = usePrefs((s) => s.density);
  const motion = usePrefs((s) => s.motion);
  const typeScale = usePrefs((s) => s.typeScale);
  const current = themeMeta(theme);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Сменить тему"
          className={cn(
            "flex size-11 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-fg md:size-9",
            className,
          )}
        >
          <span
            className="size-4 rounded-full shadow-(--shadow-border)"
            style={{ background: current.preview.primary }}
          />
          <span className="sr-only">Тема: {current.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="mb-2 flex items-center gap-2 px-0.5">
          <Palette className="size-3.5 text-muted" strokeWidth={1.75} />
          <span className="text-xs font-medium tracking-wide text-muted uppercase">Тема</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {THEMES.map((item) => {
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onPointerDown={() => {
                  applyThemeChrome(item.id, density, motion, typeScale);
                  setTheme(item.id);
                }}
                onClick={() => setTheme(item.id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md p-1.5 text-center transition-colors duration-150",
                  active ? "bg-bg" : "hover:bg-bg/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 overflow-hidden rounded-full shadow-(--shadow-border)",
                    active && "ring-2 ring-ring/60 ring-offset-2 ring-offset-surface",
                  )}
                >
                  <span className="w-2/5" style={{ background: item.preview.sidebar }} />
                  <span className="flex-1" style={{ background: item.preview.bg }} />
                </span>
                <span className="text-[10px] leading-none text-muted">{item.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
