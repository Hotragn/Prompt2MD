import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { groupRows, layoutToMarkdown, segment, type PositionedItem } from "../src/engines/native/pdf-layout.js";
import { pdfToMarkdown } from "../src/engines/native/pdf.js";
import { detectTableDegradation } from "../src/router/escalation.js";

/**
 * A PDF has no tables — only glyphs at coordinates. These cover the inference
 * that turns the second into the first, and the ways it could be wrong
 * silently: a value under the wrong heading is worse than no table at all.
 */

function item(text: string, x: number, y: number, width = text.length * 5): PositionedItem {
  return { text, x, y, width, height: 10 };
}

describe("grouping runs into rows", () => {
  it("reads down the page, not up", () => {
    // PDF space has its origin at the bottom, so a naive ascending sort
    // returns every document upside down.
    const rows = groupRows([item("bottom", 10, 100), item("top", 10, 700)]);
    expect(rows.map((r) => r.items[0]?.text)).toEqual(["top", "bottom"]);
  });

  it("treats a shared baseline as one row despite sub-point drift", () => {
    const rows = groupRows([item("a", 10, 500), item("b", 100, 500.4), item("c", 10, 480)]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.items).toHaveLength(2);
  });

  it("orders cells left to right regardless of draw order", () => {
    const rows = groupRows([item("third", 300, 500), item("first", 10, 500), item("second", 150, 500)]);
    expect(rows[0]?.items.map((i) => i.text)).toEqual(["first", "second", "third"]);
  });
});

describe("column detection", () => {
  it("puts a right-aligned number under its left-aligned heading", () => {
    // The reason corridors are used instead of clustering left edges. These
    // numbers start at three different x values in the same column; grouping
    // on the left edge would scatter them across three columns, silently
    // filing every figure under the wrong heading.
    const items = [
      item("Segment", 100, 500, 40), item("Revenue", 200, 500, 40), item("Margin", 300, 500, 40),
      item("Cloud", 100, 480, 30), item("4,812", 228, 480, 12), item("25%", 330, 480, 15),
      item("Compute", 100, 460, 40), item("917", 234, 460, 6), item("31%", 330, 460, 15),
      item("Total", 100, 440, 25), item("12,001", 222, 440, 18), item("28%", 330, 440, 15),
    ];
    const md = layoutToMarkdown(items);
    const rows = md.split("\n").filter((l) => l.startsWith("|"));

    expect(rows[0]).toBe("| Segment | Revenue | Margin |");
    for (const [label, value] of [["Cloud", "4,812"], ["Compute", "917"], ["Total", "12,001"]]) {
      expect(md).toContain(`| ${label} | ${value} |`);
    }
  });

  it("keeps a phrase split across styling runs in one cell", () => {
    // pdf.js emits a run per style change, so bolding one word would otherwise
    // split "Op. Income" into two columns.
    const items = [
      item("Op.", 100, 500, 15), item("Income", 118, 500, 30), item("Revenue", 300, 500, 40), item("Share", 450, 500, 30),
      item("64", 100, 480, 10), item("1,204", 300, 480, 25), item("12%", 450, 480, 18),
      item("96", 100, 460, 10), item("1,653", 300, 460, 25), item("14%", 450, 460, 18),
    ];
    expect(layoutToMarkdown(items)).toContain("| Op. Income | Revenue | Share |");
  });

  it("leaves a two-column page layout as prose rather than scrambling it", () => {
    // A deliberate floor at three columns. A two-column ARTICLE has exactly
    // two columns and many rows, so admitting two-column tables would read
    // every such page as a grid and interleave the two halves of the prose —
    // corrupting the text rather than merely failing to structure it. The cost
    // is that genuine label/value tables render as aligned lines, which is
    // unstructured but never wrong.
    const items = [
      item("Left column text here", 72, 500, 120), item("Right column text here", 320, 500, 120),
      item("continues on this line", 72, 486, 120), item("also continues here", 320, 486, 120),
      item("and ends here.", 72, 472, 90), item("and ends too.", 320, 472, 90),
    ];
    expect(layoutToMarkdown(items)).not.toContain("|");
  });
});

