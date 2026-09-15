import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { useOps, useSessionUser } from "@/lib/data/store";
import { recipeCost, recipeFoodCostPct } from "@/lib/domain/engine";
import { canEditNomenclature } from "@/lib/domain/permissions";
import { isWriteScope } from "@/lib/ui/scope";
import type { Recipe, RecipeItem, Unit } from "@/lib/domain/types";
import { pct, qty, rub } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { uid } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { downloadBase64 } from "@/lib/reports/download";

export const Route = createFileRoute("/_app/recipes")({ component: RecipesPage });

function RecipesPage() {
  const recipes = useOps((s) => s.recipes);
  const products = useOps((s) => s.products);
  const stock = useOps((s) => s.stock);
  const session = useOps((s) => s.session)!;
  const user = useSessionUser()!;
  const upsertRecipe = useOps((s) => s.upsertRecipe);
  const [id, setId] = useState(recipes[0]?.id ?? "");
  const [sheet, setSheet] = useState("items");
  const showFoodCost = usePrefs((s) => s.showFoodCost);
  const recipe = recipes.find((r) => r.id === id) ?? recipes[0];
  const branchId = isWriteScope(session.branchId) ? session.branchId : undefined;
  const cost = recipe ? recipeCost(recipe, products, stock, branchId) : 0;
  const fc = recipe ? recipeFoodCostPct(recipe, products, stock, branchId) : 0;
  const canEdit = canEditNomenclature(user.role);

  return (
    <div>
      <PageHeader
        eyebrow="Калькуляция"
        title="Техкарты"
        description="Себестоимость блюда считается из закупочных цен филиала. Продажа списывает ингредиенты автоматически."
        actions={
          canEdit ? (
            <RecipeEditor
              products={products}
              onSave={(next) => {
                upsertRecipe(next);
                setId(next.id);
                toast.success("Техкарта сохранена, фудкост пересчитан");
              }}
            />
          ) : null
        }
      />
      {!recipes.length ? (
        <Card>
          <p className="text-sm text-muted">Техкарт нет. Создайте первую.</p>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <Card className="p-2">
            <ul>
              {recipes.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setId(r.id)}
                    className={`flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm ${r.id === recipe?.id ? "bg-bg font-medium" : "text-muted hover:text-fg"}`}
                  >
                    {r.name}
                    <span className="font-mono text-xs tabular-nums">{rub(r.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {recipe ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted">{recipe.category}</div>
                  <h2 className="text-xl font-medium tracking-tight">{recipe.name}</h2>
                </div>
                <div className="flex gap-2">
                  {showFoodCost ? <Badge tone={fc > 32 ? "warning" : "success"}>FC {pct(fc)}</Badge> : null}
                  {canEdit ? (
                    <RecipeEditor
                      products={products}
                      initial={recipe}
                      onSave={(next) => {
                        upsertRecipe(next);
                        setId(next.id);
                        toast.success("Техкарта обновлена");
                      }}
                    />
                  ) : null}
                </div>
              </div>
              <Segmented
                className="mt-4"
                value={sheet}
                onChange={setSheet}
                options={[
                  { value: "items", label: "Состав" },
                  { value: "ttk", label: "ТТК" },
                ]}
              />
              {sheet === "items" ? (
                <>
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
                        <td className="py-2 font-mono tabular-nums">{qty(it.qty, p?.unit as Unit | undefined)}</td>
                        {showFoodCost ? (
                          <td className="py-2 text-right font-mono tabular-nums">{rub((p?.avgCost ?? 0) * it.qty, true)}</td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                </>
              ) : (
                <div className="mt-5 space-y-3">
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md bg-bg p-3">
                      <dt className="text-xs text-muted">Выход</dt>
                      <dd className="mt-1 font-mono tabular-nums">
                        {recipe.yieldPortions} порц.
                        {recipe.outputGrams ? ` · ${recipe.outputGrams} г` : ""}
                      </dd>
                    </div>
                    <div className="rounded-md bg-bg p-3">
                      <dt className="text-xs text-muted">Срок реализации</dt>
                      <dd className="mt-1 font-mono tabular-nums">
                        {recipe.shelfLifeHours ? `${recipe.shelfLifeHours} ч` : "не задан"}
                      </dd>
                    </div>
                    <div className="rounded-md bg-bg p-3">
                      <dt className="text-xs text-muted">Печать</dt>
                      <dd className="mt-1">
                        <button
                          type="button"
                          className="text-sm underline-offset-2 hover:underline"
                          onClick={() => {
                            void api<{ filename: string; base64?: string; mime?: string; error?: string }>(
                              `reports/pdf?kind=ttk&id=${recipe.id}`,
                              { method: "GET" },
                            )
                              .then((r) => {
                                if (!r.base64 || !r.mime) {
                                  toast.error(r.error ?? "PDF не собран");
                                  return;
                                }
                                downloadBase64(r.filename, r.base64, r.mime);
                              })
                              .catch((err) => toast.error(err instanceof Error ? err.message : "PDF недоступен"));
                          }}
                        >
                          Скачать ТТК PDF
                        </button>
                      </dd>
                    </div>
                  </dl>
                  <p className="text-sm leading-relaxed text-muted whitespace-pre-wrap">
                    {recipe.techProcess?.trim() ||
                      "Технология не заполнена. Откройте правку и добавьте порядок работ — это необязательное поле ТТК."}
                  </p>
                </div>
              )}
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RecipeEditor({
  products,
  initial,
  onSave,
}: {
  products: { id: string; name: string; unit: string }[];
  initial?: Recipe;
  onSave: (recipe: Recipe) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Мангал");
  const [price, setPrice] = useState(String(initial?.price ?? 690));
  const [yieldPortions, setYield] = useState(String(initial?.yieldPortions ?? 1));
  const [items, setItems] = useState<RecipeItem[]>(initial?.items ?? []);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qtyV, setQty] = useState("0.3");
  const [techProcess, setTechProcess] = useState(initial?.techProcess ?? "");
  const [outputGrams, setOutputGrams] = useState(String(initial?.outputGrams ?? ""));
  const [shelfLifeHours, setShelfLifeHours] = useState(String(initial?.shelfLifeHours ?? ""));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && initial) {
          setName(initial.name);
          setCategory(initial.category);
          setPrice(String(initial.price));
          setYield(String(initial.yieldPortions));
          setItems(initial.items);
          setTechProcess(initial.techProcess ?? "");
          setOutputGrams(String(initial.outputGrams ?? ""));
          setShelfLifeHours(String(initial.shelfLifeHours ?? ""));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={initial ? "secondary" : "default"}>{initial ? "Править" : "Новая техкарта"}</Button>
      </DialogTrigger>
      <DialogContent title={initial ? "Правка техкарты" : "Новая техкарта"}>
        <div className="space-y-3">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Категория">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <Field label="Цена">
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Выход, порц.">
              <Input value={yieldPortions} onChange={(e) => setYield(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Выход, г (необяз.)">
              <Input value={outputGrams} onChange={(e) => setOutputGrams(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Срок, ч (необяз.)">
              <Input value={shelfLifeHours} onChange={(e) => setShelfLifeHours(e.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <Field label="Технология (необяз.)">
            <Textarea value={techProcess} onChange={(e) => setTechProcess(e.target.value)} rows={4} />
          </Field>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <NativeSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
            <Input value={qtyV} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              if (!productId) return;
              setItems((prev) => [...prev.filter((i) => i.productId !== productId), { productId, qty: Number(qtyV) || 0 }]);
            }}
          >
            Добавить ингредиент
          </Button>
          <ul className="space-y-1 text-sm">
            {items.map((it) => (
              <li key={it.productId} className="flex justify-between">
                <span>
                  {products.find((p) => p.id === it.productId)?.name} × {it.qty}
                </span>
                <button type="button" className="text-xs text-muted" onClick={() => setItems((prev) => prev.filter((x) => x.productId !== it.productId))}>
                  убрать
                </button>
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            disabled={!name.trim() || !items.length}
            onClick={() => {
              onSave({
                id: initial?.id ?? uid("rcp"),
                name: name.trim(),
                category: category.trim() || "Прочее",
                price: Number(price) || 0,
                yieldPortions: Number(yieldPortions) || 1,
                items,
                techProcess: techProcess.trim(),
                outputGrams: Number(outputGrams) || undefined,
                shelfLifeHours: Number(shelfLifeHours) || undefined,
              });
              setOpen(false);
            }}
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
