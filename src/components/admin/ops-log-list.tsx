import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OPS_EVENT_LABEL, OPS_LEVEL_LABEL } from "@/lib/domain/ops-log";
import type { OpsLogEntry, OpsLogLevel, StaffUser } from "@/lib/domain/types";
import { ruDateTime } from "@/lib/format";

function levelTone(level: OpsLogLevel): "muted" | "warning" | "danger" {
  if (level === "error") return "danger";
  if (level === "warn") return "warning";
  return "muted";
}

export function OpsLogList({
  entries,
  users,
  empty,
}: {
  entries: OpsLogEntry[];
  users: StaffUser[];
  empty: string;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="px-1 py-6 text-sm text-muted">{empty}</p>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-border">
        {entries.map((e) => {
          const who =
            users.find((u) => u.id === e.userId)?.name ?? e.login ?? (e.userId === "system" ? "система" : e.userId ?? "—");
          return (
            <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[9rem_1fr] sm:items-start sm:gap-4">
              <div className="text-xs text-muted">{ruDateTime(e.at)}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={levelTone(e.level)}>{OPS_LEVEL_LABEL[e.level]}</Badge>
                  <span className="text-sm font-medium">{OPS_EVENT_LABEL[e.event]}</span>
                  <span className="text-xs text-subtle">{who}</span>
                </div>
                <p className="mt-1 font-mono text-sm text-muted">{e.detail}</p>
                {e.path ? <p className="mt-0.5 font-mono text-xs text-subtle">{e.path}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
