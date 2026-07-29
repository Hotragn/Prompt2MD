import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { approxCounter, parseMarkdown, renderMarkdown } from "@prompt2md/core";
import { stripBoilerplate } from "../src/compress/boilerplate.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "cases");

describe("phase 2: boilerplate strip + dedupe", () => {
  it("removes signatures, legal footers, and quoted mail history from the email fixture", () => {
    const raw = readFileSync(join(FIXTURES, "02-meeting-email-thread", "input.txt"), "utf8");
    const { doc, removedTokens } = stripBoilerplate(parseMarkdown(raw, approxCounter), approxCounter);
    const output = renderMarkdown(doc);

    expect(output).not.toMatch(/sent from my iphone/i);
    expect(output).not.toMatch(/confidential and intended solely/i);
    expect(removedTokens).toBeGreaterThan(0);
    // The fresh (unquoted) decisions must survive.
    expect(output).toContain("blue/green");
    expect(output).toContain("Aug 14");
  });

  it("deduplicates repeated paragraphs but keeps the first occurrence", () => {
    const md = "unique intro\n\nrepeat me please\n\nother content\n\nRepeat  me   please\n\nrepeat me please";
    const { doc, removedSections } = stripBoilerplate(parseMarkdown(md, approxCounter), approxCounter);

    expect(removedSections).toBe(2); // case/whitespace-insensitive duplicates dropped
    expect(doc.sections.map((s) => s.markdown)).toContain("repeat me please");
  });

  it("never strips tables, code, or headings", () => {
    const md = "# Confidential Report\n\n| col |\n|---|\n| confidential value |\n\n```\nconfidential code\n```";
    const { doc, removedSections } = stripBoilerplate(parseMarkdown(md, approxCounter), approxCounter);
    expect(removedSections).toBe(0);
    expect(doc.sections).toHaveLength(3);
  });

  it("keeps ordinary blockquotes (only mail-header quotes are noise)", () => {
    const md = "> A wise quotation worth keeping.\n\nBody text.";
    const { doc } = stripBoilerplate(parseMarkdown(md, approxCounter), approxCounter);
    expect(renderMarkdown(doc)).toContain("wise quotation");
  });
});
