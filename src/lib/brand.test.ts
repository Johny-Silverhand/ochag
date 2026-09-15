import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { APP_NAME, APP_ORIGIN, APP_ORIGIN_ALIASES, APP_SLUG, DOWNLOAD_SLUG, LOGIN_INTRO, NETWORK_NAME, VENDOR_LINE, VENDOR_URL } from "./brand.ts";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("login intro copy", () => {
  it("shows RestoPro as the product name", () => {
    assert.equal(APP_NAME, "RestoPro");
    assert.equal(NETWORK_NAME, "RestoPro");
    assert.equal(DOWNLOAD_SLUG, "restopro");
    assert.equal(APP_ORIGIN, "https://restopro-theta.vercel.app");
    assert.deepEqual(APP_ORIGIN_ALIASES, [
      "https://restopro-theta.vercel.app",
      "https://ochag-theta.vercel.app",
    ]);
    assert.equal(APP_ORIGIN.includes("restopro.vercel.app"), false);
    assert.equal(APP_NAME.includes("Очаг"), false);
    assert.equal(NETWORK_NAME.includes("Очаг"), false);
  });

  it("keeps the polished product line from the login screen", () => {
    assert.match(LOGIN_INTRO, /Контур склада, смен и прибыли/);
    assert.equal(LOGIN_INTRO.includes("Новый объект — тариф"), false);
    assert.equal(LOGIN_INTRO.includes("Создать сеть"), false);
  });

  it("names Arach.tech only as the vendor line", () => {
    assert.equal(VENDOR_LINE, "Разработано Arach.tech");
    assert.equal(VENDOR_URL, "https://arach.tech");
    assert.equal(VENDOR_LINE.includes("Victimok"), false);
    assert.equal(APP_SLUG, "ochag");
  });

  it("renders RestoPro on the boot / pending splash", () => {
    const boot = readFileSync(join(srcRoot, "components/layout/app-shell.tsx"), "utf8");
    assert.match(boot, /export function BootScreen/);
    assert.match(boot, /\{APP_NAME\}/);
    assert.equal(boot.includes("ОЧАГ"), false);
    assert.equal(boot.includes("Очаг"), false);
  });

  it("keeps Очаг off user-facing UI source", () => {
    const hits: string[] = [];
    const skip = new Set(["brand.test.ts", "bootstrap.test.ts"]);
    const walk = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === "app-data") continue;
          walk(path);
          continue;
        }
        if (!/\.(tsx|ts|html)$/.test(ent.name) || skip.has(ent.name)) continue;
        if (ent.name.endsWith(".test.ts")) continue;
        const text = readFileSync(path, "utf8");
        if (/Очаг|ОЧАГ/.test(text)) hits.push(path.slice(srcRoot.length + 1));
      }
    };
    walk(join(srcRoot, "components"));
    walk(join(srcRoot, "routes"));
    walk(join(srcRoot, "lib"));
    assert.deepEqual(hits, []);
  });
});
