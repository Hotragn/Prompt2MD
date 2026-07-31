import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approxCounter } from "@prompt2md/core";
import { describe, expect, it } from "vitest";
import { compressContext } from "../src/compress/compressor.js";
import { createFileStore, parseAnchor } from "../src/store.js";

/**
 * Round-trip fidelity: does compressed output still carry the facts that
 * matter, or is the detail at least recoverable?
 *
 * Token savings are measured precisely and answer quality not at all. A full
 * LLM-judge harness needs a model and live keys; this is the deterministic
 * half, and it tests the stronger claim: a load-bearing fact — a figure, an
 * identifier, a date — must either survive verbatim in the output, or sit
 * inside a span some anchor resolves. A fact that is in neither place is
 * genuinely lost, whatever the ledger says.
 */

/** Figures, identifiers, dates, percentages — the things a reader checks. */
function loadBearingFacts(text: string): string[] {
  const patterns = [
    /\$[\d,]+(?:\.\d+)?/g, // currency
    /\b\d+(?:\.\d+)?%/g, // percentages
    /\b\d{4}-\d{2}-\d{2}\b/g, // ISO dates
    /\b[A-Z]{2,}-\d{3,}\b/g, // ticket / invoice identifiers
    /\b\d{1,3}(?:,\d{3})+\b/g, // grouped numbers
  ];
  const found = new Set<string>();
  for (const p of patterns) for (const m of text.match(p) ?? []) found.add(m);
  return [...found];
}

const DOC = [
  "# Incident 4417 — post-mortem",
  "",
  "Opened 2026-03-14 after checkout latency crossed the alert threshold.",
  "",
  ...Array.from(
    { length: 16 },
    (_, i) =>
      `Update ${i}. Engineers examined subsystem ${i} and recorded observations at length. ` +
      `${"Narrative detail describing dashboards, hypotheses, and dead ends. ".repeat(3)}` +
      `Ticket REF-${5000 + i} tracked the work and cost $${(i + 1) * 1250},000 in credits.`,
  ),
  "",
  "| Region | Requests | Error rate |",
  "| --- | --- | --- |",
  "| us-east | 1,204,882 | 2.4% |",
  "| eu-west | 918,455 | 1.1% |",
  "",
  "Resolved 2026-03-15 by reverting a stale feature flag.",
].join("\n");

describe("round-trip fidelity (facts survive or stay recoverable)", () => {
  it("keeps every load-bearing fact either present or retrievable", async () => {
    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-fid-")));
    const result = await compressContext(DOC, store, { tokenBudget: 400 });

    // Spans that any anchor in the output can resolve.
    const anchors = [...result.markdown.matchAll(/p2md:src=[0-9a-f]{16}#\d+-\d+/g)]
      .map((m) => parseAnchor(m[0]))
      .filter((a) => a !== undefined);

    const recoverable: string[] = [];
    for (const anchor of anchors) {
      const span = await store.getSpan(anchor!.sourceId, anchor!.start, anchor!.end);
      if (span !== undefined) recoverable.push(span);
    }

    const missing = loadBearingFacts(DOC).filter(
      (fact) => !result.markdown.includes(fact) && !recoverable.some((span) => span.includes(fact)),
    );

    expect(loadBearingFacts(DOC).length).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  it("never summarizes a table away — figures there are unverifiable once lost", async () => {
    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-fid-")));
    const result = await compressContext(DOC, store, { tokenBudget: 200 });

    // Tables are structure-critical: they stay verbatim regardless of budget.
    for (const cell of ["1,204,882", "918,455", "2.4%", "1.1%"]) {
      expect(result.markdown).toContain(cell);
    }
  });

  it("holds under an aggressive budget, where summarizing is most tempting", async () => {
    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-fid-")));
    const result = await compressContext(DOC, store, { tokenBudget: 120 });

    const anchors = [...result.markdown.matchAll(/p2md:src=[0-9a-f]{16}#\d+-\d+/g)]
      .map((m) => parseAnchor(m[0]))
      .filter((a) => a !== undefined);

    const spans: string[] = [];
    for (const anchor of anchors) {
      const span = await store.getSpan(anchor!.sourceId, anchor!.start, anchor!.end);
      if (span !== undefined) spans.push(span);
    }

    const missing = loadBearingFacts(DOC).filter(
      (fact) => !result.markdown.includes(fact) && !spans.some((s) => s.includes(fact)),
    );
    expect(missing).toEqual([]);
  });

  it("reports savings that match the output it actually produced", async () => {
    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-fid-")));
    const result = await compressContext(DOC, store, { tokenBudget: 400 });

    // The ledger is the product's central claim; it must describe the real
    // artifact, not an intermediate stage.
    expect(result.savings.rawTokens).toBe(approxCounter.count(DOC));
    expect(result.savings.compressedTokens).toBe(approxCounter.count(result.markdown));
  });
});
