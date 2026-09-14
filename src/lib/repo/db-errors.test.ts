import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DB_UNAVAILABLE_MSG,
  StoreUnavailableError,
  clientErrorMessage,
  isDbUnavailableError,
  isRetryableDbError,
  publicErrorMessage,
  withDbRetry,
  wrapDbError,
} from "./db-errors.ts";

describe("db error mapping", () => {
  it("maps Neon cold-start and timeout text to База временно недоступна", () => {
    const samples = [
      new Error("connect ETIMEDOUT"),
      new Error("the database system is starting up"),
      Object.assign(new Error("sorry, too many clients already"), { code: "53300" }),
      new Error("Connection terminated unexpectedly"),
      new Error("password authentication failed for user"),
      new Error("Failed to fetch"),
      new StoreUnavailableError(),
    ];
    for (const err of samples.slice(0, 4)) {
      assert.equal(isRetryableDbError(err), true, String(err));
    }
    assert.equal(isRetryableDbError(samples[4]), false);
    for (const err of samples) {
      assert.equal(publicErrorMessage(err), DB_UNAVAILABLE_MSG, String(err));
      assert.equal(isDbUnavailableError(err), true, String(err));
    }
  });

  it("keeps domain Russian messages", () => {
    assert.equal(publicErrorMessage(new Error("Неверный логин или PIN")), "Неверный логин или PIN");
    assert.equal(clientErrorMessage(new Error("Сеть уже создана")), "Сеть уже создана");
  });

  it("maps opaque client HTTP/JSON failures", () => {
    assert.equal(clientErrorMessage(new Error("HTTP 503")), DB_UNAVAILABLE_MSG);
    assert.equal(clientErrorMessage(new Error("Unexpected token < in JSON")), DB_UNAVAILABLE_MSG);
    assert.equal(clientErrorMessage(new Error("HTTP 400")), "Не удалось выполнить запрос. Попробуйте ещё раз.");
  });

  it("retries once on a retryable error then succeeds", async () => {
    let n = 0;
    const value = await withDbRetry(async () => {
      n += 1;
      if (n === 1) throw new Error("the database system is starting up");
      return "ok";
    }, 1);
    assert.equal(value, "ok");
    assert.equal(n, 2);
  });

  it("wraps a failed retry as StoreUnavailableError", async () => {
    await assert.rejects(
      () =>
        withDbRetry(async () => {
          throw Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
        }, 1),
      (err: unknown) => err instanceof StoreUnavailableError && err.message === DB_UNAVAILABLE_MSG,
    );
    assert.equal(wrapDbError(new Error("connect ETIMEDOUT")) instanceof StoreUnavailableError, true);
  });
});
