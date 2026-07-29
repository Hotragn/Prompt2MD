import type { CacheProfile, MarkdownDoc } from "@prompt2md/core";

/**
 * Token-savings accounting (ADR-003). Two independent levers multiply:
 *
 *   1. Compression:   compressedTokens = ratio * rawTokens
 *   2. Prompt cache:  effective(first) = prefix * (1 + writePremium) + volatile
 *                     effective(next)  = prefix * readCostFactor      + volatile
 *
 * where `prefix` is the stable-section run at the head of the doc (eligible
 * only when >= profile.minPrefixTokens) and `volatile` is everything after it.
 * Amortized effective tokens over N calls:
 *
 *   amortized(N) = (effective(first) + (N-1) * effective(next)) / N
 *
 * The headline number agents care about is `subsequentSavingsVsRawPct`:
 * what each repeat call costs relative to pasting the raw original.
 */

export interface PhaseTrace {
  readonly phase: "structure" | "strip" | "summarize" | "layout";
  readonly tokens: number;
}

export interface CacheSavings {
  readonly provider: CacheProfile["provider"];
  readonly stablePrefixTokens: number;
  readonly volatileTokens: number;
  /** False when the stable prefix is under the provider minimum — no cache benefit. */
  readonly cacheEligible: boolean;
  readonly effectiveTokensFirstCall: number;
  readonly effectiveTokensPerSubsequentCall: number;
  readonly amortizedTokensOver10Calls: number;
}

export interface SavingsReport {
  readonly rawTokens: number;
  readonly compressedTokens: number;
  readonly savedTokens: number;
  /** compressed / raw. */
  readonly ratio: number;
  readonly phases: readonly PhaseTrace[];
  readonly cache: CacheSavings;
  /** Cost of each repeat call vs pasting the raw original, as % saved. */
  readonly subsequentSavingsVsRawPct: number;
}

/** Stable-section run length (tokens) at the head of the document. */
export function stablePrefixTokens(doc: MarkdownDoc): number {
  let tokens = 0;
  for (const section of doc.sections) {
    if (section.volatility !== "stable") break;
    tokens += section.tokens;
  }
  return tokens;
}

export function buildSavings(
  rawTokens: number,
  doc: MarkdownDoc,
  phases: readonly PhaseTrace[],
  profile: CacheProfile,
): SavingsReport {
  const compressedTokens = doc.sections.reduce((n, s) => n + s.tokens, 0);
  const prefix = stablePrefixTokens(doc);
  const volatile = compressedTokens - prefix;
  const cacheEligible = prefix >= profile.minPrefixTokens;

  const effectiveFirst = cacheEligible
    ? Math.round(prefix * (1 + profile.writePremium) + volatile)
    : compressedTokens;
  const effectiveNext = cacheEligible
    ? Math.round(prefix * profile.readCostFactor + volatile)
    : compressedTokens;

  return {
    rawTokens,
    compressedTokens,
    savedTokens: rawTokens - compressedTokens,
    ratio: rawTokens > 0 ? compressedTokens / rawTokens : 1,
    phases,
    cache: {
      provider: profile.provider,
      stablePrefixTokens: prefix,
      volatileTokens: volatile,
      cacheEligible,
      effectiveTokensFirstCall: effectiveFirst,
      effectiveTokensPerSubsequentCall: effectiveNext,
      amortizedTokensOver10Calls: Math.round((effectiveFirst + 9 * effectiveNext) / 10),
    },
    subsequentSavingsVsRawPct:
      rawTokens > 0 ? Math.round((1 - effectiveNext / rawTokens) * 1000) / 10 : 0,
  };
}
