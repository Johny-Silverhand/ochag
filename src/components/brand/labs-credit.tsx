import { cn } from "@/lib/utils";
import { LABS_LINE, LABS_NAME, LABS_RIGHTS, LABS_YEAR } from "@/lib/brand";

export function LabsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
      <path
        d="M9 9h6.2c2.7 0 4.4 1.6 4.4 3.9 0 1.7-1 3-2.6 3.5L21.4 23h-3.2l-4.1-6.2H12V23H9V9Zm3 7.4h2.8c1.4 0 2.2-.7 2.2-1.7s-.8-1.6-2.2-1.6H12v3.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LabsCredit({
  className,
  align = "center",
  tone = "muted",
  compact = false,
}: {
  className?: string;
  align?: "center" | "left";
  tone?: "muted" | "sidebar";
  compact?: boolean;
}) {
  const color = tone === "sidebar" ? "text-sidebar-muted" : "text-subtle";
  return (
    <div
      className={cn(
        "select-none",
        align === "center" ? "text-center" : "text-left",
        color,
        className,
      )}
    >
      <div className={cn("flex items-center gap-2", align === "center" && "justify-center")}>
        <LabsMark className="size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] leading-snug tracking-wide">
            <span className="font-medium">{LABS_LINE}</span>
          </p>
          {compact ? (
            <p className="text-[10px] tracking-wide opacity-80">
              {LABS_RIGHTS} © {LABS_YEAR}
            </p>
          ) : (
            <p className="text-[10px] tracking-wide opacity-80">
              {LABS_RIGHTS} © {LABS_YEAR} · {LABS_NAME}
            </p>
          )}
        </div>
      </div>
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
