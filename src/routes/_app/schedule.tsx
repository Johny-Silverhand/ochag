import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/schedule")({ component: SchedulePage });

function SchedulePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Этап 2 · каркас"
        title="График смен"
        description="Табель, подмены и выходные. Начисления ФОТ уже считаются при закрытии кассы — график придёт отдельно."
      />
      <Card>
        <Badge>скоро</Badge>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Недельная сетка по филиалу, согласование подмен управляющим. Не путать с открытием кассовой смены этапа 1.
        </p>
      </Card>
    </div>
  );
}
