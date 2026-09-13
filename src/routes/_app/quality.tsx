import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/quality")({ component: QualityPage });

function QualityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Этап 2 · каркас"
        title="Качество"
        description="Журналы ХАССП, температур и претензий. Вне контура этапа 1 — не заполняем чужие техкарты."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Badge>скоро</Badge>
          <h2 className="mt-3 text-lg font-medium">Температурный журнал</h2>
          <p className="mt-2 text-sm text-muted">Холодильники и гриль. Сейчас фиксируем только складские списания.</p>
        </Card>
        <Card>
          <Badge>скоро</Badge>
          <h2 className="mt-3 text-lg font-medium">Претензии зала</h2>
          <p className="mt-2 text-sm text-muted">Связка с чеком кипера — когда появится живой импорт, не раньше.</p>
        </Card>
      </div>
    </div>
  );
}
