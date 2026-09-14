import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APP_NAME, APP_SLUG, DOWNLOAD_SLUG, LOGIN_INTRO, NETWORK_NAME, VENDOR_LINE, VENDOR_URL } from "./brand.ts";

describe("login intro copy", () => {
  it("shows RestoPro as the product name", () => {
    assert.equal(APP_NAME, "RestoPro");
    assert.equal(NETWORK_NAME, "RestoPro");
    assert.equal(DOWNLOAD_SLUG, "restopro");
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
});
