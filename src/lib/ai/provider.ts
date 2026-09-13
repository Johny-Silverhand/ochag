import type { Insight } from "../domain/types";
import type { SafeMetrics } from "./safe-context";

export interface AiProvider {
  id: "ollama" | "heuristic";
  narrative(metrics: SafeMetrics): Promise<string>;
  ask(question: string, metrics: SafeMetrics): Promise<string>;
  recommend(metrics: SafeMetrics): Promise<Insight[]>;
}

export function ollamaConfig() {
  const base = (typeof process !== "undefined" ? process.env.OLLAMA_BASE_URL : undefined)?.trim() || "http://127.0.0.1:11434";
  const model = (typeof process !== "undefined" ? process.env.OLLAMA_MODEL : undefined)?.trim() || "llama3.2";
  return { base: base.replace(/\/$/, ""), model };
}
