import { DOWNLOAD_SLUG } from "../brand";
import { AuthzError, actorFrom, publicActor } from "../authz/actor";
import { bearerToken, signActor, verifyActor } from "../authz/jwt";
import { publicSnapshot } from "../domain/finance";
import { computeKpis } from "../domain/engine";
import {
  applyAddBranch,
  applyAddSupplier,
  applyBanquet,
  applyBanquetStatus,
  applyDeleteBanquet,
  applyClosePeriod,
  applyCloseShift,
  applyDeleteBranch,
  applyDeleteRecipe,
  applyDeleteStaff,
  applyExpense,
  applyImportProducts,
  applyCreateProduct,
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
  applySessionOwner,
  applySettings,
  applyStopList,
  applyTopUpDebt,
  applyTransfer,
  applyUpdateBranch,
  applyUpdateStaff,
  applyUpsertRecipe,
  applyWriteoff,
  applyCreateLedgerDebt,
  applyPayLedgerDebt,
  applyUpdateLedgerDebt,
  applyUpsertHouseholdItem,
  applyHouseholdMove,
  applyShiftIncidental,
  applyVoidSale,
  applyDiscountSale,
  applyAccrueMonthlyPremiums,
  applyApproveNetworkApplication,
  applyRejectNetworkApplication,
  applySubmitNetworkApplication,
} from "../domain/mutations";
import type { Period, Snapshot } from "../domain/types";
import { today } from "../domain/types";
import { getRepo } from "../repo";
import { mapKeeperReceipts } from "../integrations/keeper";
import { parseKeeperXml } from "../integrations/keeper-xml";
import { fetchKeeperReceipts, publicKeeperStatus } from "../integrations/keeper-http";
import { applySimulatePayment, billingPublic, canSubmitNetworkApplication, showCommercialEntry } from "../billing/simulate";
import { isTariffId } from "../billing/plans";
import { explainCalc, periodNarrative, recommendMetrics, ollamaAvailable, resolveOllamaConfig, isCalcTask, calcSnapshot } from "../ai";
import { safeMetrics } from "../ai/safe-context";
import { flushOutbox, notifyReady } from "../notify/send";
import { banquetPdf, periodPdf, pdfBytesToBase64, revisionActPdf, toCsv, transferWaybillPdf, ttkPdf } from "../reports/pdf";
import { advisor } from "../ai/advisor";
import { abcByRevenue, compareRevisions, deviations, periodPayroll, planVsFact, priceHistory, stockCover, stopListHistory } from "../domain/analytics";
import { averageCheque, revenueByHour, waiterVoidsAndDiscounts } from "../domain/reports-extra";
import { isOnboarded } from "../data/empty";
import { createSeed, USERS } from "../data/seed";
import { applyEnsureShowcase } from "../data/showcase";
import { parseNomenclatureCsv } from "../domain/nomenclature-csv";
import { can, canLoadSample, canResetDemo, hasAbsoluteAccess, isOpsLead } from "../domain/permissions";
import { ensureEnvBootstrap, readBootstrapEnv, rematerializeLoginSecrets } from "../data/bootstrap";
import { assertResetAllowed, assertSampleLoadAllowed } from "../data/sample-guard";
import { appendOpsLog, recordAuthAttempt, resolveStaffAuth, ACCOUNT_BLOCKED_MSG, AUTH_LOCKED_MSG } from "../domain/ops-log";
import {
  attachSession,
  assertSessionActive,
  mintDeviceSession,
  revokeOtherSessions,
  revokeSession,
  sessionListRows,
  touchSession,
} from "../domain/sessions";
import { assertReadableBranch, ownerSummaries, snapshotForActor } from "../domain/tenancy";
import {
  assertAuthFieldSizes,
  assertAuthRate,
  assertPayloadSize,
  assertSameOriginOrNone,
  assertWriteRate,
  opaqueApiError,
  securityHeaders,
} from "../security/http";
import { assertApiAuthz, isPrivilegedWrite } from "../security/authz-routes";
import { secretsEqual } from "../security/secrets";
import {
  DB_UNAVAILABLE_MSG,
  StoreUnavailableError,
  isDbUnavailableError,
  publicErrorMessage,
} from "../repo/db-errors";

function json(data: unknown, status = 200, request?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...securityHeaders(request) },
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
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return {};
  const text = await request.text();
  assertPayloadSize(request, text);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new AuthzError("Некорректное тело запроса", 400);
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof AuthzError) throw err;
    throw new AuthzError("Некорректное тело запроса", 400);
  }
}

