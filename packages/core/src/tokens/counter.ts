import type { TokenCounter } from "../types/tokens.js";

/**
 * chars/4 BPE heuristic — within ~10% on English prose for GPT/Claude
 * tokenizers; cheap enough to run per section. Inject a real tokenizer
 * (js-tiktoken, @anthropic-ai/tokenizer) through TokenCounter when exact
 * counts matter (budget enforcement, billing).
 */
export const approxCounter: TokenCounter = {
  name: "approx-chars/4",
  count: (text: string): number => (text.length === 0 ? 0 : Math.ceil(text.length / 4)),
};
