import { AuthzError, actorFrom, publicActor } from "../authz/actor";
import { bearerToken, signActor, verifyActor } from "../authz/jwt";
import { publicSnapshot } from "../domain/finance";
import { computeKpis } from "../domain/engine";
import {
  applyAddBranch,
  applyAddSupplier,
  applyBanquet,
  applyBanquetStatus,
  applyClosePeriod,
  applyCloseShift,
  applyDeleteRecipe,
  applyExpense,
  applyImportProducts,
  applyInviteStaff,
  applyInvoice,
  applyKeeperSales,
  applyManualSale,
  applyBootstrap,
  applyOpenShift,
  applyPayrollAdjustment,
  applyProfile,
  applyPushSub,
  applyRequestFromNeed,
  applyRequestStatus,
  applyRevenuePlan,
  applyRevision,
  applySessionBranch,
  applySettings,
  applyStopList,
  applyTopUpDebt,
  applyTransfer,
  applyUpsertRecipe,
  applyWriteoff,
} from "../domain/mutations";
import type { Period, Snapshot } from "../domain/types";
import { today } from "../domain/types";
import { getRepo } from "../repo";
import { mapKeeperReceipts } from "../integrations/keeper";
import { parseKeeperXml } from "../integrations/keeper-xml";
import { askMetrics, periodNarrative, recommendMetrics } from "../ai";
import { safeMetrics } from "../ai/safe-context";
import { flushOutbox, notifyReady } from "../notify/send";
import { banquetPdf, periodPdf, revisionActPdf, toCsv } from "../reports/pdf";
import { advisor } from "../ai/advisor";
import { abcByRevenue, compareRevisions, deviations, periodPayroll, planVsFact, priceHistory, stockCover, stopListHistory } from "../domain/analytics";
import { isOnboarded } from "../data/empty";
import { createSeed } from "../data/seed";
import { can, isNetworkAdmin, isOpsLead } from "../domain/permissions";
import { ensureEnvBootstrap, readBootstrapEnv } from "../data/bootstrap";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function writeOrAll(actor: { sessionBranchId: string }) {
  return actor.sessionBranchId;
}

