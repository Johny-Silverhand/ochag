import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-border-strong transition-[background-color,opacity] duration-200 ease-[var(--ease-out-smooth)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40 data-[state=checked]:bg-primary",
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="block size-6 translate-x-0.5 rounded-full bg-elevated shadow-(--shadow-border) transition-transform duration-200 ease-[var(--ease-ios)] data-[state=checked]:translate-x-[1.375rem]" />
    </SwitchPrimitive.Root>
  );
}
