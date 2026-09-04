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
    <div className={cn("inline-flex rounded-md bg-bg p-1 shadow-(--shadow-border)", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 rounded-sm px-3 text-xs font-medium transition-colors duration-150 md:h-9 md:min-h-0",
            value === o.value ? "bg-elevated text-fg shadow-(--shadow-border)" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
