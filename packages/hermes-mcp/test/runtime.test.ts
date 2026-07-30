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
