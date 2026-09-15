import { cn } from "@/lib/utils";

export function Segmented({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const n = Math.max(1, options.length);
  return (
    <div
      role="tablist"
      className={cn("seg-track neu-well flex w-full rounded-2xl bg-bg p-1 sm:inline-flex sm:w-auto", className)}
    >
      <span
        className="seg-pill"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          transform: `translateX(${idx * 100}%)`,
          left: "0.25rem",
        }}
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 min-h-11 min-w-0 flex-1 rounded-xl px-2 text-xs font-medium transition-colors duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.98] sm:flex-none sm:px-3 md:h-9 md:min-h-0",
            value === o.value ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