function pathOf(request: Request, splat?: string) {
  if (splat) return splat.replace(/^\/+|\/+$/g, "");
  const url = new URL(request.url);
  return url.pathname.replace(/^\/api\/v1\/?/, "").replace(/^\/+|\/+$/g, "");
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

async function requireActor(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new AuthzError("Нужен вход", 401);
  try {
    return await verifyActor(token);
  } catch {
    throw new AuthzError("Сессия истекла", 401);
  }
}

async function mutate(request: Request, fn: (snap: Snapshot, actor: ReturnType<typeof actorFrom>) => Snapshot | Promise<Snapshot>) {
  const actor = await requireActor(request);
  const repo = await getRepo();
  const snap = await repo.load();
  let next = await fn(snap, actor);
  next = await flushOutbox(next);
  await repo.save(next);
  return json({ ok: true, state: publicSnapshot(next) });
}

export async function handleApiRequest(request: Request, splat?: string): Promise<Response> {
  try {
    const method = request.method.toUpperCase();
    const path = pathOf(request, splat);
    const url = new URL(request.url);
    const body = await readBody(request);
    const repo = await getRepo();
    await ensureEnvBootstrap(repo);

    if (method === "GET" && (path === "health" || path === "")) {
      const status = await repo.status();
      const snap = await repo.load();
      return json({
        ok: true,
        service: "ochag",
        stage: 3,
        onboarded: isOnboarded(snap),
        store: status,
        notify: notifyReady(),
      });
    }

    if (method === "POST" && path === "auth/onboard") {
      throw new AuthzError("Публичная регистрация закрыта. Обратитесь к администратору.", 403);
    }

    if (method === "POST" && path === "auth/bootstrap") {
      const snap = await repo.load();
      if (snap.users.length > 0) throw new AuthzError("Сеть уже создана", 400);
      const expected = readBootstrapEnv().token;
      if (!expected) throw new AuthzError("Bootstrap выключен", 403);
      const got = String(body.token ?? request.headers.get("x-ochag-bootstrap") ?? "");
      if (got !== expected) throw new AuthzError("Неверный токен", 403);
      const next = applyBootstrap(snap, {
        name: String(body.name ?? "Администратор-техник"),
        login: String(body.login ?? body.email ?? ""),
        password: String(body.password ?? ""),
        pin: String(body.pin ?? ""),
        branchName: String(body.branchName ?? "Филиал 1"),
        city: body.city != null ? String(body.city) : undefined,
        address: body.address != null ? String(body.address) : undefined,
      });
      await repo.save(next);
      const admin = next.users[0]!;
      const actor = actorFrom(admin, { userId: admin.id, branchId: next.branches[0]?.id ?? "all" });
      const token = await signActor(actor);
      return json({ token, user: publicActor(actor), state: publicSnapshot(next) });
    }

    if (method === "POST" && (path === "auth/login" || path === "auth/pin")) {
      const snap = await repo.load();
      const login = String(body.login ?? body.email ?? "").trim().toLowerCase();
      const password = body.password != null ? String(body.password) : "";
      const pin = body.pin != null ? String(body.pin) : "";
      const user = snap.users.find((u) => u.email.toLowerCase() === login);
      if (!user) throw new AuthzError("Неверный логин или PIN", 401);
      const passOk = password && user.password === password;
      const pinOk = pin && user.pin === pin;
      if (!passOk && !pinOk) throw new AuthzError("Неверный логин или PIN", 401);
      const actor = actorFrom(user, { userId: user.id, branchId: user.branchId ?? "all" });
      const token = await signActor(actor);
      return json({
        token,
        user: publicActor(actor),
        state: publicSnapshot(snap),
      });
    }

    if (method === "GET" && path === "me") {
      return json({ user: publicActor(await requireActor(request)) });
    }

    if (method === "GET" && path === "state") {
      const actor = await requireActor(request);
      return json({ user: publicActor(actor), state: publicSnapshot(await repo.load()) });
    }

    if (method === "POST" && path === "state/reset") {
      const actor = await requireActor(request);
      if (!isNetworkAdmin(actor.role)) throw new AuthzError("Сброс недоступен");
      const state = await repo.reset();
      return json({ ok: true, state: publicSnapshot(state) });
    }

    if (method === "POST" && path === "state/sample") {
      const current = await repo.load();
      if (isOnboarded(current)) {
        const actor = await requireActor(request);
        if (!isNetworkAdmin(actor.role)) throw new AuthzError("Выгрузка примера недоступна");
      }
      const state = repo.loadSample ? await repo.loadSample() : createSeed();
      if (!repo.loadSample) await repo.save(state);
      return json({ ok: true, state: publicSnapshot(state) });
    }

    if (method === "POST" && path === "session/branch") {
      const actor = await requireActor(request);
      const next = applySessionBranch(actor, String(body.branchId ?? "all"));
      const token = await signActor(next);
      return json({ token, user: publicActor(next) });
    }

    if (method === "GET" && path === "kpis") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const snap = await repo.load();
      const period = (url.searchParams.get("period") ?? "7d") as Period;
      const branchId = url.searchParams.get("branch") ?? actor.sessionBranchId;
      return json({ kpis: computeKpis(snap, { period, branchId }) });
    }

    if (method === "POST" && path === "sales/manual") {
      return mutate(request, (snap, actor) =>
        applyManualSale(snap, actor, (body.items as never) ?? [], (body.payment as "cash" | "card" | "qr") ?? "cash"),
      );
    }

    if (method === "POST" && path === "sales/import") {
      return mutate(request, (snap, actor) => applyKeeperSales(snap, actor, (body.sales as never) ?? []).snap);
    }

    if (method === "POST" && path === "sales/z-report") {
      return mutate(request, (snap, actor) => {
        const mapped = mapKeeperReceipts(
          (body.receipts as never) ?? [],
          snap.recipes,
          actor.userId,
        );
        return applyKeeperSales(snap, actor, mapped).snap;
      });
    }

    if (method === "POST" && path === "sales/keeper-xml") {
      return mutate(request, (snap, actor) => {
        const receipts = parseKeeperXml(String(body.xml ?? ""));
        const mapped = mapKeeperReceipts(receipts, snap.recipes, actor.userId);
        return applyKeeperSales(snap, actor, mapped).snap;
      });
    }

    if (method === "POST" && path === "stock/writeoff") {
      return mutate(request, (snap, actor) => applyWriteoff(snap, actor, body as never));
    }
    if (method === "POST" && path === "stock/receipt") {
      return mutate(request, (snap, actor) => applyInvoice(snap, actor, body as never));
    }
    if (method === "POST" && path === "stock/transfer") {
      return mutate(request, (snap, actor) => applyTransfer(snap, actor, body as never));
    }
    if (method === "POST" && path === "stock/revision") {
      return mutate(request, (snap, actor) => applyRevision(snap, actor, (body.lines as never) ?? [], body.note as string | undefined));
    }
    if (method === "POST" && path === "procurement/request") {
      return mutate(request, (snap, actor) => applyRequestFromNeed(snap, actor));
    }
    if (method === "POST" && path === "procurement/status") {
      return mutate(request, (snap, actor) =>
        applyRequestStatus(snap, actor, String(body.id), body.status as never, body.supplierId ? String(body.supplierId) : undefined),
      );
    }
    if (method === "POST" && path === "shifts/open") {
      return mutate(request, (snap, actor) => applyOpenShift(snap, actor, body as never));
    }
    if (method === "POST" && path === "shifts/close") {
      return mutate(request, (snap, actor) => applyCloseShift(snap, actor, body as never));
    }
    if (method === "POST" && path === "debts/topup") {
      return mutate(request, (snap, actor) => applyTopUpDebt(snap, actor, { debtId: String(body.debtId) }));
    }
    if (method === "POST" && path === "shifts/stop-list") {
      return mutate(request, (snap, actor) => applyStopList(snap, actor, body as never));
    }
    if (method === "POST" && path === "expenses") {
      return mutate(request, (snap, actor) => applyExpense(snap, actor, body as never));
    }
    if (method === "POST" && path === "banquets") {
      return mutate(request, (snap, actor) => applyBanquet(snap, actor, body as never));
    }
    if (method === "POST" && path === "banquets/status") {
      return mutate(request, (snap, actor) => applyBanquetStatus(snap, actor, String(body.id), body.status as never));
    }
    if (method === "POST" && path === "profile") {
      return mutate(request, (snap, actor) => applyProfile(snap, actor, body as never));
    }

    if (method === "POST" && path.startsWith("ai/")) {
      const actor = await requireActor(request);
      if (!can(actor.role, "ai")) throw new AuthzError("AI только для управляющих");
      const repo = await getRepo();
      const snap = await repo.load();
      const period = (body.period as Period) ?? "7d";
      const branchId = String(body.branchId ?? actor.sessionBranchId);
      const metrics = safeMetrics(snap, period, branchId);
      if (path === "ai/narrative") {
        const out = await periodNarrative(metrics);
        return json({ ...out, metrics });
      }
      if (path === "ai/ask") {
        const out = await askMetrics(String(body.question ?? ""), metrics);
        return json({ ...out, metrics });
      }
      if (path === "ai/recommend") {
        const out = await recommendMetrics(metrics);
        const local = await advisor.analyze(snap, branchId);
        return json({ provider: out.provider, value: [...out.value, ...local].slice(0, 8), metrics });
      }
    }

    if (method === "POST" && path === "recipes") {
      return mutate(request, (snap, actor) => applyUpsertRecipe(snap, actor, body as never));
    }
    if (method === "POST" && path === "recipes/delete") {
      return mutate(request, (snap, actor) => applyDeleteRecipe(snap, actor, String(body.id)));
    }
    if (method === "POST" && path === "nomenclature/import") {
      return mutate(request, (snap, actor) => applyImportProducts(snap, actor, (body.rows as never) ?? []));
    }
    if (method === "POST" && path === "staff/invite") {
      return mutate(request, (snap, actor) => applyInviteStaff(snap, actor, body as never));
    }
    if (method === "POST" && path === "staff/adjust") {
      return mutate(request, (snap, actor) => applyPayrollAdjustment(snap, actor, body as never));
    }
    if (method === "POST" && path === "period/close") {
      return mutate(request, (snap, actor) => applyClosePeriod(snap, actor, body as never));
    }
    if (method === "POST" && path === "plan") {
      return mutate(request, (snap, actor) => applyRevenuePlan(snap, actor, body as never));
    }
    if (method === "POST" && path === "settings/network") {
      return mutate(request, (snap, actor) => applySettings(snap, actor, body as never));
    }
    if (method === "POST" && path === "push/subscribe") {
      return mutate(request, (snap, actor) => applyPushSub(snap, actor, body as never));
    }
    if (method === "POST" && path === "branches") {
      return mutate(request, (snap, actor) => applyAddBranch(snap, actor, body as never));
    }
    if (method === "POST" && path === "suppliers") {
      return mutate(request, (snap, actor) => applyAddSupplier(snap, actor, body as never));
    }

    if (method === "GET" && path === "analytics/abc") {
      const actor = await requireActor(request);
      if (!can(actor.role, "planning")) throw new AuthzError("Аналитика недоступна");
      const repo = await getRepo();
      const snap = await repo.load();
      const period = (url.searchParams.get("period") ?? "30d") as Period;
      const branchId = url.searchParams.get("branch") ?? actor.sessionBranchId;
      return json({ rows: abcByRevenue(snap, period, branchId) });
    }
    if (method === "GET" && path === "analytics/plan") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const snap = await repo.load();
      const month = url.searchParams.get("month") ?? today().slice(0, 7);
      const branchId = url.searchParams.get("branch") ?? writeOrAll(actor);
      if (branchId === "all") return json({ note: "Выберите филиал", days: [], target: 0, fact: 0 });
      return json(planVsFact(snap, branchId, month));
    }
    if (method === "GET" && path === "analytics/cover") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const snap = await repo.load();
      const branchId = url.searchParams.get("branch") ?? writeOrAll(actor);
      if (branchId === "all") return json({ note: "Выберите филиал", rows: [] });
      return json({ rows: stockCover(snap, branchId, (url.searchParams.get("period") ?? "7d") as Period) });
    }
    if (method === "GET" && path === "analytics/deviations") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      return json({ rows: deviations(await repo.load(), (url.searchParams.get("period") ?? "30d") as Period, url.searchParams.get("branch") ?? actor.sessionBranchId) });
    }
    if (method === "GET" && path === "analytics/revisions") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const snap = await repo.load();
      const branchId = url.searchParams.get("branch") ?? writeOrAll(actor);
      if (branchId === "all") return json({ note: "Выберите филиал" });
      return json(compareRevisions(snap, branchId));
    }
    if (method === "GET" && path === "analytics/prices") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      return json({
        rows: priceHistory(
          await repo.load(),
          String(url.searchParams.get("product") ?? ""),
          url.searchParams.get("branch") ?? actor.sessionBranchId,
        ),
      });
    }
    if (method === "GET" && path === "analytics/stoplist") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const from = url.searchParams.get("from") ?? today().slice(0, 7) + "-01";
      const to = url.searchParams.get("to") ?? today();
      return json({
        rows: stopListHistory(await repo.load(), url.searchParams.get("branch") ?? actor.sessionBranchId, from, to),
      });
    }
    if (method === "GET" && path === "analytics/payroll") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      return json({
        rows: periodPayroll(await repo.load(), (url.searchParams.get("period") ?? "30d") as Period, url.searchParams.get("branch") ?? actor.sessionBranchId),
      });
    }

    if (method === "POST" && path === "notify/flush") {
      const actor = await requireActor(request);
      if (!isOpsLead(actor.role)) throw new AuthzError("Очередь недоступна");
      const next = await flushOutbox(await repo.load());
      await repo.save(next);
      return json({ ok: true, state: publicSnapshot(next), notify: notifyReady() });
    }

    if (method === "GET" && path === "reports/pdf") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const snap = await repo.load();
      const kind = url.searchParams.get("kind") ?? "period";
      if (kind === "banquet") {
        const b = snap.banquets.find((x) => x.id === url.searchParams.get("id"));
        if (!b) throw new AuthzError("Банкет не найден", 404);
        const file = await banquetPdf(snap, b, (url.searchParams.get("sheet") as never) ?? "guest");
        return json({ filename: file.filename, base64: file.bytes.toString("base64"), mime: "application/pdf" });
      }
      if (kind === "revision") {
        const file = await revisionActPdf(snap, String(url.searchParams.get("id")));
        return json({ filename: file.filename, base64: file.bytes.toString("base64"), mime: "application/pdf" });
      }
      const period = (url.searchParams.get("period") ?? "7d") as Period;
      const k = computeKpis(snap, { period, branchId: actor.sessionBranchId });
      const file = await periodPdf(snap, period, [
        `Выручка ${k.revenue} ₽, чеков ${k.checks}`,
        `Фудкост ${k.foodCost.toFixed(1)}%, себест. ${k.cogs}`,
        `Списания ${k.writeoffs}, ФОТ ${k.payroll}, opex ${k.opex}`,
        `Чистыми ${k.net} ₽. Банкеты отдельно: ${k.banquetRevenue} ₽.`,
      ]);
      return json({ filename: file.filename, base64: file.bytes.toString("base64"), mime: "application/pdf" });
    }

    if (method === "GET" && path === "reports/csv") {
      const actor = await requireActor(request);
      const repo = await getRepo();
      const snap = await repo.load();
      const kind = url.searchParams.get("kind") ?? "sales";
      if (kind === "payroll") {
        const rows = periodPayroll(snap, (url.searchParams.get("period") ?? "30d") as Period, actor.sessionBranchId);
        return json({
          filename: "ochag-payroll.csv",
          csv: toCsv(
            ["Сотрудник", "Смен", "Ставка", "Бонус", "Доплата", "Штраф", "Аванс", "К выплате"],
            rows.map((r) => [r.user.name, r.shifts, r.base, r.bonus, r.extra, r.fine, r.advanceOut, r.payable]),
          ),
        });
      }
      const k = computeKpis(snap, { period: (url.searchParams.get("period") ?? "7d") as Period, branchId: actor.sessionBranchId });
      return json({
        filename: "ochag-period.csv",
        csv: toCsv(["Показатель", "Значение"], [
          ["Выручка", k.revenue],
          ["Наличные", k.cash],
          ["Карта", k.card],
          ["QR", k.qr],
          ["Себестоимость", k.cogs],
          ["Фудкост %", k.foodCost],
          ["Списания", k.writeoffs],
          ["ФОТ", k.payroll],
          ["Opex", k.opex],
          ["Чистыми", k.net],
        ]),
      });
    }

    if (method === "GET" && path === "nomenclature/template") {
      await requireActor(request);
      return json({
        filename: "ochag-nomenclature.csv",
        csv: toCsv(["name", "category", "unit", "minQty", "avgCost"], [["Свинина шея", "Мясо", "kg", 10, 420]]),
      });
    }

    return json({ error: "not_found", path }, 404);
  } catch (err) {
    if (err instanceof AuthzError) return json({ error: err.message }, err.status);
    const message = err instanceof Error ? err.message : "Ошибка контура";
    return json({ error: message }, 400);
  }
}