describe("deciding what is not a table", () => {
  it("does not turn a single spaced-out line into a one-row table", () => {
    const rows = groupRows([item("Title", 100, 500, 30), item("Date", 300, 500, 20), item("Page", 450, 500, 20)]);
    expect(segment(rows).every((b) => b.kind === "prose")).toBe(true);
  });

  it("leaves an ordinary paragraph as prose", () => {
    const items = [item("A sentence of ordinary prose that wrapped", 72, 500)];
    expect(layoutToMarkdown(items)).not.toContain("|");
  });

  it("rejoins a wrapped sentence but not across a full stop", () => {
    const md = layoutToMarkdown([
      item("Revenue grew because the", 72, 500),
      item("segment expanded.", 72, 486),
      item("A new sentence starts here.", 72, 472),
    ]);
    expect(md).toContain("Revenue grew because the segment expanded.");
    expect(md.split("\n")).toHaveLength(2);
  });
});

describe("against the real fixture", () => {
  const fixture = fileURLToPath(new URL("../../../fixtures/_generated/quarterly-report.pdf", import.meta.url));

  it("reconstructs the financial table with every figure under the right heading", async () => {
    const result = await pdfToMarkdown(new Uint8Array(await readFile(fixture)));

    // The header itself is asserted below, where the spanning period tier is
    // folded in; this case is about the figures landing in the right columns.
    expect(result.markdown).toContain("| Cloud Infrastructure | 4,812 | 1,204 | 3,977 | 902 | +21.0% |");
    // A negative rendered in accounting parentheses must survive intact.
    expect(result.markdown).toContain("| Professional Services | 917 | 64 | 1,033 | 96 | (11.2)% |");
    expect(result.markdown).toContain("| Total | 7,873 | 1,956 | 7,091 | 1,653 | +11.0% |");
    expect(result.empty).toBe(false);
  });

  it("folds the spanning period header into the column names", async () => {
    // Without this the header reads Revenue | Op. Income | Revenue | Op.
    // Income — two identical pairs with no way to tell which quarter is
    // which. The table parses cleanly and means nothing.
    const result = await pdfToMarkdown(new Uint8Array(await readFile(fixture)));
    expect(result.markdown).toContain(
      "| Segment | Q2 2026 Revenue | Q2 2026 Op. Income | Q2 2025 Revenue | Q2 2025 Op. Income | YoY Rev |",
    );
  });

  it("keeps sub-rows marked as sub-rows so the totals still add up", async () => {
    // Compute and Storage are indented beneath Cloud Infrastructure and are
    // already inside its figure: 2,930 + 1,882 = 4,812. Flattened to peers,
    // summing the column gives 12,685 against a printed Total of 7,873, and
    // anything reading the table concludes the document contradicts itself.
    const result = await pdfToMarkdown(new Uint8Array(await readFile(fixture)));
    expect(result.markdown).toContain("| — Compute | 2,930 |");
    expect(result.markdown).toContain("| — Storage | 1,882 |");
    expect(result.markdown).toContain("| Cloud Infrastructure | 4,812 |");
    // The parent and the total are top-level, and must not be marked.
    expect(result.markdown).not.toContain("| — Cloud Infrastructure");
    expect(result.markdown).not.toContain("| — Total");
  });

  it("leaves the escalation guard with nothing to report", async () => {
    // The guard exists to catch flattened tables. Reconstructing the table is
    // what makes it fall silent — so silence here is the proof the extraction
    // worked, and this test fails the moment it regresses to a run-on line.
    const result = await pdfToMarkdown(new Uint8Array(await readFile(fixture)));
    expect(detectTableDegradation(result.markdown)).toBe(false);
  });

  it("still reports a scan as having no text layer", async () => {
    const scan = fileURLToPath(new URL("../../../fixtures/_generated/scanned-invoice.pdf", import.meta.url));
    const result = await pdfToMarkdown(new Uint8Array(await readFile(scan)));
    expect(result.empty).toBe(true);
  });
});
