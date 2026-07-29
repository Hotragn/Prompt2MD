import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { approxCounter } from "../src/tokens/counter.js";
import { loadCases, readFixture } from "./helpers.js";

/**
 * Corpus self-consistency: golden outputs must honor their own declared
 * token budgets (case.json tokens.maxRatio) relative to their text inputs.
 * Keeps the fixtures honest as they evolve.
 */
describe("golden corpus token-ratio contracts", () => {
  for (const { meta, dir } of loadCases()) {
    const inputFile = ["input.txt", "input.html", "input.csv", "input.extracted.txt", "input.ocr-raw.txt"].find(
      (name) => existsSync(join(dir, name)),
    );

    it(`${meta.id}: expected.md within ${meta.tokens.maxRatio}x of input`, () => {
      expect(inputFile).toBeDefined();
      const inputTokens = approxCounter.count(readFixture(dir, inputFile!));
      const outputTokens = approxCounter.count(readFixture(dir, "expected.md"));
      expect(outputTokens / inputTokens).toBeLessThanOrEqual(meta.tokens.maxRatio);
    });
  }
});
