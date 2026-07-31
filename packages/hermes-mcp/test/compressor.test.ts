import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compressContext, type CompressResult } from "../src/compress/compressor.js";
import { createFileStore, parseAnchor, type OriginalStore } from "../src/store.js";

function longDocument(): string {
  const paragraphs = Array.from({ length: 20 }, (_, i) => {
    const filler = "It contains several sentences elaborating on the subject matter in depth. ".repeat(4);
    return `Paragraph ${i} discusses topic ${i}. ${filler}The key fact of section ${i} is fact-${i}.`;
  });
  return [
    "# Quarterly Operations Report",
    "This introduction frames the report and must survive verbatim.",
    ...paragraphs,
    "## Conclusion",
    "The final takeaway must also survive verbatim at the tail.",
  ].join("\n\n");
}

describe("4-phase compression pipeline", () => {
  let store: OriginalStore;
  let original: string;
  let result: CompressResult;
  const BUDGET = 800;

  beforeAll(async () => {
    store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-compress-")));
    original = longDocument();
    result = await compressContext(original, store, { tokenBudget: BUDGET });
  });

  it("lands at or near the budget (layout markers excluded from the promise)", () => {
    expect(result.savings.compressedTokens).toBeLessThanOrEqual(BUDGET * 1.1);
    expect(result.savings.compressedTokens).toBeLessThan(result.savings.rawTokens);
    expect(result.doc.warnings.filter((w) => w.code === "budget-exceeded")).toHaveLength(0);
  });

  it("traces all four phases with non-increasing content tokens through summarize", () => {
    const phases = result.savings.phases.map((p) => p.phase);
    expect(phases).toEqual(["structure", "strip", "summarize", "layout"]);
    const [structure, strip, summarize] = result.savings.phases.map((p) => p.tokens);
    expect(strip!).toBeLessThanOrEqual(structure!);
    expect(summarize!).toBeLessThan(strip!);
  });

  it("preserves head and tail verbatim (lost-in-the-middle mitigation)", () => {
    expect(result.markdown).toContain("This introduction frames the report and must survive verbatim.");
    expect(result.markdown).toContain("The final takeaway must also survive verbatim at the tail.");
    const compressedIds = result.doc.sections.filter((s) => s.compressed === true).map((s) => s.id);
    expect(compressedIds.length).toBeGreaterThan(0);
    expect(compressedIds).not.toContain("s0"); // title
    expect(compressedIds).not.toContain("s1"); // intro
  });

  it("anchors every compressed section and retrieves the verbatim original", async () => {
    const compressed = result.doc.sections.filter((s) => s.compressed === true);
    for (const section of compressed) {
      const anchor = parseAnchor(section.markdown);
      expect(anchor, `section ${section.id} must carry a p2md:src anchor`).toBeDefined();
      const span = await store.getSpan(anchor!.sourceId, anchor!.start, anchor!.end);
      expect(span).toBeDefined();
      expect(span).toContain("The key fact of section"); // facts recoverable verbatim
    }
  });

  it("emits a cache breakpoint after the stable prefix and a volatile stamp last", () => {
    expect(result.markdown).toContain("<!-- p2md:cache-breakpoint -->");
    const last = result.doc.sections.at(-1);
    expect(last?.volatility).toBe("volatile");
    expect(last?.markdown).toContain("p2md:generated");
  });

  it("is idempotent on already-small input (no summarization below budget)", async () => {
    const small = "# Note\n\nShort content.";
    const outcome = await compressContext(small, store, { tokenBudget: 500 });
    expect(outcome.doc.sections.some((s) => s.compressed === true)).toBe(false);
    expect(outcome.markdown).toContain("Short content.");
  });

  it("keeps summaries only when they actually shrink the section", async () => {
    // A one-sentence paragraph cannot be extractively shrunk — must stay verbatim.
    const stubborn = ["# T", "Head.", "single sentence with no shrink potential repeated words ".repeat(3), "Tail."].join("\n\n");
    const outcome = await compressContext(stubborn, store, { tokenBudget: 10, minSectionTokens: 4 });
    for (const s of outcome.doc.sections) {
      if (s.compressed === true) {
        expect(s.tokens).toBeLessThan(200);
      }
    }
  });
});

describe("head protection must not swallow the document", () => {
  it("compresses a document whose bulk is one long paragraph", async () => {
    // Regression: the head-protection loop used to include the section that
    // OVERFLOWED the head budget. One large paragraph straddling that boundary
    // was therefore protected in full, leaving no summarization candidates —
    // compression returned the input unchanged, over budget, having done
    // nothing. Pasted text without blank lines looks exactly like this, so it
    // was the common case, not an edge case.
    const oneBigBlock = [
      "# Incident report",
      "",
      "Opened after latency crossed the alert threshold.",
      "",
      Array.from(
        { length: 16 },
        (_, i) =>
          `Update ${i}. Engineers examined subsystem ${i}. ` +
          `${"Narrative detail describing dashboards and dead ends. ".repeat(3)}Ticket REF-${5000 + i}.`,
      ).join("\n"),
      "",
      "Resolved by reverting a stale feature flag.",
    ].join("\n");

    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-headfix-")));
    const result = await compressContext(oneBigBlock, store, { tokenBudget: 120 });

    expect(result.savings.compressedTokens).toBeLessThan(result.savings.rawTokens / 2);
    expect(result.markdown).toMatch(/p2md:src=[0-9a-f]{16}#\d+-\d+/);
    expect(result.doc.warnings.some((w) => w.code === "budget-exceeded")).toBe(false);
  });

  it("still keeps a genuinely small head verbatim", async () => {
    const doc = [
      "# Title",
      "",
      "Short opening line that fits the head budget.",
      "",
      ...Array.from({ length: 10 }, (_, i) => `Body paragraph ${i}. ${"filler ".repeat(30)}End-${i}.`),
    ].join("\n\n");

    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-headfix-")));
    const result = await compressContext(doc, store, { tokenBudget: 400 });

    // The opening stays intact — protection still works where it should.
    expect(result.markdown).toContain("Short opening line that fits the head budget.");
  });
});
