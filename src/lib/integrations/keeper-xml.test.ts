import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseKeeperXml, SAMPLE_KEEPER_XML, SAMPLE_RK7_CHECK_XML, normalizeRk7Units } from "./keeper-xml.ts";

describe("r_keeper XML", () => {
  it("reads receipts and lines from the sample dump", () => {
    const rows = parseKeeperXml(SAMPLE_KEEPER_XML);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.number, "K-9001");
    assert.equal(rows[0]?.payType, "card");
    assert.equal(rows[1]?.items.length, 4);
    assert.equal(rows[1]?.sum, 860);
    assert.equal(rows[0]?.items[0]?.qty, 2);
    assert.equal(rows[0]?.items[0]?.sum, 1380);
  });

  it("reads Check/Dish dumps from the manager station", () => {
    const rows = parseKeeperXml(SAMPLE_RK7_CHECK_XML);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.number, "45");
    assert.equal(rows[0]?.payType, "card");
    assert.equal(rows[1]?.payType, "cash");
    assert.equal(rows[0]?.items[0]?.name, "Шашлык из свинины");
  });

  it("scales RK7 thousandths/kopecks but leaves ruble file dumps alone", () => {
    assert.deepEqual(normalizeRk7Units(2, 1380), { qty: 2, sum: 1380 });
    assert.deepEqual(normalizeRk7Units(2000, 138000), { qty: 2, sum: 1380 });
  });
});
