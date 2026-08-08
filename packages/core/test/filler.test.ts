import { describe, expect, it } from "vitest";
import { stripPromptFiller } from "../src/optimize/filler.js";
import { approxCounter } from "../src/tokens/counter.js";

describe("filler stripping stays linear on one huge paragraph", () => {
  it("handles a pasted transcript without blank lines in reasonable time", () => {
    // A chat log or transcript pasted straight in is one paragraph with
    // thousands of sentences — the exact shape this path is aimed at. The
    // dedupe used to re-normalize every kept sentence for every new one, so
    // 4,000 sentences took 5s and 40,000 took minutes: the CLI hung with no
    // output, and the hosted studio burned its whole 45s deadline. This is a
    // timing test on purpose; nothing else catches a return to quadratic.
    const sentences = Array.from({ length: 8000 }, (_, i) => `Sentence number ${i} covers a topic.`);
    const started = Date.now();
    const { text } = stripPromptFiller(sentences.join(" "), approxCounter);
    const elapsed = Date.now() - started;

    // Quadratic put 8,000 sentences near 20s; linear lands comfortably under
    // a second. The bar is loose so a slow CI machine cannot flake it, while
    // still failing hard if the old behaviour returns.
    expect(elapsed).toBeLessThan(5000);
    expect(text).toContain("Sentence number 7999");
  });

  it("still removes an exact repeat however far apart it is", () => {
    // Bounding the containment scan must not stop catching outright repeats:
    // those go through a set, which has no window.
    const filler = Array.from({ length: 400 }, (_, i) => `Filler line ${i} adds nothing.`);
    const input = ["The API key must be read from the environment.", ...filler, "The API key must be read from the environment."].join(" ");
    const { text } = stripPromptFiller(input, approxCounter);

    const occurrences = text.split("The API key must be read from the environment.").length - 1;
    expect(occurrences).toBe(1);
  });
});

describe("prompt filler stripping (deterministic, no-LLM path)", () => {
  it("shrinks a rambling chat-box prompt without losing requirements", () => {
    const input =
      'ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11';

    const { text, removedTokens } = stripPromptFiller(input, approxCounter);

    expect(removedTokens).toBeGreaterThan(0);
    expect(approxCounter.count(text)).toBeLessThan(approxCounter.count(input));

    // Every requirement must survive, just without the padding.
    for (const requirement of [
      "csv",
      "date",
      "skip empty files",
      "parquet",
      "pandas",
      "MM/DD/YYYY",
      "ISO",
      "logging",
      "dont crash",
      "python 3.11",
    ]) {
      expect(text.toLowerCase()).toContain(requirement.toLowerCase());
    }

    // The redundant restatements should not both survive verbatim.
    expect(text.toLowerCase().match(/skip empty files/g)?.length ?? 0).toBeLessThan(2);
  });

  it("never returns a longer text than it was given", () => {
    const input = "Convert this CSV to a report.";
    const { text } = stripPromptFiller(input, approxCounter);
    expect(approxCounter.count(text)).toBeLessThanOrEqual(approxCounter.count(input));
  });

  it("drops trailing pleasantries and repeated punctuation", () => {
    const { text } = stripPromptFiller("Build the endpoint now!!! thanks!!!", approxCounter);
    expect(text).not.toMatch(/thanks/i);
    expect(text).not.toMatch(/!!!/);
  });

  it("drops did-i-mention meta-commentary", () => {
    const { text } = stripPromptFiller("Use retries. Did I mention to use retries? Yeah use retries.", approxCounter);
    expect(text.toLowerCase().match(/retries/g)?.length ?? 0).toBeLessThan(2);
  });

  it("is a no-op on text with nothing to strip", () => {
    const input = "Write a function that adds two numbers.";
    const { text, removedTokens } = stripPromptFiller(input, approxCounter);
    expect(text).toBe(input);
    expect(removedTokens).toBe(0);
  });
});
