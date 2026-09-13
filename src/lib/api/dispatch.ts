import { AuthzError, actorFrom, publicActor } from "../authz/actor";
import { bearerToken, signActor, verifyActor } from "../authz/jwt";
import { publicSnapshot } from "../domain/finance";
import { computeKpis } from "../domain/engine";
import {
  applyBanquet,
  applyBanquetStatus,
  applyCloseShift,
  applyExpense,
  applyInvoice,
  applyKeeperSales,
  applyManualSale,
  applyOpenShift,
  applyProfile,
  applyRequestFromNeed,
  applyRequestStatus,
  applyRevision,
  applySessionBranch,
  applyStopList,
  applyTransfer,
  applyWriteoff,
} from "../domain/mutations";
import type { Period, Snapshot } from "../domain/types";
import { getRepo } from "../repo";
import { mapKeeperReceipts } from "../integrations/keeper";
import { parseKeeperXml } from "../integrations/keeper-xml";
import { askMetrics, periodNarrative, recommendMetrics } from "../ai";
import { safeMetrics } from "../ai/safe-context";
import { stubTelegram, stubWebPush } from "../notify/channels";
import { stubPeriodPdf } from "../reports/pdf";
import { advisor } from "../ai/advisor";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
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
  const next = await fn(snap, actor);
  await repo.save(next);
  return json({ ok: true, state: publicSnapshot(next) });
}

export async function handleApiRequest(request: Request, splat?: string): Promise<Response> {
  try {
    const method = request.method.toUpperCase();
    const path = pathOf(request, splat);
    const url = new URL(request.url);
    const body = await readBody(request);

    if (method === "GET" && (path === "health" || path === "")) {
      const repo = await getRepo();
      const status = await repo.status();
      return json({ ok: true, service: "ochag", stage: 1, store: status });
    }

    if (method === "POST" && (path === "auth/login" || path === "auth/pin")) {
      const repo = await getRepo();
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
      const repo = await getRepo();
      return json({ user: publicActor(actor), state: publicSnapshot(await repo.load()) });
    }

    if (method === "POST" && path === "state/reset") {
      const actor = await requireActor(request);
      if (actor.role !== "owner" && actor.role !== "manager") throw new AuthzError("Сброс недоступен");
      const repo = await getRepo();
      const state = await repo.reset();
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
      return mutate(request, (snap) => applyRequestStatus(snap, String(body.id), body.status as never));
    }
    if (method === "POST" && path === "shifts/open") {
      return mutate(request, (snap, actor) => applyOpenShift(snap, actor, body as never));
    }
    if (method === "POST" && path === "shifts/close") {
      return mutate(request, (snap, actor) => applyCloseShift(snap, actor, body as never));
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
      if (actor.role !== "owner" && actor.role !== "manager") throw new AuthzError("AI только для управляющих");
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

    if (method === "POST" && path === "notify/telegram") {
      await requireActor(request);
      return json(stubTelegram(String(body.text ?? "Очаг: сигнал смены")));
    }
    if (method === "POST" && path === "notify/push") {
      await requireActor(request);
      return json(stubWebPush(String(body.title ?? "Очаг"), String(body.body ?? "")));
    }
    if (method === "GET" && path === "reports/pdf") {
      await requireActor(request);
      return json(stubPeriodPdf(url.searchParams.get("period") ?? "7d"));
    }

    return json({ error: "not_found", path }, 404);
  } catch (err) {
    if (err instanceof AuthzError) return json({ error: err.message }, err.status);
    const message = err instanceof Error ? err.message : "Ошибка контура";
    return json({ error: message }, 400);
  }
}
