import type { LlmGateway, TokenCounter } from "@prompt2md/core";

/**
 * Phase 3 summarizers. The LLM summarizer is preferred; the extractive one is
 * the deterministic fallback (no gateway configured, CI, offline) — it keeps
 * leading sentences, which degrades gracefully instead of failing.
 */

export interface Summarizer {
  readonly name: string;
  summarize(text: string, targetTokens: number): Promise<string>;
}

export function createExtractiveSummarizer(counter: TokenCounter): Summarizer {
  return {
    name: "extractive-lead",
    summarize(text: string, targetTokens: number): Promise<string> {
      const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];
      let summary = "";
      for (const sentence of sentences) {
        const next = summary + sentence;
        if (summary.length > 0 && counter.count(next) > targetTokens) break;
        summary = next;
      }
      const result = summary.trim();
      return Promise.resolve(result.length < text.trim().length ? `${result} […]` : result);
    },
  };
}

const SUMMARY_RULES = `Compress the text below to at most the requested token budget.
Preserve every number, name, date, and decision verbatim; drop redundancy and filler.
Keep the same language and Markdown structure where present. Output ONLY the compressed text.`;

export function createLlmSummarizer(gateway: LlmGateway, model?: string): Summarizer {
  return {
    name: "llm",
    async summarize(text: string, targetTokens: number): Promise<string> {
      const response = await gateway.complete({
        messages: [
          { role: "system", content: SUMMARY_RULES },
          { role: "user", content: `Token budget: ${targetTokens}\n\n${text}` },
        ],
        temperature: 0,
        maxTokens: Math.max(64, Math.ceil(targetTokens * 1.5)),
        ...(model !== undefined ? { model } : {}),
      });
      return response.text.trim();
    },
  };
}
