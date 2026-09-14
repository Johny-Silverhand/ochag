import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { forecastOf, heuristicExplain, isCalcTask, marginOf, shiftPlanOf } from "./calc.ts";
import { sampleMetrics } from "./safe-context.ts";

describe("AI calc helpers", () => {
  it("computes gross margin from contribution / revenue", () => {
    const m = marginOf(sampleMetrics({ revenue: 200000, cogs: 60000, contribution: 140000, grossMarginPct: 70, foodCost: 30 }));
    assert.equal(m.contribution, 140000);
    assert.equal(m.grossMarginPct, 70);
  });

  it("forecasts month run-rate against the plan", () => {
    const f = forecastOf(
      sampleMetrics({
        monthFact: 280000,
        planTarget: 720000,
        daysElapsed: 10,
        daysInMonth: 30,
        runRateMonth: 840000,
      }),
    );
    assert.equal(f.runRateMonth, 840000);
    assert.equal(f.onPace, true);
    assert.equal(f.gap, -120000);
  });

  it("shift plan uses peak hour from cheque timestamps", () => {
    const s = shiftPlanOf(sampleMetrics({ peakHour: 19, peakLabel: "19:00", peakChecks: 12, avgCheck: 1100 }));
    assert.equal(s.peakHour, 19);
    assert.equal(s.avgCheck, 1100);
    const text = heuristicExplain("shift", sampleMetrics({ peakHour: 19, peakLabel: "19:00" }));
    assert.match(text, /19:00/);
    assert.match(text, /вечерн/i);
  });

  it("rejects free-form chat as a calc task", () => {
    assert.equal(isCalcTask("margin"), true);
    assert.equal(isCalcTask("ask"), false);
    assert.equal(isCalcTask("chat"), false);
    assert.equal(isCalcTask(""), false);
  });

  it("margin heuristic is labelled formula text, not a pretend model", () => {
    const text = heuristicExplain("margin", sampleMetrics({ foodCost: 36, writeoffSharePct: 3.2 }));
    assert.match(text, /Фудкост 36%/);
    assert.match(text, /выше коридора/);
  });
});
