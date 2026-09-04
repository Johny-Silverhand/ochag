import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useOps } from "@/lib/data/store";
import { recipeCost, recipeFoodCostPct } from "@/lib/domain/engine";
import { pct, qty, rub } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_app/recipes")({ component: RecipesPage });

function RecipesPage() {
  const recipes = useOps((s) => s.recipes);
  const products = useOps((s) => s.products);
  const [id, setId] = useState(recipes[0]?.id ?? "");
  const showFoodCost = usePrefs((s) => s.showFoodCost);
  const recipe = recipes.find((r) => r.id === id) ?? recipes[0];
  if (!recipe) return null;
  const cost = recipeCost(recipe, products);
  const fc = recipeFoodCostPct(recipe, products);

  return (
    <div>
      <PageHeader
        eyebrow="Калькуляция"
        title="Техкарты"
        description="Себестоимость блюда считается из закупочных цен. Продажа списывает ингредиенты автоматически."
      />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="p-2">
          <ul>
            {recipes.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setId(r.id)}
                  className={`flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm ${r.id === recipe.id ? "bg-bg font-medium" : "text-muted hover:text-fg"}`}
                >
                  {r.name}
                  <span className="font-mono text-xs tabular-nums">{rub(r.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted">{recipe.category}</div>
              <h2 className="text-xl font-medium tracking-tight">{recipe.name}</h2>
            </div>
            {showFoodCost ? (
              <Badge tone={fc > 32 ? "warning" : "success"}>FC {pct(fc)}</Badge>
            ) : null}
          </div>
          <dl className={`mt-5 grid gap-3 text-sm ${showFoodCost ? "grid-cols-3" : "grid-cols-1"}`}>
            <div className="rounded-md bg-bg p-3">
              <dt className="text-xs text-muted">Цена</dt>
              <dd className="mt-1 font-mono text-lg tabular-nums">{rub(recipe.price)}</dd>
            </div>
            {showFoodCost ? (
              <>
                <div className="rounded-md bg-bg p-3">
                  <dt className="text-xs text-muted">Себестоимость</dt>
                  <dd className="mt-1 font-mono text-lg tabular-nums">{rub(cost, true)}</dd>
                </div>
                <div className="rounded-md bg-bg p-3">
                  <dt className="text-xs text-muted">Маржа</dt>
                  <dd className="mt-1 font-mono text-lg tabular-nums">{rub(recipe.price - cost, true)}</dd>
                </div>
              </>
            ) : null}
          </dl>
          <table className="mt-6 w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Ингредиент</th>
                <th className="pb-2 font-medium">Норма</th>
                {showFoodCost ? <th className="pb-2 text-right font-medium">Сумма</th> : null}
              </tr>
            </thead>
            <tbody>
              {recipe.items.map((it) => {
                const p = products.find((x) => x.id === it.productId);
                return (
                  <tr key={it.productId} className="border-t border-border">
                    <td className="py-2">{p?.name}</td>
                    <td className="py-2 font-mono tabular-nums">{qty(it.qty, p?.unit)}</td>
                    {showFoodCost ? (
                      <td className="py-2 text-right font-mono tabular-nums">{rub((p?.avgCost ?? 0) * it.qty, true)}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
