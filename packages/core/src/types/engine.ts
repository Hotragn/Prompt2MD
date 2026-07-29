import type { ConversionWarning } from "./document.js";

export type InputKind =
  | "prompt"
  | "email"
  | "html"
  | "csv"
  | "json"
  | "office"
  | "pdf"
  | "image"
  | "unknown";

export type SourceInput =
  | { readonly kind: "text"; readonly text: string; readonly filename?: string }
  | { readonly kind: "buffer"; readonly data: Uint8Array; readonly filename?: string }
  | { readonly kind: "file"; readonly path: string };

/** Cheap, dependency-free evidence about textual input. */
export interface TextProbe {
  readonly chars: number;
  readonly lines: number;
  /** Fraction of lines containing markup tags. */
  readonly markupRatio: number;
  readonly looksLikeEmail: boolean;
  readonly looksLikeCsv: boolean;
}

/**
 * Byte-level PDF evidence from scanning object dictionaries (which are
 * plain text in the file even when content streams are compressed).
 * Deliberately shallow: deep structure detection is delegated to
 * evidence-based escalation on fast-path output (see ADR-002).
 */
export interface PdfProbe {
  /** Approximate, from `/Type /Page` dictionary counts. */
  readonly pageCount: number;
  readonly fontObjects: number;
  readonly imageObjects: number;
  /** Text-show operators visible in uncompressed streams; 0 for compressed. */
  readonly textOperators: number;
  /** No font objects + image XObjects present => image-only scan. */
  readonly looksScanned: boolean;
}

export interface SniffReport {
  readonly kind: InputKind;
  readonly mime: string;
  readonly bytes: number;
  readonly filename?: string;
  readonly text?: TextProbe;
  readonly pdf?: PdfProbe;
}

export type EngineId = "prompt-optimizer" | "markitdown" | "docling";

/**
 * auto — router decides (default). fast — pin the fast path (never escalate).
 * high — pin the high-fidelity path for anything document-shaped.
 */
export type Fidelity = "auto" | "fast" | "high";

export interface ConvertOptions {
  readonly fidelity?: Fidelity;
  readonly tokenBudget?: number;
  /** Force OCR even when a text layer exists. */
  readonly ocr?: boolean;
  /** Max pages per docling request (large-PDF OOM guardrail). Default 100. */
  readonly pageChunkSize?: number;
  readonly model?: string;
}

/** Output checks applied to fast-path results; any failure escalates to docling. */
export type PostCheck = "low-yield" | "table-degradation";

export interface RoutingDecision {
  readonly engine: EngineId;
  readonly ocr: boolean;
  readonly reason: string;
  /** Non-empty only when the decision is provisional (fast path with escalation armed). */
  readonly postChecks: readonly PostCheck[];
}

export interface EngineResult {
  readonly markdown: string;
  readonly warnings: readonly ConversionWarning[];
}

export interface Engine {
  readonly id: EngineId;
  convert(input: SourceInput, sniff: SniffReport, options: ConvertOptions): Promise<EngineResult>;
}
