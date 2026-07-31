import { describe, expect, it } from "vitest";
import { stripPromptFiller } from "../src/optimize/filler.js";
import { structurePrompt } from "../src/optimize/structure.js";
import { approxCounter } from "../src/tokens/counter.js";

const RAMBLING =
  'ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11';

const shape = (raw: string): string =>
  structurePrompt(stripPromptFiller(raw, approxCounter).text, approxCounter).markdown;

describe("deterministic prompt structuring (the zero-config path)", () => {
  it("turns a rambling request into Markdown sections", () => {
    const out = shape(RAMBLING);

    expect(out).toContain("## Goal");
    expect(out).toContain("## Requirements");
    expect(out).toContain("## Constraints");
    expect(out.split("\n").filter((l) => l.startsWith("- ")).length).toBeGreaterThanOrEqual(4);
  });

  it("preserves every requirement — reorganising must never lose content", () => {
    const out = shape(RAMBLING).toLowerCase();
    for (const requirement of [
      "csv",
      "date",
      "skip empty files",
      "parquet",
      "pandas",
      "mm/dd/yyyy",
      "iso",
      "logging",
      "dont crash",
      "python 3.11",
    ]) {
      expect(out).toContain(requirement);
    }
  });

  it("uses the author's own words rather than paraphrasing them", () => {
    // Every bullet must be a verbatim substring of the cleaned input. This is
    // the line between reorganising and rewriting, and only one of those is
    // safe to do without a model.
    const cleaned = stripPromptFiller(RAMBLING, approxCounter).text.toLowerCase();
    const bullets = shape(RAMBLING)
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).toLowerCase());

    for (const bullet of bullets) {
      expect(cleaned).toContain(bullet);
    }
  });

  it("never emits a double bullet when the author already wrote one", () => {
    const out = shape("build a parser. one more thing - handle errors. also add tests. use node 20.");
    expect(out).not.toMatch(/^- [-*+•]/m);
  });

  it("leaves a short request alone instead of forcing headings onto it", () => {
    const input = "Write a function that adds two numbers.";
    expect(structurePrompt(input, approxCounter)).toEqual({ markdown: input, structured: false });
  });

  it("leaves prose alone when there is nothing to enumerate", () => {
    const prose =
      "The weather was fine that morning. Everyone gathered by the lake. Nobody spoke for a while.";
    expect(structurePrompt(prose, approxCounter).structured).toBe(false);
  });

  it("refuses to restructure when the markup would cost more than it clarifies", () => {
    // Many tiny requirement sentences: heading and bullet overhead would
    // dominate, so the original is the better answer.
    const tiny = Array.from({ length: 12 }, (_, i) => `use x${i}.`).join(" ");
    const result = structurePrompt(tiny, approxCounter);
    if (!result.structured) expect(result.markdown).toBe(tiny);
    else expect(approxCounter.count(result.markdown)).toBeLessThanOrEqual(approxCounter.count(tiny) * 1.25);
  });

  it("keeps unclassifiable sentences under Notes rather than dropping them", () => {
    // Long enough that headings pay for themselves — on a four-sentence note
    // the markup costs more than the structure is worth, and the guard
    // correctly declines.
    const input =
      "i need a report generator for the quarterly numbers. it should output pdf with a cover page. " +
      "it must support tables with merged cells and footnotes. it should also handle charts rendered from the same data. " +
      "make sure the fonts are embedded so it prints correctly. the deadline is friday and the client is famously picky about spacing.";
    const out = shape(input);

    expect(out).toContain("## Notes");
    expect(out.toLowerCase()).toContain("picky about spacing");
  });
});
