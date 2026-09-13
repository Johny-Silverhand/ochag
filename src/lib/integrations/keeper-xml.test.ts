import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseKeeperXml, SAMPLE_KEEPER_XML } from "./keeper-xml.ts";

describe("r_keeper XML stub", () => {
  it("reads receipts and lines from the sample dump", () => {
    const rows = parseKeeperXml(SAMPLE_KEEPER_XML);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.number, "K-9001");
    assert.equal(rows[0]?.payType, "card");
    assert.equal(rows[1]?.items.length, 4);
    assert.equal(rows[1]?.sum, 860);
  });
});
