import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-[var(--page-pad-y)] flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-xs font-medium tracking-[0.16em] text-muted uppercase">{eyebrow}</div>
        ) : null}
        <h1 className="page-title font-medium tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-pretty text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-surface p-card shadow-(--shadow-border)">
      <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      <div
        className={cn(
          "mt-2 font-mono text-[length:var(--kpi-value)] tabular-nums tracking-tight",
          tone === "good" && "text-success",
          tone === "bad" && "text-danger",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-subtle">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong px-5 py-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
