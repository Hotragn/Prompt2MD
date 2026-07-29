import { describe, expect, it } from "vitest";
import { shouldEscalate } from "../src/router/escalation.js";
import { route } from "../src/router/router.js";
import { sniffBuffer, sniffText } from "../src/router/sniffer.js";
import type { EngineId } from "../src/types/engine.js";
import {
  loadCases,
  readFixture,
  syntheticScannedPdf,
  syntheticTextPdf,
  type FixtureCase,
} from "./helpers.js";

/** Resolve the engine the pipeline would ultimately use for a fixture case. */
function finalEngine({ meta, dir }: FixtureCase): EngineId {
  switch (meta.inputKind) {
    case "prompt":
    case "email":
      return route(sniffText(readFixture(dir, "input.txt"))).engine;

    case "html":
      return route(sniffText(readFixture(dir, "input.html"), "input.html")).engine;

    case "csv":
      return route(sniffText(readFixture(dir, "input.csv"), "input.csv")).engine;

    case "pdf-table": {
      // Text-layer PDF: provisionally fast path; the committed
      // input.extracted.txt IS the degraded fast-path output that must
      // trip the table-degradation escalation.
      const sniff = sniffBuffer(syntheticTextPdf(1), "quarterly-report.pdf");
      const decision = route(sniff);
      expect(decision.engine).toBe("markitdown");
      expect(decision.postChecks).toContain("table-degradation");
      const verdict = shouldEscalate(decision, sniff, readFixture(dir, "input.extracted.txt"));
      expect(verdict.failedChecks).toContain("table-degradation");
      return verdict.escalate ? "docling" : decision.engine;
    }

    case "scanned-pdf": {
      const sniff = sniffBuffer(syntheticScannedPdf(), "scanned-invoice.pdf");
      const decision = route(sniff);
      expect(decision.ocr).toBe(true);
      return decision.engine;
    }
  }
}

describe("router conformance against the golden corpus", () => {
  for (const fixtureCase of loadCases()) {
    it(`${fixtureCase.meta.id} routes to ${fixtureCase.meta.expectedEngine}`, () => {
      expect(finalEngine(fixtureCase)).toBe(fixtureCase.meta.expectedEngine);
    });
  }
});

describe("routing overrides", () => {
  const textPdfSniff = sniffBuffer(syntheticTextPdf(3), "doc.pdf");

  it("fidelity=fast pins the fast path and disarms escalation", () => {
    const decision = route(textPdfSniff, { fidelity: "fast" });
    expect(decision.engine).toBe("markitdown");
    expect(decision.postChecks).toEqual([]);
  });

  it("fidelity=high pins docling", () => {
    expect(route(textPdfSniff, { fidelity: "high" }).engine).toBe("docling");
  });

  it("ocr=true forces docling with OCR even on text-layer PDFs", () => {
    const decision = route(textPdfSniff, { ocr: true });
    expect(decision.engine).toBe("docling");
    expect(decision.ocr).toBe(true);
  });

  it("unknown input defaults to the high-fidelity engine", () => {
    const decision = route({ kind: "unknown", mime: "application/octet-stream", bytes: 10 });
    expect(decision.engine).toBe("docling");
  });
});
