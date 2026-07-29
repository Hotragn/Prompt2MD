import type { SectionKind } from "./document.js";
import type { EngineId } from "./engine.js";

/** Pluggable tokenizer. Core ships a chars/4 heuristic; callers may inject js-tiktoken etc. */
export interface TokenCounter {
  readonly name: string;
  count(text: string): number;
}

export interface SectionTokens {
  readonly sectionId: string;
  readonly kind: SectionKind;
  readonly tokens: number;
}

/**
 * First-class output of every conversion. `inputTokens` measures the original
 * text when the input was textual; for binary inputs it measures the raw
 * engine extraction (pre-optimization), so `ratio` always compares what the
 * user would otherwise have pasted vs. what prompt2md emits.
 */
export interface TokenReport {
  readonly counter: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** outputTokens / inputTokens (1.0 = no change; < 1 = savings). */
  readonly ratio: number;
  readonly budget?: number;
  readonly withinBudget?: boolean;
  readonly perSection: readonly SectionTokens[];
  readonly engine: EngineId;
  readonly escalated: boolean;
}
