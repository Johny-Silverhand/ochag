import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { auditActionLabel } from "@/lib/domain/audit-labels";
import type { AuditEntry, Branch, StaffUser } from "@/lib/domain/types";
import { ruDateTime } from "@/lib/format";

export function AuditJournal({
  entries,
  users,
  branches,
  empty,
  limit = 200,
}: {
  entries: AuditEntry[];
  users: StaffUser[];
  branches: Branch[];
  empty: string;
  limit?: number;
}) {
  const rows = entries.slice(0, limit);
  if (rows.length === 0) {
    return (
      <Card>
        <p className="px-1 py-6 text-sm text-muted">{empty}</p>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-border">
        {rows.map((e) => {
          const who = users.find((u) => u.id === e.userId)?.name ?? (e.userId === "system" ? "система" : e.userId);
          const branch = e.branchId ? branches.find((b) => b.id === e.branchId)?.short : "сеть";
          return (
            <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-4">
              <div className="text-xs text-muted">{ruDateTime(e.at)}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{auditActionLabel(e.action)}</Badge>
                  <span className="text-sm font-medium">{who}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{e.detail}</p>
              </div>
              <div className="text-xs text-subtle">{branch}</div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
