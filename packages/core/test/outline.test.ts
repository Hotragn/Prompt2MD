import { describe, expect, it } from "vitest";
import type { MarkdownDoc, MarkdownSection } from "../src/types/document.js";
import { buildOutline } from "../src/compress/outline.js";
import { parseAnchor } from "../src/store.js";

/** Same heuristic the pipeline uses when no exact tokenizer is injected. */
const count = (text: string): number => Math.ceil(text.length / 4);

const SOURCE_ID = "abcdef0123456789";

let cursor = 0;
function section(part: Partial<MarkdownSection> & { markdown: string }): MarkdownSection {
  const start = cursor;
  cursor += part.markdown.length;
  return {
    id: part.id ?? `s${start}`,
    kind: part.kind ?? "paragraph",
    markdown: part.markdown,
    tokens: part.tokens ?? count(part.markdown),
    volatility: "stable",
    source: { sourceId: SOURCE_ID, start, end: cursor },
    ...part,
  } as MarkdownSection;
}

const LONG = `The subsystem negotiates a lease before writing, which prevents two workers from claiming the same partition. ${"Detail sentence that pads this section well past the cost of its own stub. ".repeat(6)}`;

function doc(sections: readonly MarkdownSection[]): MarkdownDoc {
  return { sourceId: SOURCE_ID, title: "Design notes", sections, warnings: [] };
}

describe("buildOutline (lazy context)", () => {
  it("replaces large anchored prose with a stub and comes out far smaller", () => {
    // Ten sections, not two. The preamble is a fixed cost, so the saving only
    // shows at the scale this feature is for — a long document with a narrow
    // question. Two sections is the case where indexing is NOT worth it, and
    // that is asserted separately below rather than hidden by a loose bound.
    const d = doc([
      section({ kind: "heading", level: 1, markdown: "# Leases" }),
      ...Array.from({ length: 10 }, () => section({ markdown: LONG })),
    ]);

    const out = buildOutline(d, count);

    expect(out.stubbed).toBe(10);
    expect(out.worthwhile).toBe(true);
    expect(out.indexTokens).toBeLessThan(out.fullTokens * 0.4);
  });

  it("reports that indexing a tiny document is not worth it", () => {
    // Nothing here is big enough to stub, so the index is the preamble plus the
    // whole document — strictly worse than sending the document. The honest
    // answer is to say so, not to return a bigger payload and call it a saving.
    const d = doc([
      section({ kind: "heading", level: 1, markdown: "# Note" }),
      section({ markdown: "It leases first." }),
    ]);

    const out = buildOutline(d, count);

    expect(out.stubbed).toBe(0);
    expect(out.worthwhile).toBe(false);
    expect(out.indexTokens).toBeGreaterThan(out.fullTokens);
  });

  it("keeps headings verbatim — they are the navigation", () => {
    const d = doc([
      section({ kind: "heading", level: 2, markdown: "## Retry policy" }),
      section({ markdown: LONG }),
    ]);

    const out = buildOutline(d, count);

    expect(out.markdown).toContain("## Retry policy");
  });

  it("never stubs a section cheaper than its own stub", () => {
    // A three-word paragraph cannot be represented more cheaply than itself:
    // the anchor comment alone costs more than the content.
    const d = doc([section({ markdown: "It leases first." })]);

    const out = buildOutline(d, count);

    expect(out.stubbed).toBe(0);
    expect(out.verbatim).toBe(1);
    expect(out.markdown).toContain("It leases first.");
  });

  it("never stubs a section that has no source span, and reports it", () => {
    const orphan: MarkdownSection = {
      id: "orphan",
      kind: "paragraph",
      markdown: LONG,
      tokens: count(LONG),
      volatility: "stable",
    };

    const out = buildOutline(doc([orphan]), count);

    // Stubbing this would point at nothing — content lost while claiming lossless.
    expect(out.stubbed).toBe(0);
    expect(out.unanchored).toBe(1);
    expect(out.markdown).toContain(LONG.slice(0, 40));
  });

  it("keeps tables and code verbatim, because a clipped preview misleads", () => {
    const table = `| id | qty |\n|---|---|\n| a | 1 |\n| b | 2 |\n${"| c | 3 |\n".repeat(20)}`;
    const code = `\`\`\`ts\n${"const x = compute(y);\n".repeat(20)}\`\`\``;

    const out = buildOutline(doc([section({ kind: "table", markdown: table }), section({ kind: "code", markdown: code })]), count);

    expect(out.stubbed).toBe(0);
    expect(out.markdown).toContain("| id | qty |");
    expect(out.markdown).toContain("const x = compute(y);");
  });

  it("every stub carries an anchor that parses back to a retrievable span", () => {
    const out = buildOutline(doc([section({ markdown: LONG }), section({ markdown: LONG })]), count);

    const stubs = out.markdown.split("\n").filter((l) => l.startsWith("- paragraph"));
    expect(stubs).toHaveLength(2);
    for (const stub of stubs) {
      const anchor = parseAnchor(stub);
      expect(anchor).toBeDefined();
      expect(anchor?.sourceId).toBe(SOURCE_ID);
      expect(anchor?.end).toBeGreaterThan(anchor?.start ?? 0);
    }
  });

  it("keeps every stub on one line so the index stays scannable", () => {
    const multiline = `First line of the paragraph is here and runs on.\nSecond line continues it.\n${"More padding to clear the stub cost. ".repeat(8)}`;

    const out = buildOutline(doc([section({ markdown: multiline })]), count);

    const stubs = out.markdown.split("\n").filter((l) => l.startsWith("- paragraph"));
    expect(stubs).toHaveLength(1);
    expect(stubs[0]).not.toContain("\n");
  });

  it("tells the model the entries are placeholders, not content", () => {
    const out = buildOutline(doc([section({ markdown: LONG })]), count);

    expect(out.markdown).toContain("retrieve_original");
    expect(out.markdown.toLowerCase()).toContain("index");
  });
});
