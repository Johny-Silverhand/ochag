import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { AuthzError } from "../authz/error.ts";
import {
  assertAuthRate,
  assertPayloadSize,
  clientIp,
  CONTENT_SECURITY_POLICY,
  MAX_JSON_BYTES,
  rateLimit,
  resetRateLimits,
  securityHeaders,
} from "./http.ts";

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

  it("trips per-login rate even when IPs differ", () => {
    resetRateLimits();
    for (let i = 0; i < 12; i++) {
      const req = new Request("https://ochag.example/api/v1/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": `203.0.113.${i + 1}` },
      });
      assertAuthRate(req, "owner");
    }
    const extra = new Request("https://ochag.example/api/v1/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.8" },
    });
    assert.throws(
      () => assertAuthRate(extra, "owner"),
      (err: unknown) => err instanceof AuthzError && (err as AuthzError).status === 429,
    );
  });

  it("rejects oversized JSON bodies", () => {
    const req = new Request("https://ochag.example/api/v1/auth/onboard", {
      method: "POST",
      headers: { "content-length": String(MAX_JSON_BYTES + 1) },
    });
    assert.throws(
      () => assertPayloadSize(req, "x"),
      (err: unknown) => err instanceof AuthzError && (err as AuthzError).status === 413,
    );
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
    assert.match(headers["content-security-policy"] ?? "", /fonts\.googleapis\.com/);
    assert.equal(headers["access-control-allow-origin"], undefined);
    assert.equal(headers["strict-transport-security"], "max-age=63072000; includeSubDomains; preload");
  });

  it("allows the RestoPro production origin", () => {
    const req = new Request("https://preview.example/api/v1/state", {
      headers: { origin: "https://restopro-theta.vercel.app" },
    });
    const headers = securityHeaders(req);
    assert.equal(headers["access-control-allow-origin"], "https://restopro-theta.vercel.app");
  });

  it("allows the previous ochag-theta alias", () => {
    const req = new Request("https://preview.example/api/v1/state", {
      headers: { origin: "https://ochag-theta.vercel.app" },
    });
    assert.equal(securityHeaders(req)["access-control-allow-origin"], "https://ochag-theta.vercel.app");
  });

  it("does not reflect restopro.vercel.app — that host is another team", () => {
    const req = new Request("https://preview.example/api/v1/state", {
      headers: { origin: "https://restopro.vercel.app" },
    });
    assert.equal(securityHeaders(req)["access-control-allow-origin"], undefined);
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

  it("ships valid vercel.json whose CSP matches the app", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
    const cfg = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = cfg.headers[0]?.headers.find((h) => h.key === "Content-Security-Policy");
    assert.equal(csp?.value, CONTENT_SECURITY_POLICY);
  });

  it("uses the first public hop for client IP", () => {
    const req = new Request("https://ochag.example/api/v1/state", {
      headers: { "x-forwarded-for": "10.0.0.4, 203.0.113.9", "x-real-ip": "127.0.0.1" },
    });
    assert.equal(clientIp(req), "203.0.113.9");
  });
});
