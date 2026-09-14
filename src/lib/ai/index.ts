import { createHeuristicProvider } from "./heuristic.ts";
import { createOllamaProvider, ollamaAvailable, ollamaUnreachableMessage, type FetchLike } from "./ollama.ts";
import type { AiProvider, ResolvedOllama } from "./provider.ts";
import { resolveOllamaConfig } from "./provider.ts";
import type { SafeMetrics } from "./safe-context.ts";
import type { Insight, NetworkSettings } from "../domain/types.ts";
import type { CalcTask } from "./calc.ts";

export type { AiProvider, ResolvedOllama } from "./provider.ts";
export { safeMetrics } from "./safe-context.ts";
export { ollamaConfig, resolveOllamaConfig } from "./provider.ts";
export { ollamaAvailable } from "./ollama.ts";
export { CALC_TASKS, isCalcTask, calcSnapshot, heuristicExplain } from "./calc.ts";
export type { CalcTask } from "./calc.ts";

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

export async function explainCalc(task: CalcTask, metrics: SafeMetrics, settings?: NetworkSettings | null) {
  return withFallback(resolveOllamaConfig(settings), (p) => p.explain(task, metrics));
}

export async function recommendMetrics(
  metrics: SafeMetrics,
  settings?: NetworkSettings | null,
): Promise<AiRun<Insight[]>> {
  return withFallback(resolveOllamaConfig(settings), (p) => p.recommend(metrics));
}
