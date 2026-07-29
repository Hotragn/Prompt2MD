import type { MarkdownDoc } from "../types/document.js";
import type { EngineId } from "../types/engine.js";
import type { SectionTokens, TokenCounter, TokenReport } from "../types/tokens.js";

export interface ReportContext {
  readonly counter: TokenCounter;
  readonly inputTokens: number;
  readonly engine: EngineId;
  readonly escalated: boolean;
  readonly budget?: number;
}

export function buildTokenReport(doc: MarkdownDoc, ctx: ReportContext): TokenReport {
  const perSection: SectionTokens[] = doc.sections.map((s) => ({
    sectionId: s.id,
    kind: s.kind,
    tokens: s.tokens,
  }));
  const outputTokens = perSection.reduce((n, s) => n + s.tokens, 0);
  return {
    counter: ctx.counter.name,
    inputTokens: ctx.inputTokens,
    outputTokens,
    ratio: ctx.inputTokens > 0 ? outputTokens / ctx.inputTokens : 1,
    perSection,
    engine: ctx.engine,
    escalated: ctx.escalated,
    ...(ctx.budget !== undefined
      ? { budget: ctx.budget, withinBudget: outputTokens <= ctx.budget }
      : {}),
  };
}
