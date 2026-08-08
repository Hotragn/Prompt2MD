import type { ConvertOptions, RoutingDecision, SniffReport } from "../types/engine.js";

/** Tunable evidence thresholds. Justification and calibration: docs/adr/ADR-002-engine-selection.md */
export const THRESHOLDS = {
  /** Fast-path output below this many chars/page is suspicious (scan or extraction failure). */
  MIN_YIELD_CHARS_PER_PAGE: 200,
  /** A line with >= this many space-separated numeric clusters (and no pipes) reads as a flattened table row. */
  TABLE_ROW_NUMERIC_CLUSTERS: 3,
  /** >= this many flattened rows in the output escalates to docling. */
  TABLE_DEGRADATION_MIN_ROWS: 2,
} as const;

/**
 * Pure routing function: (evidence, options) -> decision. No I/O, no engine
 * knowledge, fully table-testable against fixtures/cases/*\/case.json.
 *
 * Policy (ADR-001/ADR-002): route by content evidence, not file extension.
 * Text-layer PDFs get the fast path *provisionally* — postChecks arm the
 * evidence-based escalation applied by the pipeline to the fast-path output.
 */
export function route(sniff: SniffReport, options: ConvertOptions = {}): RoutingDecision {
  const fidelity = options.fidelity ?? "auto";

  switch (sniff.kind) {
    case "prompt":
    case "email":
      return {
        engine: "prompt-optimizer",
        ocr: false,
        postChecks: [],
        reason: `plain ${sniff.kind} text — LLM optimizer path; document engines add nothing`,
      };

    case "csv":
    case "json":
    case "html":
      return {
        engine: "native",
        ocr: false,
        postChecks: [],
        reason: `${sniff.kind} converts in-process — no sidecar needed`,
      };

    case "office":
      if (fidelity === "high") {
        return docling(false, "fidelity=high pins office documents to the high-fidelity engine");
      }
      return {
        engine: "native",
        ocr: false,
        postChecks: [],
        reason: "OOXML carries explicit structure — read in-process, near-lossless",
      };

    case "image":
      return docling(true, "raster image input — OCR required");

    case "pdf": {
      if (fidelity === "fast") {
        return { engine: "native", ocr: false, postChecks: [], reason: "fidelity=fast pins the fast path (escalation disabled)" };
      }
      if (fidelity === "high") {
        return docling(options.ocr ?? false, "fidelity=high pins the high-fidelity engine");
      }
      if (options.ocr === true) {
        return docling(true, "OCR forced by options");
      }
      if (sniff.pdf?.looksScanned === true) {
        return docling(true, "no font objects but image XObjects present — image-only scan needs OCR");
      }
      return {
        engine: "native",
        ocr: false,
        postChecks: ["low-yield", "table-degradation"],
        reason: "PDF with a text layer — provisional fast path; escalation checks armed",
      };
    }

    case "unknown":
      return docling(false, "unrecognized input — high-fidelity engine is the safe default");
  }
}

function docling(ocr: boolean, reason: string): RoutingDecision {
  return { engine: "docling", ocr, postChecks: [], reason };
}
