/**
 * Canonical intermediate representation (IR) for converted content.
 * Every engine emits Markdown that is parsed into a MarkdownDoc; every
 * optimization pass is a pure MarkdownDoc -> MarkdownDoc transform.
 */

export type SectionKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "code"
  | "blockquote"
  | "figure"
  | "metadata";

/**
 * Cache-alignment hint. Stable sections are laid out ahead of volatile ones
 * so provider prompt caches get the longest possible unchanged prefix.
 * Phase 2 defaults everything to "stable"; the Phase 3 optimizer assigns
 * volatility (timestamps, per-run data, user-specific fragments).
 */
export type Volatility = "stable" | "volatile";

/** Anchor back into the verbatim original. Powers the `retrieve_original` MCP tool. */
export interface SourceSpan {
  /** Content hash of the original input (sha-256 hex, truncated to 16 chars). */
  readonly sourceId: string;
  /** Character offset range in the original text / extracted text layer. */
  readonly start: number;
  readonly end: number;
  readonly page?: number;
}

export interface ConversionWarning {
  readonly code:
    | "low-yield"
    | "table-degradation"
    | "ocr-suspect"
    | "totals-mismatch"
    | "budget-exceeded"
    | "engine-fallback"
    | "engine-error"
    | "layout-skipped"
    | "content-removed";
  readonly message: string;
  readonly sectionId?: string;
}

export interface MarkdownSection {
  readonly id: string;
  readonly kind: SectionKind;
  /** Heading depth (1-6); present only when kind === "heading". */
  readonly level?: number;
  readonly markdown: string;
  readonly tokens: number;
  readonly volatility: Volatility;
  readonly source?: SourceSpan;
  /** True once a compression pass has replaced verbatim content with a summary. */
  readonly compressed?: boolean;
}

export interface MarkdownDoc {
  readonly sourceId: string;
  readonly title?: string;
  readonly sections: readonly MarkdownSection[];
  readonly warnings: readonly ConversionWarning[];
}

export function renderMarkdown(doc: MarkdownDoc): string {
  return doc.sections.map((s) => s.markdown).join("\n\n");
}
