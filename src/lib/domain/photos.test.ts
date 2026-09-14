import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthzError } from "../authz/error.ts";
import { MAX_PHOTO_CHARS, sanitizePhotos } from "./photos.ts";

describe("sanitizePhotos", () => {
  it("accepts a small jpeg data URL and strips path traversal from the name", () => {
    const dataUrl = "data:image/jpeg;base64,aaaa";
    const rows = sanitizePhotos([
      { name: "../../etc/passwd", mime: "image/jpeg", dataUrl },
      { name: "ok.png", mime: "image/png", dataUrl: "data:image/png;base64,bb" },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.name, "passwd");
    assert.ok(!rows[0]?.name.includes(".."));
    assert.ok(!rows[0]?.name.includes("/"));
  });

  it("rejects svg, remote URLs and oversized payloads", () => {
    assert.throws(
      () => sanitizePhotos([{ name: "x", mime: "image/svg+xml", dataUrl: "data:image/svg+xml;base64,YQ==" }]),
      AuthzError,
    );
    assert.throws(
      () => sanitizePhotos([{ name: "x", mime: "image/jpeg", dataUrl: "https://evil.example/p.jpg" }]),
      AuthzError,
    );
    assert.throws(
      () =>
        sanitizePhotos([
          { name: "big", mime: "image/jpeg", dataUrl: `data:image/jpeg;base64,${"a".repeat(MAX_PHOTO_CHARS)}` },
        ]),
      AuthzError,
    );
  });
});
