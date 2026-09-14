import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOllamaProvider, ollamaAvailable } from "./ollama.ts";
import { withFallback } from "./index.ts";
import { resolveOllamaConfig } from "./provider.ts";
import type { SafeMetrics } from "./safe-context.ts";
import { defaultSettings } from "../domain/types.ts";

const metrics: SafeMetrics = {
  period: "7d",
  branch: "network",
  revenue: 100000,
  cogs: 30000,
  foodCost: 30,
  writeoffs: 500,
  opex: 10000,
  payroll: 20000,
  net: 39500,
  checks: 80,
  avgCheck: 1250,
  cash: 40000,
  topDishes: [{ name: "Шашлык", qty: 40, sum: 28000 }],
  writeoffReasons: [],
  stopList: [],
  openShifts: 1,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("resolveOllamaConfig", () => {
  it("is unset without settings or env", () => {
    const prev = process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_BASE_URL;
    const cfg = resolveOllamaConfig(defaultSettings());
    assert.equal(cfg.configured, false);
    assert.equal(cfg.source, "unset");
    if (prev) process.env.OLLAMA_BASE_URL = prev;
  });

  it("uses network settings when enabled", () => {
    const cfg = resolveOllamaConfig({
      ...defaultSettings(),
      ollamaEnabled: true,
      ollamaBaseUrl: "https://ollama.cafe.example",
      ollamaModel: "qwen2.5",
    });
    assert.equal(cfg.configured, true);
    assert.equal(cfg.source, "settings");
    assert.equal(cfg.base, "https://ollama.cafe.example");
    assert.equal(cfg.model, "qwen2.5");
  });
});

describe("Ollama adapter", () => {
  const cfg = {
    configured: true,
    base: "http://127.0.0.1:11434",
    model: "llama3.2",
    source: "settings" as const,
  };

  it("happy-path: live Ollama chat completions", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) return jsonResponse({ models: [] });
      assert.match(url, /\/v1\/chat\/completions$/);
      const body = JSON.parse(String(init?.body ?? "{}")) as { model: string };
      assert.equal(body.model, "llama3.2");
      return jsonResponse({ choices: [{ message: { content: "Выручка в порядке, фудкост в норме." } }] });
    };
    const ping = await ollamaAvailable(cfg, fetchImpl);
    assert.equal(ping.ok, true);
    const provider = createOllamaProvider(cfg, fetchImpl);
    const text = await provider.narrative(metrics);
    assert.match(text, /фудкост/i);
    const run = await withFallback(cfg, (p) => p.narrative(metrics), fetchImpl);
    assert.equal(run.provider, "ollama");
    assert.equal(run.fallback, false);
    assert.equal(run.error, undefined);
  });

  it("falls back to labelled heuristics when Ollama is down", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const run = await withFallback(cfg, (p) => p.narrative(metrics), fetchImpl);
    assert.equal(run.provider, "heuristic");
    assert.equal(run.fallback, true);
    assert.match(run.error ?? "", /не ответила|недоступна|ECONNREFUSED/i);
    assert.match(run.value, /Выручка 100000/);
  });

  it("does not pretend a model is live when Ollama is unset", async () => {
    const unset = resolveOllamaConfig({ ...defaultSettings(), ollamaEnabled: false });
    const run = await withFallback(unset, (p) => p.ask("фудкост", metrics));
    assert.equal(run.provider, "heuristic");
    assert.equal(run.fallback, true);
    assert.match(run.error ?? "", /выключена|не настроена/i);
  });
});
