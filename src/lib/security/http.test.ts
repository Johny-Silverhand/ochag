import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { assertAuthRate, rateLimit, resetRateLimits, securityHeaders } from "./http.ts";

describe("API security helpers", () => {
  it("trips rate limit on login spam", () => {
    resetRateLimits();
    const req = new Request("https://ochag.example/api/v1/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    for (let i = 0; i < 20; i++) assertAuthRate(req);
    assert.throws(() => assertAuthRate(req), (err: unknown) => err instanceof AuthzError && (err as AuthzError).status === 429);
  });

  it("sets browser security headers and does not reflect unknown Origin", () => {
    const req = new Request("https://ochag.example/api/v1/state", {
      headers: { origin: "https://evil.example" },
    });
    const headers = securityHeaders(req);
    assert.equal(headers["x-content-type-options"], "nosniff");
    assert.equal(headers["x-frame-options"], "DENY");
    assert.match(headers["content-security-policy"] ?? "", /frame-ancestors 'none'/);
    assert.match(headers["content-security-policy"] ?? "", /https:\/\/grok\.com/);
    assert.equal(headers["access-control-allow-origin"], undefined);
  });

  it("counts a sliding window", () => {
    resetRateLimits();
    const a = rateLimit("t:1", 2, 60_000);
    const b = rateLimit("t:1", 2, 60_000);
    const c = rateLimit("t:1", 2, 60_000);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(c.ok, false);
  });
});
