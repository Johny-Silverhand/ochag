import { createHeuristicProvider } from "./heuristic";
import { createOllamaProvider, ollamaAvailable, ollamaUnreachableMessage, type FetchLike } from "./ollama";
import type { AiProvider, ResolvedOllama } from "./provider";
import { resolveOllamaConfig } from "./provider";
import type { SafeMetrics } from "./safe-context";
import type { Insight, NetworkSettings } from "../domain/types";

export type { AiProvider, ResolvedOllama } from "./provider";
export { safeMetrics } from "./safe-context";
export { ollamaConfig, resolveOllamaConfig } from "./provider";
export { ollamaAvailable } from "./ollama";

const heuristic = createHeuristicProvider();

export type AiRun<T> = {
  value: T;
  provider: AiProvider["id"];
  fallback: boolean;
  error?: string;
  source: ResolvedOllama["source"];
  model: string;
};

export async function withFallback<T>(
  cfg: ResolvedOllama,
  run: (p: AiProvider) => Promise<T>,
  fetchImpl: FetchLike = fetch,
): Promise<AiRun<T>> {
  if (!cfg.configured) {
    const reason =
      cfg.source === "off"
        ? "Ollama выключена в настройках сети"
        : "Ollama не настроена — эвристика по цифрам контура, не языковая модель";
    return {
      value: await run(heuristic),
      provider: "heuristic",
      fallback: true,
      error: reason,
      source: cfg.source,
      model: cfg.model,
    };
  }
  const ping = await ollamaAvailable(cfg, fetchImpl);
  if (!ping.ok) {
    const error = ollamaUnreachableMessage(cfg, ping.error ?? "нет связи");
    return {
      value: await run(heuristic),
      provider: "heuristic",
      fallback: true,
      error,
      source: cfg.source,
      model: cfg.model,
    };
  }
  try {
    const ollama = createOllamaProvider(cfg, fetchImpl);
    return {
      value: await run(ollama),
      provider: "ollama",
      fallback: false,
      source: cfg.source,
      model: cfg.model,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const error = ollamaUnreachableMessage(cfg, raw);
    return {
      value: await run(heuristic),
      provider: "heuristic",
      fallback: true,
      error,
      source: cfg.source,
      model: cfg.model,
    };
  }
}

export async function periodNarrative(metrics: SafeMetrics, settings?: NetworkSettings | null) {
  return withFallback(resolveOllamaConfig(settings), (p) => p.narrative(metrics));
}

export async function askMetrics(question: string, metrics: SafeMetrics, settings?: NetworkSettings | null) {
  return withFallback(resolveOllamaConfig(settings), (p) => p.ask(question, metrics));
}

export async function recommendMetrics(
  metrics: SafeMetrics,
  settings?: NetworkSettings | null,
): Promise<AiRun<Insight[]>> {
  return withFallback(resolveOllamaConfig(settings), (p) => p.recommend(metrics));
}
