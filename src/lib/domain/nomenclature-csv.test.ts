import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNomenclatureCsv } from "./nomenclature-csv.ts";

describe("parseNomenclatureCsv", () => {
  it("imports a headerless Russian CSV", () => {
    const rows = parseNomenclatureCsv("Мука;Бакалея;kg;10;42");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, "Мука");
    assert.equal(rows[0]?.unit, "kg");
  });

  it("skips a header row and empty lines", () => {
    const rows = parseNomenclatureCsv("name;category;unit;minQty;avgCost\n\nСахар;Бакалея;kg;5;55\n");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, "Сахар");
  });
});
