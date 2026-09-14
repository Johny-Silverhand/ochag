import type { Insight, NetworkSettings } from "../domain/types.ts";
import type { SafeMetrics } from "./safe-context.ts";

export interface AiProvider {
  id: "ollama" | "heuristic";
  narrative(metrics: SafeMetrics): Promise<string>;
  ask(question: string, metrics: SafeMetrics): Promise<string>;
  recommend(metrics: SafeMetrics): Promise<Insight[]>;
}

export type OllamaSource = "settings" | "env" | "unset" | "off";

export interface ResolvedOllama {
  configured: boolean;
  base: string;
  model: string;
  source: OllamaSource;
}

function envOf() {
  const base = (typeof process !== "undefined" ? process.env.OLLAMA_BASE_URL : undefined)?.trim() || "";
  const model = (typeof process !== "undefined" ? process.env.OLLAMA_MODEL : undefined)?.trim() || "llama3.2";
  return { base, model };
}

export function resolveOllamaConfig(settings?: NetworkSettings | null): ResolvedOllama {
  const env = envOf();
  const enabled = settings?.ollamaEnabled;
  const settingsBase = settings?.ollamaBaseUrl?.trim() || "";
  const settingsModel = settings?.ollamaModel?.trim() || "";
  if (enabled === false) {
    return { configured: false, base: "", model: settingsModel || env.model, source: "off" };
  }
  if (enabled && settingsBase) {
    return {
      configured: true,
      base: settingsBase.replace(/\/$/, ""),
      model: settingsModel || env.model || "llama3.2",
      source: "settings",
    };
  }
  if (env.base) {
    return { configured: true, base: env.base.replace(/\/$/, ""), model: env.model || "llama3.2", source: "env" };
  }
  return { configured: false, base: "", model: settingsModel || env.model || "llama3.2", source: "unset" };
}

/** Env-only view. Prefer resolveOllamaConfig(settings) in API. */
export function ollamaConfig() {
  const resolved = resolveOllamaConfig();
  return {
    base: resolved.base || "http://127.0.0.1:11434",
    model: resolved.model,
  };
}
