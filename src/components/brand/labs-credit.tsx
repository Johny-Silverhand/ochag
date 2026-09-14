import { cn } from "@/lib/utils";
import { VENDOR_LINE, LABS_RIGHTS, LABS_YEAR } from "@/lib/brand";

/** Settings footer only — not on login, nav, or every screen. */
export function LabsCredit({
  className,
  align = "left",
  tone = "muted",
}: {
  className?: string;
  align?: "center" | "left";
  tone?: "muted" | "sidebar";
}) {
  const color = tone === "sidebar" ? "text-sidebar-muted" : "text-subtle";
  return (
    <div className={cn("select-none", align === "center" ? "text-center" : "text-left", color, className)}>
      <p className="text-[11px] leading-snug tracking-wide">
        <span className="font-medium text-fg">{VENDOR_LINE}</span>
      </p>
      <p className="mt-0.5 text-[10px] tracking-wide opacity-80">
        {LABS_RIGHTS} © {LABS_YEAR}
      </p>
    </div>
  );
}

export function LabsFooter({
  className,
  tone = "muted",
}: {
  className?: string;
  tone?: "muted" | "sidebar";
}) {
  const border = tone === "sidebar" ? "border-sidebar-fg/10" : "border-border";
  return (
    <div className={cn("border-t pt-5", border, className)}>
      <LabsCredit tone={tone} />
    </div>
  );
}
