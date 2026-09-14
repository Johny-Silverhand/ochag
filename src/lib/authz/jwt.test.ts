import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { signActor, verifyActor, bearerToken } from "./jwt.ts";
import type { Actor } from "./actor.ts";

const actor: Actor = {
  userId: "u-1",
  role: "owner",
  homeBranchId: "br-1",
  sessionBranchId: "br-1",
  name: "Кирилл",
  ownerId: "u-1",
  sessionId: "sess-1",
};

const prev = {
  secret: process.env.OCHAG_JWT_SECRET,
  previous: process.env.OCHAG_JWT_SECRET_PREVIOUS,
  nodeEnv: process.env.NODE_ENV,
  ochagEnv: process.env.OCHAG_ENV,
  vercel: process.env.VERCEL_ENV,
};

afterEach(() => {
  if (prev.secret === undefined) delete process.env.OCHAG_JWT_SECRET;
  else process.env.OCHAG_JWT_SECRET = prev.secret;
  if (prev.previous === undefined) delete process.env.OCHAG_JWT_SECRET_PREVIOUS;
  else process.env.OCHAG_JWT_SECRET_PREVIOUS = prev.previous;
  if (prev.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prev.nodeEnv;
  if (prev.ochagEnv === undefined) delete process.env.OCHAG_ENV;
  else process.env.OCHAG_ENV = prev.ochagEnv;
  if (prev.vercel === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prev.vercel;
});

describe("JWT", () => {
  it("reads Bearer header and ignores cookie fallback", () => {
    const cookieOnly = new Request("https://ochag.example/api/v1/state", {
      headers: { cookie: "ochag_token=stolen" },
    });
    assert.equal(bearerToken(cookieOnly), null);
    const bearer = new Request("https://ochag.example/api/v1/state", {
      headers: { authorization: "Bearer real-token" },
    });
    assert.equal(bearerToken(bearer), "real-token");
  });

  it("verifies a token signed with the previous secret during rotation", async () => {
    process.env.OCHAG_JWT_SECRET = "old-rotation-secret-value";
    delete process.env.OCHAG_JWT_SECRET_PREVIOUS;
    const token = await signActor(actor);
    process.env.OCHAG_JWT_SECRET = "new-rotation-secret-value";
    process.env.OCHAG_JWT_SECRET_PREVIOUS = "old-rotation-secret-value";
    const got = await verifyActor(token);
    assert.equal(got.userId, "u-1");
    assert.equal(got.sessionId, "sess-1");
  });
});
