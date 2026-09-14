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
  return (
    <div className={cn("neu-well flex w-full rounded-2xl bg-bg p-1 sm:inline-flex sm:w-auto", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 min-w-0 flex-1 rounded-xl px-2 text-xs font-medium transition-[color,background-color,transform] duration-200 ease-[var(--ease-out-smooth)] active:scale-[0.98] sm:flex-none sm:px-3 md:h-9 md:min-h-0",
            value === o.value ? "bg-elevated text-fg shadow-(--shadow-border)" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
