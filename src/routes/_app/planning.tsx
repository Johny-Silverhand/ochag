import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/planning")({ component: PlanningPage });

function PlanningPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Этап 2 · каркас"
        title="Планирование"
        description="Закупки впрок, ABC и бюджет vs факт. Здесь только оболочка — логика этапа 2 не подменяется догадками."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["ABC сырья", "Классификация по вкладу в фудкост"],
          ["Бюджет периода", "План выручки и постоянных vs факт"],
          ["Прогноз закупа", "От минимумов и банкетного календаря"],
        ].map(([title, body]) => (
          <Card key={title}>
            <Badge>скоро</Badge>
            <h2 className="mt-3 text-lg font-medium">{title}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
