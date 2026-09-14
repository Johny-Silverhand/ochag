import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOllamaProvider, ollamaAvailable } from "./ollama.ts";
import { withFallback } from "./index.ts";
import { resolveOllamaConfig } from "./provider.ts";
import { sampleMetrics } from "./safe-context.ts";
import { defaultSettings } from "../domain/types.ts";

const metrics = sampleMetrics();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("resolveOllamaConfig", () => {
  it("is unset without settings flag or env", () => {
    const prev = process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_BASE_URL;
    const cfg = resolveOllamaConfig({ ...defaultSettings(), ollamaEnabled: undefined, ollamaBaseUrl: "" });
    assert.equal(cfg.configured, false);
    assert.equal(cfg.source, "unset");
    if (prev) process.env.OLLAMA_BASE_URL = prev;
  });

  it("treats the default switch as off, not a live model", () => {
    const cfg = resolveOllamaConfig(defaultSettings());
    assert.equal(cfg.configured, false);
    assert.equal(cfg.source, "off");
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
    const margin = await provider.explain("margin", metrics);
    assert.match(margin, /фудкост|марж/i);
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
    const calc = await withFallback(cfg, (p) => p.explain("forecast", metrics), fetchImpl);
    assert.equal(calc.provider, "heuristic");
    assert.equal(calc.fallback, true);
    assert.match(calc.value, /темп|план/i);
  });

  it("does not pretend a model is live when Ollama is unset", async () => {
    const unset = resolveOllamaConfig({ ...defaultSettings(), ollamaEnabled: false });
    const run = await withFallback(unset, (p) => p.explain("margin", metrics));
    assert.equal(run.provider, "heuristic");
    assert.equal(run.fallback, true);
    assert.match(run.error ?? "", /выключена|не настроена/i);
  });
});
