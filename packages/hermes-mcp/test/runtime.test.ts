import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDeterministicTextEngine } from "../src/runtime.js";
import type { SniffReport } from "@prompt2md/core";

const TEXT_SNIFF: SniffReport = { kind: "prompt", mime: "text/plain", bytes: 0 };

describe("deterministic text engine (no gateway configured)", () => {
  const engine = createDeterministicTextEngine();

  it("reads file input instead of returning empty output", async () => {
    // Regression: file input previously fell through to "" — `convert file.txt`
    // and `batch *.txt` reported success while producing nothing.
    const dir = await mkdtemp(join(tmpdir(), "p2md-runtime-"));
    const path = join(dir, "notes.txt");
    await writeFile(path, "Merge the CSVs.\n\nSent from my iPhone\n\nUse pandas.", "utf8");

    const result = await engine.convert({ kind: "file", path }, TEXT_SNIFF, {});

    expect(result.markdown).toContain("Merge the CSVs.");
    expect(result.markdown).toContain("Use pandas.");
    expect(result.markdown).not.toMatch(/sent from my iphone/i);
  });

  it("handles text and buffer input", async () => {
    const fromText = await engine.convert({ kind: "text", text: "Hello there." }, TEXT_SNIFF, {});
    expect(fromText.markdown).toContain("Hello there.");

    const fromBuffer = await engine.convert(
      { kind: "buffer", data: Buffer.from("Buffered content.", "utf8") },
      TEXT_SNIFF,
      {},
    );
    expect(fromBuffer.markdown).toContain("Buffered content.");
  });

  it("always warns that it is running without an LLM gateway", async () => {
    const result = await engine.convert({ kind: "text", text: "x" }, TEXT_SNIFF, {});
    expect(result.warnings.some((w) => w.code === "engine-fallback")).toBe(true);
  });
});

describe("deterministic cleanup discloses material content removal", () => {
  const engine = createDeterministicTextEngine();

  it("warns when deduplication collapses most of the input", async () => {
    // Repeated content reduces to a single copy, and this path stores no
    // original to recover it from. A 5 MB paste returning 11 tokens with no
    // explanation would look like a spectacular saving rather than a choice
    // the user never agreed to.
    const repeated = "The quick brown fox jumps over the lazy dog. ".repeat(4000);
    const result = await engine.convert({ kind: "text", text: repeated }, TEXT_SNIFF, {});

    const disclosure = result.warnings.find((w) => w.code === "content-removed");
    expect(disclosure).toBeDefined();
    expect(disclosure!.message).toMatch(/removed [\d,]+ of [\d,]+ tokens/);
    expect(disclosure!.message).toContain("Your source is unchanged");
  });

  it("stays quiet on an ordinary prompt, where trimming filler is not news", async () => {
    const result = await engine.convert(
      { kind: "text", text: "ok so basically i need a python script that merges csv files. thanks!!!" },
      TEXT_SNIFF,
      {},
    );
    expect(result.warnings.some((w) => w.code === "content-removed")).toBe(false);
  });

  it("formats large numbers the same way on every host locale", async () => {
    // toLocaleString() follows the host locale — an en-IN machine renders
    // 1349989 as "13,49,989" — so the same warning read differently depending
    // on where it ran.
    const repeated = "Identical sentence repeated for grouping check. ".repeat(20000);
    const result = await engine.convert({ kind: "text", text: repeated }, TEXT_SNIFF, {});
    const disclosure = result.warnings.find((w) => w.code === "content-removed");

    expect(disclosure).toBeDefined();
    const groups = disclosure!.message.match(/\d{1,3}(,\d{3})+/g) ?? [];
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) expect(g).toMatch(/^\d{1,3}(,\d{3})+$/);
  });
});
