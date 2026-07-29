import { describe, expect, it } from "vitest";
import { detectLowYield, detectTableDegradation } from "../src/router/escalation.js";
import { sniffBuffer } from "../src/router/sniffer.js";
import { FIXTURES_DIR, readFixture, syntheticTextPdf } from "./helpers.js";
import { join } from "node:path";

describe("table-degradation detection", () => {
  it("fires on the flattened financial table extraction (case 04)", () => {
    const degraded = readFixture(join(FIXTURES_DIR, "04-financial-pdf-table"), "input.extracted.txt");
    expect(detectTableDegradation(degraded)).toBe(true);
  });

  it("stays quiet on clean article markdown (case 03 golden output)", () => {
    const clean = readFixture(join(FIXTURES_DIR, "03-html-article"), "expected.md");
    expect(detectTableDegradation(clean)).toBe(false);
  });

  it("stays quiet on proper pipe tables (case 04 golden output)", () => {
    const golden = readFixture(join(FIXTURES_DIR, "04-financial-pdf-table"), "expected.md");
    expect(detectTableDegradation(golden)).toBe(false);
  });
});

describe("low-yield detection", () => {
  const fivePages = sniffBuffer(syntheticTextPdf(5), "doc.pdf");

  it("fires when output is far too thin for the page count", () => {
    expect(detectLowYield(fivePages, "almost nothing came out")).toBe(true);
  });

  it("stays quiet on healthy yield", () => {
    expect(detectLowYield(fivePages, "word ".repeat(400))).toBe(false);
  });
});
