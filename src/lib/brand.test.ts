import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { PAYMENT_NOTE, TARIFFS } from "./billing/plans.ts";
import { APP_HOST, APP_NAME, APP_ORIGIN, APP_ORIGIN_ALIASES, APP_SLUG, DOWNLOAD_SLUG, LOGIN_INTRO, MARKETING_HERO_SRC, NETWORK_NAME, VENDOR_LINE, VENDOR_URL } from "./brand.ts";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("login intro copy", () => {
  it("shows RestoPro as the product name", () => {
    assert.equal(APP_NAME, "RestoPro");
    assert.equal(NETWORK_NAME, "RestoPro");
    assert.equal(DOWNLOAD_SLUG, "restopro");
    assert.equal(APP_ORIGIN, "https://restopro-theta.vercel.app");
    assert.equal(APP_HOST, "restopro-theta.vercel.app");
    assert.deepEqual(APP_ORIGIN_ALIASES, [
      "https://restopro-theta.vercel.app",
      "https://ochag-theta.vercel.app",
    ]);
    assert.equal(APP_ORIGIN_ALIASES.includes("https://restopro.vercel.app"), false);
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

  it("cache-busts the login explainer hero as RestoPro", () => {
    assert.match(MARKETING_HERO_SRC, /^\/marketing\/hero-restopro\.png\?v=/);
    assert.equal(MARKETING_HERO_SRC.includes("Очаг"), false);
    const commercial = readFileSync(join(srcRoot, "components/auth/commercial.tsx"), "utf8");
    assert.match(commercial, /MARKETING_HERO_SRC/);
    assert.equal(commercial.includes("/marketing/hero.png"), false);
  });

  it("does not show demo stage framing in user-facing UI source", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(tsx|ts)$/.test(ent.name)) continue;
        if (ent.name.endsWith(".test.ts")) continue;
        const text = readFileSync(path, "utf8");
        if (/Этап\s*\d|ЭТАП\s*\d|Stage\s*\d/.test(text)) hits.push(path.slice(srcRoot.length + 1));
      }
    };
    walk(join(srcRoot, "components"));
    walk(join(srcRoot, "routes"));
    walk(join(srcRoot, "lib"));
    assert.deepEqual(hits, []);
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

  it("does not surface Grok App chrome in product UI source", () => {
    const hits: string[] = [];
    const skip = new Set(["brand.test.ts"]);
    const walk = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(tsx|ts|html)$/.test(ent.name) || skip.has(ent.name)) continue;
        if (ent.name.endsWith(".test.ts")) continue;
        const text = readFileSync(path, "utf8");
        if (/Grok App|\?install=1|\/__grok\/|Created with Grok|Continue with Grok/.test(text)) {
          hits.push(path.slice(srcRoot.length + 1));
        }
      }
    };
    walk(join(srcRoot, "components"));
    walk(join(srcRoot, "routes"));
    walk(join(srcRoot, "lib"));
    assert.deepEqual(hits, []);
    const root = readFileSync(join(srcRoot, "routes/__root.tsx"), "utf8");
    assert.match(root, /href: "\/manifest\.webmanifest"/);
    assert.equal(root.includes("/__grok/"), false);
  });

  it("does not advertise *-theta hosts in user-facing UI source", () => {
    const hits: string[] = [];
    const skip = new Set(["brand.ts", "brand.test.ts"]);
    const walk = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(tsx|ts)$/.test(ent.name) || skip.has(ent.name)) continue;
        if (ent.name.endsWith(".test.ts")) continue;
        const text = readFileSync(path, "utf8");
        if (/restopro-theta|ochag-theta/.test(text)) hits.push(path.slice(srcRoot.length + 1));
      }
    };
    walk(join(srcRoot, "components"));
    walk(join(srcRoot, "routes"));
    walk(join(srcRoot, "lib"));
    assert.deepEqual(hits, []);
  });

  it("keeps onboarding and tariff copy free of stub and deadline theater", () => {
    const trial = TARIFFS.find((t) => t.id === "trial")!;
    assert.equal(trial.name, "Пробный");
    assert.equal(trial.period, "бесплатно");
    assert.equal(trial.bullets.some((b) => /срок|30 дней/.test(b)), false);
    assert.match(PAYMENT_NOTE, /не сохраняются/);
    assert.equal(/заглушк|симуляц|дедлайн|другой разработчик/i.test(PAYMENT_NOTE), false);

    const surfaces = [
      readFileSync(join(srcRoot, "components/auth/commercial.tsx"), "utf8"),
      readFileSync(join(srcRoot, "routes/index.tsx"), "utf8"),
      readFileSync(join(srcRoot, "routes/_app/settings.tsx"), "utf8"),
      readFileSync(join(srcRoot, "lib/billing/plans.ts"), "utf8"),
      readFileSync(join(srcRoot, "lib/api/dispatch.ts"), "utf8"),
    ];
    for (const text of surfaces) {
      assert.equal(/заглушк|Цены-заглушк|симуляц|После срока|другой разработчик|команда разработчик|дедлайн/i.test(text), false);
    }
  });
});
