import type { MarkdownDoc } from "../types/document.js";

export type CacheProvider = "anthropic" | "openai" | "gemini" | "kimi";

/**
 * Provider prompt-cache behavior the LAYOUT stage optimizes for.
 * readCostFactor = fraction of the normal input price charged on a cache hit.
 */
export interface CacheProfile {
  readonly provider: CacheProvider;
  /** Prefixes shorter than this cannot cache at all. */
  readonly minPrefixTokens: number;
  /** explicit — caller marks breakpoints; automatic — provider caches longest seen prefix. */
  readonly breakpointStyle: "explicit" | "automatic";
  /** Max explicit breakpoints (0 when automatic). */
  readonly maxBreakpoints: number;
  readonly readCostFactor: number;
  /** Extra fraction of input price charged when WRITING the cache (first call). */
  readonly writePremium: number;
}

export const CACHE_PROFILES: Record<CacheProvider, CacheProfile> = {
  anthropic: { provider: "anthropic", minPrefixTokens: 1024, breakpointStyle: "explicit", maxBreakpoints: 4, readCostFactor: 0.1, writePremium: 0.25 },
  openai: { provider: "openai", minPrefixTokens: 1024, breakpointStyle: "automatic", maxBreakpoints: 0, readCostFactor: 0.5, writePremium: 0 },
  gemini: { provider: "gemini", minPrefixTokens: 1024, breakpointStyle: "automatic", maxBreakpoints: 0, readCostFactor: 0.25, writePremium: 0 },
  // Moonshot context caching; factors are conservative — re-verify before GA.
  kimi: { provider: "kimi", minPrefixTokens: 1024, breakpointStyle: "automatic", maxBreakpoints: 0, readCostFactor: 0.1, writePremium: 0 },
};

/**
 * Stable-prefix layout: stable sections first (original relative order kept),
 * volatile sections last, so repeated prompts share the longest unchanged
 * prefix. Phase 2 ships the mechanism; the Phase 3 optimizer assigns
 * volatility and inserts provider breakpoints.
 */
export function orderForCache(doc: MarkdownDoc): MarkdownDoc {
  const stable = doc.sections.filter((s) => s.volatility === "stable");
  const volatile = doc.sections.filter((s) => s.volatility === "volatile");
  if (volatile.length === 0) return doc;
  return { ...doc, sections: [...stable, ...volatile] };
}

/** Longest cacheable prefix (in tokens) under a profile, given the current layout. */
export function cacheablePrefixTokens(doc: MarkdownDoc, profile: CacheProfile): number {
  let tokens = 0;
  for (const section of doc.sections) {
    if (section.volatility !== "stable") break;
    tokens += section.tokens;
  }
  return tokens >= profile.minPrefixTokens ? tokens : 0;
}
