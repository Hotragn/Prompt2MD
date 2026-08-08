import { describe, expect, it } from "vitest";
import { CACHE_PROFILES } from "../src/gateway/cache-profiles.js";
import type { MarkdownDoc, MarkdownSection } from "../src/types/document.js";
import { buildSavings, stablePrefixTokens } from "../src/compress/savings.js";

const section = (id: string, volatility: "stable" | "volatile", tokens: number): MarkdownSection => ({
  id,
  kind: "paragraph",
  markdown: id,
  tokens,
  volatility,
});

const doc = (sections: MarkdownSection[]): MarkdownDoc => ({ sourceId: "x", sections, warnings: [] });

const PHASES = [
  { phase: "structure", tokens: 10_000 },
  { phase: "strip", tokens: 8_000 },
  { phase: "summarize", tokens: 2_500 },
  { phase: "layout", tokens: 2_500 },
] as const;

describe("ADR-003 savings math", () => {
  it("computes the anthropic worked example exactly", () => {
    // 10k raw -> 2.5k compressed: 2k stable prefix + 500 volatile.
    const d = doc([section("a", "stable", 1500), section("b", "stable", 500), section("c", "volatile", 500)]);
    const report = buildSavings(10_000, d, [...PHASES], CACHE_PROFILES.anthropic);

    expect(report.compressedTokens).toBe(2500);
    expect(report.savedTokens).toBe(7500);
    expect(report.ratio).toBeCloseTo(0.25);
    expect(report.cache.cacheEligible).toBe(true);
    // first call: 2000 * 1.25 + 500
    expect(report.cache.effectiveTokensFirstCall).toBe(3000);
    // repeat calls: 2000 * 0.1 + 500
    expect(report.cache.effectiveTokensPerSubsequentCall).toBe(700);
    // amortized over 10: (3000 + 9*700) / 10
    expect(report.cache.amortizedTokensOver10Calls).toBe(930);
    // each repeat call costs 700 vs pasting 10k raw -> 93% saved
    expect(report.subsequentSavingsVsRawPct).toBe(93);
  });

  it("declares cache ineligible below the provider prefix minimum", () => {
    const d = doc([section("a", "stable", 800), section("b", "volatile", 100)]);
    const report = buildSavings(5000, d, [...PHASES], CACHE_PROFILES.anthropic);

    expect(report.cache.cacheEligible).toBe(false);
    expect(report.cache.effectiveTokensFirstCall).toBe(900);
    expect(report.cache.effectiveTokensPerSubsequentCall).toBe(900);
  });

  it("applies no write premium for automatic-cache providers", () => {
    const d = doc([section("a", "stable", 2000), section("b", "volatile", 500)]);
    const report = buildSavings(10_000, d, [...PHASES], CACHE_PROFILES.openai);

    expect(report.cache.effectiveTokensFirstCall).toBe(2500); // no premium
    expect(report.cache.effectiveTokensPerSubsequentCall).toBe(1500); // 2000*0.5 + 500
  });

  it("stablePrefixTokens stops at the first volatile section", () => {
    const d = doc([section("a", "stable", 100), section("b", "volatile", 50), section("c", "stable", 100)]);
    expect(stablePrefixTokens(d)).toBe(100);
  });
});
