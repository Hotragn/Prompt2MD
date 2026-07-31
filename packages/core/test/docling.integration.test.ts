import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDoclingEngine } from "../src/engines/docling.js";
import { createMarkitdownEngine } from "../src/engines/markitdown.js";
import { convertDocument } from "../src/pipeline.js";
import { sniffBuffer } from "../src/router/sniffer.js";
import { FIXTURES_DIR } from "./helpers.js";

/**
 * The high-fidelity path against a REAL docling-serve.
 *
 * Everything else about docling is unit-tested with stubs, which proves our
 * routing logic and proves nothing about whether the engine actually works.
 * Scans and complex tables are the headline capability, so it needs one test
 * that runs the real thing.
 *
 * Skipped unless a docling-serve is reachable, so ordinary `pnpm test` stays
 * fast and offline. The `docling` CI job supplies one as a service container.
 *
 *   docker run -p 5001:5001 quay.io/docling-project/docling-serve
 *   P2MD_DOCLING_URL=http://localhost:5001 pnpm --filter @prompt2md/core test
 */

const DOCLING_URL = process.env["P2MD_DOCLING_URL"];
const GENERATED = join(FIXTURES_DIR, "..", "_generated");
const SCANNED = join(GENERATED, "scanned-invoice.pdf");
const NATIVE = join(GENERATED, "quarterly-report.pdf");

const ready = DOCLING_URL !== undefined && existsSync(SCANNED) && existsSync(NATIVE);

describe.skipIf(!ready)("docling integration (real docling-serve)", () => {
  const engines = {
    "prompt-optimizer": {
      id: "prompt-optimizer" as const,
      convert: () => Promise.reject(new Error("text path not expected here")),
    },
    markitdown: createMarkitdownEngine({}),
    docling: createDoclingEngine({ baseUrl: DOCLING_URL! }),
  };

  it("reads a scanned PDF that the fast path cannot", { timeout: 300_000 }, async () => {
    const data = new Uint8Array(readFileSync(SCANNED));
    const sniff = await sniffBuffer(data, "scanned-invoice.pdf");

    // The router must send an image-only PDF to the OCR path on its own.
    expect(sniff.kind).toBe("pdf");

    const outcome = await convertDocument(
      { kind: "buffer", data, filename: "scanned-invoice.pdf" },
      { engines },
    );

    expect(outcome.report.engine).toBe("docling");
    // Invoice identifiers from fixtures/scripts/make_binary_fixtures.py. OCR is
    // imperfect by nature, so assert on the distinctive strings rather than a
    // whole-document match.
    const text = outcome.markdown.toUpperCase();
    expect(text).toMatch(/NORTHSIDE|ELECTRICAL/);
    expect(outcome.report.outputTokens).toBeGreaterThan(20);
  });

  it("reconstructs the two-level header table in a native PDF", { timeout: 300_000 }, async () => {
    const data = new Uint8Array(readFileSync(NATIVE));
    const result = await engines.docling.convert(
      { kind: "buffer", data, filename: "quarterly-report.pdf" },
      await sniffBuffer(data, "quarterly-report.pdf"),
      {},
    );

    // Fidelity beats compression for tables: every numeric cell must survive
    // exactly, which is the claim in case.json for 04-financial-pdf-table.
    for (const cell of ["4,812", "1,204", "3,977", "7,873"]) {
      expect(result.markdown).toContain(cell);
    }
    expect(result.markdown).toMatch(/\|/); // emitted as a table, not run-on prose
  });
});

describe.skipIf(ready)("docling integration", () => {
  it("is skipped without a reachable docling-serve", () => {
    // Visible in the report so a green run is never mistaken for coverage of
    // the high-fidelity path.
    expect(ready).toBe(false);
  });
});
