import { describe, expect, it } from "vitest";
import { CACHE_PROFILES, cacheablePrefixTokens, orderForCache } from "../src/gateway/cache-profiles.js";
import { parseMarkdown } from "../src/markdown/parse.js";
import { approxCounter } from "../src/tokens/counter.js";
import { buildTokenReport } from "../src/tokens/report.js";
import { renderMarkdown, type MarkdownDoc, type MarkdownSection } from "../src/types/document.js";
import { FIXTURES_DIR, readFixture } from "./helpers.js";
import { join } from "node:path";

describe("markdown IR parsing on golden outputs", () => {
  const golden = readFixture(join(FIXTURES_DIR, "02-meeting-email-thread"), "expected.md");
  const doc = parseMarkdown(golden, approxCounter);

  it("extracts the title from the first h1", () => {
    expect(doc.title).toBe("Q3 Migration Plan — Decisions (2026-07-21)");
  });

  it("recognizes headings, lists, and the action-item table", () => {
    const kinds = doc.sections.map((s) => s.kind);
    expect(kinds).toContain("heading");
    expect(kinds).toContain("list");
    expect(kinds).toContain("table");
  });

  it("anchors every section with a source span that round-trips", () => {
    for (const section of doc.sections) {
      expect(section.source).toBeDefined();
      const span = section.source!;
      expect(golden.slice(span.start, span.end)).toBe(section.markdown);
    }
  });

  it("keeps fenced code blocks as single sections", () => {
    const withCode = parseMarkdown("intro\n\n```py\na = 1\n\nb = 2\n```\n\noutro", approxCounter);
    const code = withCode.sections.filter((s) => s.kind === "code");
    expect(code).toHaveLength(1);
    expect(code[0]?.markdown).toContain("b = 2");
  });
});

describe("token report", () => {
  it("computes ratio, per-section counts, and budget verdicts", () => {
    const doc = parseMarkdown("# T\n\nbody text here", approxCounter);
    const report = buildTokenReport(doc, {
      counter: approxCounter,
      inputTokens: 100,
      engine: "markitdown",
      escalated: false,
      budget: 50,
    });
    expect(report.outputTokens).toBeGreaterThan(0);
    expect(report.ratio).toBeCloseTo(report.outputTokens / 100);
    expect(report.perSection).toHaveLength(doc.sections.length);
    expect(report.withinBudget).toBe(true);
  });
});

describe("cache-aligned layout", () => {
  const section = (id: string, volatility: "stable" | "volatile", tokens: number): MarkdownSection => ({
    id,
    kind: "paragraph",
    markdown: id,
    tokens,
    volatility,
  });

  it("moves volatile sections after stable ones, preserving relative order", () => {
    const doc: MarkdownDoc = {
      sourceId: "x",
      sections: [section("a", "volatile", 10), section("b", "stable", 10), section("c", "stable", 10)],
      warnings: [],
    };
    expect(orderForCache(doc).sections.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("reports zero cacheable prefix below the provider minimum", () => {
    const doc: MarkdownDoc = {
      sourceId: "x",
      sections: [section("a", "stable", 500)],
      warnings: [],
    };
    expect(cacheablePrefixTokens(doc, CACHE_PROFILES.anthropic)).toBe(0);
  });

  it("counts the stable prefix once past the minimum", () => {
    const doc: MarkdownDoc = {
      sourceId: "x",
      sections: [section("a", "stable", 900), section("b", "stable", 400), section("c", "volatile", 50)],
      warnings: [],
    };
    expect(cacheablePrefixTokens(doc, CACHE_PROFILES.anthropic)).toBe(1300);
  });

  it("renderMarkdown joins sections back into a document", () => {
    const doc = parseMarkdown("# A\n\nB\n\nC", approxCounter);
    expect(renderMarkdown(doc)).toBe("# A\n\nB\n\nC");
  });
});
