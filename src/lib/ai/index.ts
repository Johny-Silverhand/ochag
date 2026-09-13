import { createHeuristicProvider } from "./heuristic";
import { createOllamaProvider, ollamaAvailable } from "./ollama";
import type { AiProvider } from "./provider";
import type { SafeMetrics } from "./safe-context";
import type { Insight } from "../domain/types";

export type { AiProvider } from "./provider";
export { safeMetrics } from "./safe-context";
export { ollamaConfig } from "./provider";

const heuristic = createHeuristicProvider();
const ollama = createOllamaProvider();

async function withFallback<T>(run: (p: AiProvider) => Promise<T>): Promise<{ value: T; provider: AiProvider["id"] }> {
  if (await ollamaAvailable()) {
    try {
      return { value: await run(ollama), provider: "ollama" };
    } catch (err) {
      console.warn("[ochag] Ollama failed, heuristic fallback:", err);
    }
  }
  return { value: await run(heuristic), provider: "heuristic" };
}

export async function periodNarrative(metrics: SafeMetrics) {
  return withFallback((p) => p.narrative(metrics));
}

export async function askMetrics(question: string, metrics: SafeMetrics) {
  return withFallback((p) => p.ask(question, metrics));
}

export async function recommendMetrics(metrics: SafeMetrics): Promise<{ value: Insight[]; provider: AiProvider["id"] }> {
  return withFallback((p) => p.recommend(metrics));
}
