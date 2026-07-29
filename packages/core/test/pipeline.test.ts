import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertDocument } from "../src/pipeline.js";
import type { Engine } from "../src/types/engine.js";
import { FIXTURES_DIR, syntheticTextPdf } from "./helpers.js";

const textEngine: Engine = {
  id: "prompt-optimizer",
  convert: (input) =>
    Promise.resolve({
      markdown: `# Cleaned\n\n${input.kind === "text" ? input.text : "content"}`,
      warnings: [],
    }),
};

const failing = (id: Engine["id"], message: string): Engine => ({
  id,
  convert: () => Promise.reject(new Error(message)),
});

const echoing = (id: Engine["id"], markdown: string): Engine => ({
  id,
  convert: () => Promise.resolve({ markdown, warnings: [] }),
});

describe("pipeline resilience (missing sidecars must not break textual input)", () => {
  it("falls back to the text path when markitdown is unavailable for textual input", async () => {
    const outcome = await convertDocument(
      { kind: "text", text: "<html><body><p>hello</p></body></html>", filename: "page.html" },
      {
        engines: {
          "prompt-optimizer": textEngine,
          markitdown: failing("markitdown", "spawn python ENOENT"),
          docling: failing("docling", "not configured"),
        },
      },
    );

    expect(outcome.decision.engine).toBe("markitdown");
    expect(outcome.report.engine).toBe("prompt-optimizer");
    expect(outcome.markdown).toContain("# Cleaned");
    expect(outcome.doc.warnings.some((w) => w.code === "engine-error")).toBe(true);
  });

  it("keeps the fast-path output when docling escalation fails", async () => {
    const degraded = readFileSync(
      join(FIXTURES_DIR, "04-financial-pdf-table", "input.extracted.txt"),
      "utf8",
    );
    const outcome = await convertDocument(
      { kind: "buffer", data: syntheticTextPdf(1), filename: "report.pdf" },
      {
        engines: {
          "prompt-optimizer": textEngine,
          markitdown: echoing("markitdown", degraded),
          docling: failing("docling", "P2MD_DOCLING_URL not set"),
        },
      },
    );

    expect(outcome.escalated).toBe(false);
    expect(outcome.report.engine).toBe("markitdown");
    expect(outcome.markdown).toBe(degraded);
    const codes = outcome.doc.warnings.map((w) => w.code);
    expect(codes).toContain("engine-error");
  });

  it("still escalates normally when docling works", async () => {
    const degraded = readFileSync(
      join(FIXTURES_DIR, "04-financial-pdf-table", "input.extracted.txt"),
      "utf8",
    );
    const outcome = await convertDocument(
      { kind: "buffer", data: syntheticTextPdf(1), filename: "report.pdf" },
      {
        engines: {
          "prompt-optimizer": textEngine,
          markitdown: echoing("markitdown", degraded),
          docling: echoing("docling", "| Segment | Revenue |\n|---|---|\n| Cloud | 4,812 |"),
        },
      },
    );

    expect(outcome.escalated).toBe(true);
    expect(outcome.report.engine).toBe("docling");
    expect(outcome.markdown).toContain("| Segment |");
  });

  it("does not mask failures for non-textual input (binary needs a real engine)", async () => {
    await expect(
      convertDocument(
        { kind: "buffer", data: Buffer.from([0x00, 0xfe, 0x9c, 0x01]), filename: "blob.bin" },
        {
          engines: {
            "prompt-optimizer": textEngine,
            markitdown: failing("markitdown", "nope"),
            docling: failing("docling", "not configured"),
          },
        },
      ),
    ).rejects.toThrow(/not configured/);
  });
});
