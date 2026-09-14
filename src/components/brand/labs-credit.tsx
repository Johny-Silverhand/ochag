import { cn } from "@/lib/utils";
import { VENDOR_LINE, VENDOR_URL, LABS_RIGHTS, LABS_YEAR } from "@/lib/brand";

/** Login + settings footer — not on nav or every screen. */
export function VendorLink({ className }: { className?: string }) {
  return (
    <a
      href={VENDOR_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "font-medium underline-offset-2 transition-colors hover:underline",
        className,
      )}
    >
      {VENDOR_LINE}
    </a>
  );
}

export function LabsCredit({
  className,
  align = "left",
  tone = "muted",
  compact = false,
}: {
  className?: string;
  align?: "center" | "left";
  tone?: "muted" | "sidebar";
  compact?: boolean;
}) {
  const color = tone === "sidebar" ? "text-sidebar-muted" : "text-subtle";
  const linkColor =
    tone === "sidebar"
      ? "text-sidebar-fg hover:text-sidebar-fg"
      : compact
        ? "text-subtle hover:text-fg"
        : "text-fg hover:text-fg";
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", color, className)}>
      <p className="text-[11px] leading-snug tracking-wide">
        <VendorLink className={linkColor} />
      </p>
      {compact ? null : (
        <p className="mt-0.5 text-[10px] tracking-wide opacity-80">
          {LABS_RIGHTS} © {LABS_YEAR}
        </p>
      )}
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
