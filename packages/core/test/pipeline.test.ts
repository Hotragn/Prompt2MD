import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertDocument } from "../src/pipeline.js";
import { approxCounter } from "../src/tokens/counter.js";
import type { Engine } from "../src/types/engine.js";
import { FIXTURES_DIR, syntheticScannedPdf, syntheticTextPdf } from "./helpers.js";

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
  it("falls back to the text path when the document engine is unavailable for textual input", async () => {
    const outcome = await convertDocument(
      { kind: "text", text: "<html><body><p>hello</p></body></html>", filename: "page.html" },
      {
        engines: {
          "prompt-optimizer": textEngine,
          native: failing("native", "spawn python ENOENT"),
          docling: failing("docling", "not configured"),
        },
      },
    );

    expect(outcome.decision.engine).toBe("native");
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
          native: echoing("native", degraded),
          docling: failing("docling", "P2MD_DOCLING_URL not set"),
        },
      },
    );

    expect(outcome.escalated).toBe(false);
    expect(outcome.report.engine).toBe("native");
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
          native: echoing("native", degraded),
          docling: echoing("docling", "| Segment | Revenue |\n|---|---|\n| Cloud | 4,812 |"),
        },
      },
    );

    expect(outcome.escalated).toBe(true);
    expect(outcome.report.engine).toBe("docling");
    expect(outcome.markdown).toContain("| Segment |");
  });

  it("cleans document chrome from fast-path output even without a budget", async () => {
    const rawEngineOutput = [
      "We use cookies to improve your experience. Accept all Manage preferences",
      "* [Home](/)\n* [Tech](/tech)\n* [Subscribe](/subscribe)",
      "![Advertisement](/ads/banner.gif)",
      "# Solid-State Batteries Reach Pilot Production",
      "Two battery manufacturers said this week they have begun pilot-line production.",
      "© 2026 TechWire Daily · [Privacy](/privacy) · [Terms](/terms)",
    ].join("\n\n");
    const outcome = await convertDocument(
      { kind: "text", text: "<html><body>article</body></html>", filename: "page.html" },
      {
        engines: {
          "prompt-optimizer": textEngine,
          native: echoing("native", rawEngineOutput),
          docling: failing("docling", "unused"),
        },
      },
    );

    expect(outcome.markdown).toContain("# Solid-State Batteries Reach Pilot Production");
    expect(outcome.markdown).toContain("pilot-line production");
    expect(outcome.markdown).not.toContain("cookies");
    expect(outcome.markdown).not.toContain("[Home](/)");
    expect(outcome.markdown).not.toContain("Advertisement");
    expect(outcome.markdown).not.toContain("© 2026");
    // the report counts the cleaned document, not the raw engine dump
    expect(outcome.report.outputTokens).toBeLessThan(approxCounter.count(rawEngineOutput));
  });

  it("does not mask failures for non-textual input (binary needs a real engine)", async () => {
    await expect(
      convertDocument(
        { kind: "buffer", data: Buffer.from([0x00, 0xfe, 0x9c, 0x01]), filename: "blob.bin" },
        {
          engines: {
            "prompt-optimizer": textEngine,
            native: failing("native", "nope"),
            docling: failing("docling", "not configured"),
          },
        },
      ),
    ).rejects.toThrow(/not configured/);
  });
});

describe("failures a user actually hits (found by scripts/probe-reliability.mjs)", () => {
  it("explains what to install when binary input has no document engine", async () => {
    // Refusing is correct — decoding a PDF as UTF-8 would produce confident
    // nonsense — but the raw "spawn python ENOENT" told the user nothing, and
    // this is the first thing anyone hits on a deployment without sidecars.
    const scanned = syntheticScannedPdf();

    await expect(
      convertDocument(
        { kind: "buffer", data: scanned, filename: "scan.pdf" },
        {
          engines: {
            "prompt-optimizer": textEngine,
            native: failing("native", "engine unavailable"),
            docling: failing("docling", "not configured"),
          },
        },
      ),
    // Wording is not the contract; being actionable is. The message has to
    // name what will work without a sidecar, which is now most formats.
    ).rejects.toThrow(/in-process with no sidecar/i);

    const error = await convertDocument(
      { kind: "buffer", data: scanned, filename: "scan.pdf" },
      {
        engines: {
          "prompt-optimizer": textEngine,
          native: failing("native", "engine unavailable"),
          // A scanned PDF routes to docling for OCR, so this is the engine
          // whose failure the user is actually told about.
          docling: failing("docling", "ECONNREFUSED 127.0.0.1:5001"),
        },
      },
    ).catch((e: unknown) => (e instanceof Error ? e.message : String(e)));

    // Actionable: names the remedy, and keeps the underlying cause for debugging.
    expect(error).toMatch(/markitdown\[all\]|P2MD_DOCLING_URL/);
    expect(error).toContain("ECONNREFUSED 127.0.0.1:5001");
  });

  it("reports a mistyped path as a missing file, not a raw ENOENT", async () => {
    await expect(
      convertDocument(
        { kind: "file", path: join(FIXTURES_DIR, "no-such-file-here.txt") },
        {
          engines: {
            "prompt-optimizer": textEngine,
            native: echoing("native", "x"),
            docling: echoing("docling", "x"),
          },
        },
      ),
    ).rejects.toThrow(/file not found/i);
  });
});