async function requireLiveActor(request: Request, snap: Snapshot) {
  const actor = await requireActor(request);
  assertSessionActive(snap, actor);
  return actor;
}

async function loadLive(request: Request) {
  const repo = await getRepo();
  let snap = await repo.load();
  const actor = await requireLiveActor(request, snap);
  const touched = touchSession(snap, actor.sessionId);
  if (touched !== snap) {
    await repo.save(touched);
    snap = touched;
  }
  return { repo, snap, actor, view: snapshotForActor(snap, actor) };
}

async function loadScoped(request: Request) {
  return loadLive(request);
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

async function persistOpsLog(entry: Parameters<typeof appendOpsLog>[1]) {
  try {
    const repo = await getRepo();
    const snap = await repo.load();
    await repo.save(appendOpsLog(snap, entry));
  } catch {
    /* ops console must never break the API */
  }
}

function authSnapshot(snap: Snapshot): Snapshot {
  return rematerializeLoginSecrets(snap, USERS);
}

async function healthResponse(): Promise<Response> {
  try {
    const repo = await getRepo();
    try {
      await ensureEnvBootstrap(repo);
    } catch (err) {
      if (!isDbUnavailableError(err)) throw err;
      return json(
        {
          ok: false,
          service: "ochag",
          error: DB_UNAVAILABLE_MSG,
          store: { source: repo.source, ready: false, updatedAt: null, sales: 0 },
        },
        503,
      );
    }
    const status = await repo.status();
    if (!status.ready) {
      return json(
        {
          ok: false,
          service: "ochag",
          error: DB_UNAVAILABLE_MSG,
          store: status,
        },
        503,
      );
    }
    const snap = await repo.load();
    return json({
      ok: true,
      service: "ochag",
      stage: 3,
      onboarded: isOnboarded(snap),
      store: status,
      notify: notifyReady(),
      billing: billingPublic(snap),
    });
  } catch (err) {
    const { resolveStoreSource } = await import("../repo/store-source");
    return json(
      {
        ok: false,
        service: "ochag",
        error: publicErrorMessage(err, DB_UNAVAILABLE_MSG),
        store: { source: resolveStoreSource(), ready: false, updatedAt: null, sales: 0 },
      },
      503,
    );
  }
}

async function mutate(
  request: Request,
  fn: (snap: Snapshot, actor: ReturnType<typeof actorFrom>) => Snapshot | Promise<Snapshot>,
) {
  return mutateWith(request, async (snap, actor) => ({ snap: await fn(snap, actor) }));
}

async function mutateWith(
  request: Request,
  fn: (
    snap: Snapshot,
    actor: ReturnType<typeof actorFrom>,
  ) => { snap: Snapshot; added?: number; skipped?: number } | Promise<{ snap: Snapshot; added?: number; skipped?: number }>,
) {
  const path = pathOf(request);
  try {
    const repo = await getRepo();
    let snap = await repo.load();
    const actor = await requireLiveActor(request, snap);
    assertApiAuthz(request.method, path, actor);
    assertWriteRate(request, actor.userId);
    snap = touchSession(snap, actor.sessionId);
    const result = await fn(snap, actor);
    let next = await flushOutbox(result.snap);
    if (hasAbsoluteAccess(actor.role) && isPrivilegedWrite(path)) {
      next = appendOpsLog(next, {
        level: "info",
        event: "api",
        detail: `техник ${path} · контур ${actor.actingOwnerId ?? "все"}`,
        userId: actor.userId,
        path,
      });
    }
    await repo.save(next);
    return json(
      { ok: true, state: publicSnapshot(next, actor), added: result.added ?? 0, skipped: result.skipped ?? 0 },
      200,
      request,
    );
  } catch (err) {
    if (err instanceof AuthzError) {
      await persistOpsLog({ level: "warn", event: "api", detail: err.message, path });
      return json({ error: err.message }, err.status, request);
    }
    throw err;
  }
}

export async function handleApiRequest(request: Request, splat?: string): Promise<Response> {
  try {
    const method = request.method.toUpperCase();
    const path = pathOf(request, splat);
    const url = new URL(request.url);
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: securityHeaders(request) });
    }
    assertSameOriginOrNone(request);
    const body = await readBody(request);

    if (method === "GET" && (path === "health" || path === "")) {
      return healthResponse();
    }

    const repo = await getRepo();
    await ensureEnvBootstrap(repo);

    if (method === "GET" && path === "billing") {
      return json(billingPublic(await repo.load()));
    }

    if (method === "POST" && path === "billing/simulate") {
      assertAuthRate(request);
      const snap = await repo.load();
      if (!isTariffId(body.tariff)) throw new AuthzError("Выберите тариф", 400);
      const next = applySimulatePayment(snap, body.tariff);
      await repo.save(next);
      return json({ ok: true, billing: billingPublic(next), simulated: true }, 200, request);
    }

    if (method === "POST" && (path === "auth/onboard" || path === "auth/apply")) {
      const login = String(body.login ?? body.email ?? "");
      assertAuthRate(request, login);
      assertAuthFieldSizes({
        login,
        password: String(body.password ?? ""),
        pin: String(body.pin ?? ""),
      });
      const snap = await repo.load();
      if (!canSubmitNetworkApplication(snap)) {
        throw new AuthzError("Заявку на сеть принимает администратор. Если уже есть логин — войдите ниже.", 403);
      }
      const result = applySubmitNetworkApplication(snap, {
        ownerName: String(body.ownerName ?? body.name ?? ""),
        login,
        password: String(body.password ?? ""),
        pin: String(body.pin ?? ""),
        phone: String(body.phone ?? ""),
        branchName: String(body.branchName ?? "Филиал 1"),
        city: String(body.city ?? ""),
        address: String(body.address ?? ""),
        seats: body.seats != null ? Number(body.seats) : undefined,
        halls: Array.isArray(body.halls) ? (body.halls as string[]) : typeof body.halls === "string" ? [body.halls] : undefined,
        tariff: isTariffId(body.tariff) ? body.tariff : snap.settings.tariff,
        payerName: String(body.payerName ?? ""),
        note: String(body.note ?? ""),
      });
      await repo.save(result.snap);
      return json(
        {
          ok: true,
          pending: true,
          applicationId: result.application.id,
          telegram: "@arachtech",
          billing: billingPublic(result.snap),
        },
        200,
        request,
      );
    }

    if (method === "POST" && path === "auth/bootstrap") {
      assertAuthRate(request);
      const snap = await repo.load();
      if (snap.users.length > 0) throw new AuthzError("Сеть уже создана", 400);
      const expected = readBootstrapEnv().token;
      if (!expected) throw new AuthzError("Bootstrap выключен", 403);
      const got = String(body.token ?? request.headers.get("x-ochag-bootstrap") ?? "");
      assertAuthFieldSizes({
        login: String(body.login ?? body.email ?? ""),
        password: String(body.password ?? ""),
        pin: String(body.pin ?? ""),
      });
      if (!secretsEqual(got, expected)) throw new AuthzError("Неверный токен", 403);
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
      const sess = mintDeviceSession({ userId: admin.id, request });
      const stored = attachSession(next, sess);
      await repo.save(stored);
      const actor = actorFrom(admin, { userId: admin.id, branchId: next.branches[0]?.id ?? "all", sessionId: sess.id });
      const token = await signActor(actor);
      return json({ token, user: publicActor(actor), state: publicSnapshot(stored, actor) }, 200, request);
    }

    if (method === "POST" && (path === "auth/login" || path === "auth/pin")) {
      const loginRaw = String(body.login ?? body.email ?? "");
      const password = body.password != null ? String(body.password) : "";
      const pin = body.pin != null ? String(body.pin) : "";
      assertAuthRate(request, loginRaw);
      assertAuthFieldSizes({ login: loginRaw, password, pin });
      const snap = authSnapshot(await repo.load());
      const login = loginRaw.trim().toLowerCase();
      const via = path === "auth/pin" ? "pin" : "password";
      const user = snap.users.find((u) => u.email.toLowerCase() === login);
      const dummy = "\0".repeat(Math.max(password.length, pin.length, 12));
      const passOk =
        via === "password" && Boolean(password) && secretsEqual(user?.password ?? dummy, password) && Boolean(user);
      const pinOk = via === "pin" && Boolean(pin) && secretsEqual(user?.pin ?? dummy, pin) && Boolean(user);
      const verdict = resolveStaffAuth({ user, credentialsOk: passOk || pinOk });
      const logged = recordAuthAttempt(snap, {
        login,
        via,
        user,
        ok: verdict.ok,
        reason: verdict.reason,
      });
      if (!logged.ok) {
        await repo.save(logged.snap);
        const status =
          logged.reason === ACCOUNT_BLOCKED_MSG ? 403 : logged.reason === AUTH_LOCKED_MSG ? 429 : 401;
        return json({ error: logged.reason ?? "Неверный логин или PIN" }, status, request);
      }
      const sess = mintDeviceSession({ userId: user!.id, request });
      const withSess = attachSession(logged.snap, sess);
      await repo.save(withSess);
      const branchId = user!.role === "tech_admin" || user!.role === "owner" ? "all" : user!.branchId ?? "all";
      const actor = actorFrom(user!, { userId: user!.id, branchId, sessionId: sess.id });
      const token = await signActor(actor);
      return json(
        {
          token,
          user: publicActor(actor),
          state: publicSnapshot(withSess, actor),
        },
        200,
        request,
      );
    }

    if (method === "GET" && path === "me") {
      const { actor } = await loadLive(request);
      return json({ user: publicActor(actor) }, 200, request);
    }

    if (method === "GET" && path === "state") {
      const { actor, snap } = await loadLive(request);
      return json({ user: publicActor(actor), state: publicSnapshot(snap, actor) }, 200, request);
    }

    if (method === "POST" && path === "state/reset") {
      const current = await repo.load();
      const actor = await requireLiveActor(request, current);
      assertResetAllowed(current, actor.role);
      if (!canResetDemo(actor.role)) throw new AuthzError("Сброс недоступен");
      const state = appendOpsLog(await repo.reset(), {
        level: "warn",
        event: "api",
        detail: "сброс сети",
        userId: actor.userId,
        path,
      });
      await repo.save(state);
      return json({ ok: true, state: publicSnapshot(state, actor) }, 200, request);
    }

    if (method === "POST" && path === "state/sample") {
      const current = await repo.load();
      const actor = await requireLiveActor(request, current);
      if (!canLoadSample(actor.role)) throw new AuthzError("Учебный срез доступен только администратору-технику");
      assertSampleLoadAllowed(current, actor.role);
      let state = repo.loadSample ? await repo.loadSample() : createSeed();
      state = appendOpsLog(state, {
        level: "info",
        event: "sample",
        detail: "загружена учебная сеть (демо-контур)",
        userId: actor.userId,
        path,
      });
      await repo.save(state);
      return json({ ok: true, state: publicSnapshot(state, actor) }, 200, request);
    }

    if (method === "POST" && path === "state/showcase") {
      const current = await repo.load();
      const actor = await requireLiveActor(request, current);
      if (!hasAbsoluteAccess(actor.role)) throw new AuthzError("Витрину показа собирает только администратор-техник");
      const state = appendOpsLog(applyEnsureShowcase(current), {
        level: "info",
        event: "showcase",
        detail: "собрана витрина показа",
        userId: actor.userId,
        path,
      });
      await repo.save(state);
      return json({ ok: true, state: publicSnapshot(state, actor) }, 200, request);
    }

    if (method === "POST" && path === "admin/applications/approve") {
      return mutate(request, (snap, actor) =>
        applyApproveNetworkApplication(snap, actor, {
          id: String(body.id),
          tariff: isTariffId(body.tariff) ? body.tariff : undefined,
          paid: body.paid !== false,
        }),
      );
    }
    if (method === "POST" && path === "admin/applications/reject") {
      return mutate(request, (snap, actor) =>
        applyRejectNetworkApplication(snap, actor, { id: String(body.id), reason: String(body.reason ?? "") }),
      );
    }

    if (method === "POST" && path === "session/branch") {
      const snap = await repo.load();
      const actor = await requireLiveActor(request, snap);
      const next = applySessionBranch(actor, String(body.branchId ?? "all"), snap);
      const token = await signActor(next);
      return json({ token, user: publicActor(next), state: publicSnapshot(snap, next) }, 200, request);
    }

    if (method === "POST" && path === "session/owner") {
      const snap = await repo.load();
      const actor = await requireLiveActor(request, snap);
      assertApiAuthz(method, path, actor);
      const next = applySessionOwner(actor, body.ownerId != null ? String(body.ownerId) : null, snap);
      const token = await signActor(next);
      await persistOpsLog({
        level: "info",
        event: "api",
        detail: next.actingOwnerId ? `контур владельца ${next.actingOwnerId}` : "контур владельца сброшен",
        userId: actor.userId,
        path,
      });
      return json({ token, user: publicActor(next), state: publicSnapshot(snap, next) }, 200, request);
    }

    if (method === "GET" && path === "session/list") {
      const { snap, actor } = await loadLive(request);
      return json({ rows: sessionListRows(snap, actor), currentId: actor.sessionId }, 200, request);
    }

    if (method === "POST" && path === "session/revoke") {
      return mutate(request, (snap, actor) => revokeSession(snap, actor, String(body.sessionId ?? "")));
    }

    if (method === "POST" && path === "session/revoke-others") {
      return mutate(request, (snap, actor) => revokeOtherSessions(snap, actor, actor.sessionId));
    }

    if (method === "GET" && path === "owners") {
      const { snap, actor } = await loadLive(request);
      assertApiAuthz(method, path, actor);
      return json(
        {
          rows: ownerSummaries(snap),
          actingOwnerId: actor.actingOwnerId ?? null,
        },
        200,
        request,
      );
    }

    if (method === "GET" && path === "kpis") {
      const { snap, actor, view } = await loadLive(request);
      const period = (url.searchParams.get("period") ?? "7d") as Period;
      const branchId = url.searchParams.get("branch") ?? actor.sessionBranchId;
      if (branchId && branchId !== "all") assertReadableBranch(snap, actor, branchId);
      return json({ kpis: computeKpis(view, { period, branchId }) }, 200, request);
    }

    if (method === "POST" && path === "sales/manual") {
      return mutate(request, (snap, actor) =>
        applyManualSale(snap, actor, (body.items as never) ?? [], (body.payment as "cash" | "card" | "qr" | "transfer") ?? "cash"),
      );
    }

    if (method === "GET" && path === "integrations/keeper") {
      await loadLive(request);
      const status = await repo.status();
      return json({ ...publicKeeperStatus(), store: status.source });
    }

    if (method === "POST" && path === "sales/import") {
      return mutateWith(request, (snap, actor) => applyKeeperSales(snap, actor, (body.sales as never) ?? []));
    }

    if (method === "POST" && path === "sales/z-report") {
      return mutateWith(request, (snap, actor) => {
        const mapped = mapKeeperReceipts(
          (body.receipts as never) ?? [],
          snap.recipes,
          actor.userId,
        );
        return applyKeeperSales(snap, actor, mapped);
      });
    }

    if (method === "POST" && path === "sales/keeper-pull") {
      return mutateWith(request, async (snap, actor) => {
        const receipts = await fetchKeeperReceipts();
        const mapped = mapKeeperReceipts(receipts, snap.recipes, actor.userId);
        return applyKeeperSales(snap, actor, mapped);
      });
    }

    if (method === "POST" && path === "sales/keeper-xml") {
      return mutateWith(request, (snap, actor) => {
        const receipts = parseKeeperXml(String(body.xml ?? ""));
        if (receipts.length === 0) {
          throw new AuthzError("В XML нет чеков. Нужны узлы Receipt/Check/Order с блюдами Item или Dish.", 400);
        }
        const mapped = mapKeeperReceipts(receipts, snap.recipes, actor.userId);
        return applyKeeperSales(snap, actor, mapped);
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
      return mutate(request, (snap, actor) =>
        applyRevision(
          snap,
          actor,
          (body.lines as never) ?? [],
          body.note as string | undefined,
          body.photos as never,
        ),
      );
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
    if (method === "POST" && path === "debts/ledger") {
      return mutate(request, (snap, actor) => applyCreateLedgerDebt(snap, actor, body as never));
    }
    if (method === "POST" && path === "debts/ledger/pay") {
      return mutate(request, (snap, actor) => applyPayLedgerDebt(snap, actor, body as never));
    }
    if (method === "POST" && path === "debts/ledger/update") {
      return mutate(request, (snap, actor) => applyUpdateLedgerDebt(snap, actor, body as never));
    }
    if (method === "POST" && path === "household/item") {
      return mutate(request, (snap, actor) => applyUpsertHouseholdItem(snap, actor, body as never));
    }
    if (method === "POST" && path === "household/move") {
      return mutate(request, (snap, actor) => applyHouseholdMove(snap, actor, body as never));
    }
    if (method === "POST" && path === "shifts/incidental") {
      return mutate(request, (snap, actor) => applyShiftIncidental(snap, actor, body as never));
    }
    if (method === "POST" && path === "sales/void") {
      return mutate(request, (snap, actor) => applyVoidSale(snap, actor, body as never));
    }
    if (method === "POST" && path === "sales/discount") {
      return mutate(request, (snap, actor) => applyDiscountSale(snap, actor, body as never));
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
    if (method === "POST" && path === "banquets/delete") {
      return mutate(request, (snap, actor) => applyDeleteBanquet(snap, actor, String(body.id)));
    }
    if (method === "POST" && path === "profile") {
      return mutate(request, (snap, actor) => applyProfile(snap, actor, body as never));
    }

    if (method === "GET" && path === "ai/status") {
      const { actor, view } = await loadLive(request);
      if (!can(actor.role, "ai")) throw new AuthzError("AI только для управляющих");
      const cfg = resolveOllamaConfig(view.settings);
      const ping = cfg.configured ? await ollamaAvailable(cfg) : { ok: false, error: "Ollama не настроена" };
      return json({
        configured: cfg.configured,
        source: cfg.source,
        model: cfg.model,
        base: cfg.configured ? cfg.base : "",
        reachable: ping.ok,
        error: ping.ok ? undefined : ping.error,
      });
    }

    if (method === "GET" && path === "debts/ledger") {
      const { actor, view } = await loadScoped(request);
      assertApiAuthz(method, path, actor);
      return json({ rows: view.ledgerDebts ?? [] }, 200, request);
    }

    if (method === "POST" && path.startsWith("ai/")) {
      const { actor, view } = await loadScoped(request);
      if (!can(actor.role, "ai")) throw new AuthzError("AI только для управляющих");
      const period = (body.period as Period) ?? "7d";
      const branchId = String(body.branchId ?? actor.sessionBranchId);
      if (branchId && branchId !== "all") assertReadableBranch(view, actor, branchId);
      const metrics = safeMetrics(view, period, branchId);
      const cfg = resolveOllamaConfig(view.settings);
      if (path === "ai/status") {
        const ping = cfg.configured ? await ollamaAvailable(cfg) : { ok: false, error: "Ollama не настроена" };
        return json({
          configured: cfg.configured,
          source: cfg.source,
          model: cfg.model,
          base: cfg.configured ? cfg.base : "",
          reachable: ping.ok,
          error: ping.ok ? undefined : ping.error,
        });
      }
      if (path === "ai/narrative") {
        const out = await periodNarrative(metrics, view.settings);
        return json({ ...out, metrics });
      }
      if (path === "ai/ask") {
        return json({ error: "Свободный чат отключён. Нужны расчёты: сводка, рекомендации, маржа, прогноз, смена." }, 400);
      }
      if (path === "ai/calc") {
        if (!isCalcTask(body.task)) {
          return json({ error: "Задача: margin, forecast, shift или cover" }, 400);
        }
        const out = await explainCalc(body.task, metrics, view.settings);
        return json({ ...out, metrics, calc: calcSnapshot(body.task, metrics), task: body.task });
      }
      if (path === "ai/recommend") {
        const out = await recommendMetrics(metrics, view.settings);
        const local = await advisor.analyze(view, branchId);
        return json({ ...out, value: [...out.value, ...local].slice(0, 8), metrics });
      }
    }

    if (method === "POST" && path === "recipes") {
      return mutate(request, (snap, actor) => applyUpsertRecipe(snap, actor, body as never));
    }
    if (method === "POST" && path === "recipes/delete") {
      return mutate(request, (snap, actor) => applyDeleteRecipe(snap, actor, String(body.id)));
    }
    if (method === "POST" && path === "nomenclature/import") {
      return mutate(request, (snap, actor) => {
        const fromCsv = typeof body.csv === "string" ? parseNomenclatureCsv(body.csv) : [];
        const rows = Array.isArray(body.rows) && body.rows.length ? (body.rows as never) : fromCsv;
        if (!rows.length) throw new AuthzError("Нет строк для импорта", 400);
        return applyImportProducts(snap, actor, rows);
      });
    }
    if (method === "POST" && path === "nomenclature/product") {
      return mutate(request, (snap, actor) => applyCreateProduct(snap, actor, body as never));
    }
    if (method === "POST" && path === "staff/invite") {
      return mutate(request, (snap, actor) => applyInviteStaff(snap, actor, body as never));
    }
    if (method === "POST" && path === "staff/update") {
      return mutate(request, (snap, actor) => applyUpdateStaff(snap, actor, body as never));
    }
    if (method === "POST" && path === "staff/delete") {
      return mutate(request, (snap, actor) => applyDeleteStaff(snap, actor, body as never));
    }
    if (method === "POST" && path === "staff/adjust") {
      return mutate(request, (snap, actor) => applyPayrollAdjustment(snap, actor, body as never));
    }
    if (method === "POST" && path === "staff/premiums") {
      return mutate(request, (snap, actor) => applyAccrueMonthlyPremiums(snap, actor, body as never));
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
    if (method === "POST" && path === "branches/update") {
      return mutate(request, (snap, actor) => applyUpdateBranch(snap, actor, body as never));
    }
    if (method === "POST" && path === "branches/delete") {
      return mutate(request, (snap, actor) => applyDeleteBranch(snap, actor, body as never));
    }
    if (method === "POST" && path === "suppliers") {
      return mutate(request, (snap, actor) => applyAddSupplier(snap, actor, body as never));
    }

    if (method === "GET" && path.startsWith("analytics/")) {
      const { actor, view } = await loadScoped(request);
      const period = (url.searchParams.get("period") ?? "30d") as Period;
      const branchId = url.searchParams.get("branch") ?? actor.sessionBranchId;
      if (branchId && branchId !== "all") assertReadableBranch(view, actor, branchId);
      if (path === "analytics/abc") {
        if (!can(actor.role, "planning")) throw new AuthzError("Аналитика недоступна");
        return json({ rows: abcByRevenue(view, (url.searchParams.get("period") ?? "30d") as Period, branchId) });
      }
      if (path === "analytics/plan") {
        const month = url.searchParams.get("month") ?? today().slice(0, 7);
        const bid = url.searchParams.get("branch") ?? writeOrAll(actor);
        if (bid === "all") return json({ note: "Выберите филиал", days: [], target: 0, fact: 0 });
        assertReadableBranch(view, actor, bid);
        return json(planVsFact(view, bid, month));
      }
      if (path === "analytics/cover") {
        const bid = url.searchParams.get("branch") ?? writeOrAll(actor);
        if (bid === "all") return json({ note: "Выберите филиал", rows: [] });
        assertReadableBranch(view, actor, bid);
        return json({ rows: stockCover(view, bid, (url.searchParams.get("period") ?? "7d") as Period) });
      }
      if (path === "analytics/deviations") {
        return json({ rows: deviations(view, period, branchId) });
      }
      if (path === "analytics/revisions") {
        const bid = url.searchParams.get("branch") ?? writeOrAll(actor);
        if (bid === "all") return json({ note: "Выберите филиал" });
        assertReadableBranch(view, actor, bid);
        return json(compareRevisions(view, bid));
      }
      if (path === "analytics/prices") {
        return json({
          rows: priceHistory(view, String(url.searchParams.get("product") ?? ""), branchId),
        });
      }
      if (path === "analytics/stoplist") {
        const from = url.searchParams.get("from") ?? today().slice(0, 7) + "-01";
        const to = url.searchParams.get("to") ?? today();
        return json({ rows: stopListHistory(view, branchId, from, to) });
      }
      if (path === "analytics/payroll") {
        return json({ rows: periodPayroll(view, period, branchId) });
      }
      if (path === "analytics/avg-check") {
        if (!can(actor.role, "reports")) throw new AuthzError("Отчёты недоступны");
        return json(averageCheque(view, (url.searchParams.get("period") ?? "7d") as Period, branchId));
      }
      if (path === "analytics/hourly") {
        if (!can(actor.role, "reports")) throw new AuthzError("Отчёты недоступны");
        return json(revenueByHour(view, (url.searchParams.get("period") ?? "7d") as Period, branchId));
      }
      if (path === "analytics/waiter-voids") {
        if (!can(actor.role, "reports")) throw new AuthzError("Отчёты недоступны");
        return json({ rows: waiterVoidsAndDiscounts(view, (url.searchParams.get("period") ?? "7d") as Period, branchId) });
      }
      return json({ error: "not_found", path }, 404);
    }

    if (method === "POST" && path === "notify/flush") {
      const { actor } = await loadLive(request);
      if (!isOpsLead(actor.role)) throw new AuthzError("Очередь недоступна");
      const next = await flushOutbox(await repo.load());
      await repo.save(next);
      return json({ ok: true, state: publicSnapshot(next, actor), notify: notifyReady() }, 200, request);
    }

    if (method === "GET" && path === "reports/pdf") {
      const { actor, view } = await loadScoped(request);
      const kind = url.searchParams.get("kind") ?? "period";
      try {
        if (kind === "banquet") {
          const b = view.banquets.find((x) => x.id === url.searchParams.get("id"));
          if (!b) throw new AuthzError("Банкет не найден", 404);
          const file = await banquetPdf(view, b, (url.searchParams.get("sheet") as never) ?? "guest");
          return json({ filename: file.filename, base64: pdfBytesToBase64(file.bytes), mime: "application/pdf" });
        }
        if (kind === "revision") {
          const file = await revisionActPdf(view, String(url.searchParams.get("id")));
          return json({ filename: file.filename, base64: pdfBytesToBase64(file.bytes), mime: "application/pdf" });
        }
        if (kind === "waybill") {
          const file = await transferWaybillPdf(view, String(url.searchParams.get("id")));
          return json({ filename: file.filename, base64: pdfBytesToBase64(file.bytes), mime: "application/pdf" });
        }
        if (kind === "ttk") {
          const file = await ttkPdf(view, String(url.searchParams.get("id")));
          return json({ filename: file.filename, base64: pdfBytesToBase64(file.bytes), mime: "application/pdf" });
        }
        const period = (url.searchParams.get("period") ?? "7d") as Period;
        const k = computeKpis(view, { period, branchId: actor.sessionBranchId });
        const file = await periodPdf(view, period, [
          `Выручка ${k.revenue} ₽, чеков ${k.checks}`,
          `Фудкост ${k.foodCost.toFixed(1)}%, себест. ${k.cogs}`,
          `Списания ${k.writeoffs}, ФОТ ${k.payroll}, opex ${k.opex}`,
          `Чистыми ${k.net} ₽. Банкеты отдельно: ${k.banquetRevenue} ₽.`,
        ]);
        return json({ filename: file.filename, base64: pdfBytesToBase64(file.bytes), mime: "application/pdf" });
      } catch (err) {
        if (err instanceof AuthzError) throw err;
        const msg = err instanceof Error && /[А-Яа-яЁё]/.test(err.message)
          ? err.message
          : "Не удалось собрать PDF. Проверьте шрифт кириллицы и повторите.";
        throw new AuthzError(msg, 400);
      }
    }

    if (method === "GET" && path === "reports/csv") {
      const { actor, view } = await loadScoped(request);
      const kind = url.searchParams.get("kind") ?? "sales";
      if (kind === "payroll") {
        const rows = periodPayroll(view, (url.searchParams.get("period") ?? "30d") as Period, actor.sessionBranchId);
        return json({
          filename: `${DOWNLOAD_SLUG}-payroll.csv`,
          csv: toCsv(
            ["Сотрудник", "Смен", "Ставка", "Бонус", "Премия", "Доплата", "Штраф", "Аванс", "К выплате"],
            rows.map((r) => [r.user.name, r.shifts, r.base, r.bonus, r.premium, r.extra, r.fine, r.advanceOut, r.payable]),
          ),
        });
      }
      const k = computeKpis(view, { period: (url.searchParams.get("period") ?? "7d") as Period, branchId: actor.sessionBranchId });
      return json({
        filename: `${DOWNLOAD_SLUG}-period.csv`,
        csv: toCsv(["Показатель", "Значение"], [
          ["Выручка", k.revenue],
          ["Наличные", k.cash],
          ["Карта", k.card],
          ["QR", k.qr],
          ["Перевод", k.transfer],
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
      await loadLive(request);
      return json({
        filename: `${DOWNLOAD_SLUG}-nomenclature.csv`,
        csv: toCsv(["name", "category", "unit", "minQty", "avgCost"], [["Свинина шея", "Мясо", "kg", 10, 420]]),
      });
    }

    return json({ error: "not_found", path }, 404);
  } catch (err) {
    const path = pathOf(request, splat);
    if (err instanceof AuthzError) {
      if (path !== "auth/login" && path !== "auth/pin") {
        await persistOpsLog({ level: "warn", event: "api", detail: err.message, path });
      }
      return json({ error: err.message }, err.status, request);
    }
    if (err instanceof StoreUnavailableError || isDbUnavailableError(err)) {
      return json({ error: DB_UNAVAILABLE_MSG }, 503, request);
    }
    const message = opaqueApiError(err);
    await persistOpsLog({ level: "error", event: "api", detail: message, path });
    return json({ error: message }, isDbUnavailableError(err) ? 503 : 400, request);
  }
}
