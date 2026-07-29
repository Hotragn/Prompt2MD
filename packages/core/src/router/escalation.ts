import type { PostCheck, RoutingDecision, SniffReport } from "../types/engine.js";
import { THRESHOLDS } from "./router.js";

/**
 * Evidence-based escalation (ADR-002): rather than guessing table/scan
 * structure from compressed PDF bytes upfront, the pipeline inspects the
 * fast-path OUTPUT and escalates to docling when it shows damage.
 */

/** Output too thin for the page count — scan slipped through or extraction failed. */
export function detectLowYield(sniff: SniffReport, markdown: string): boolean {
  const pages = sniff.pdf?.pageCount ?? 1;
  const chars = markdown.replace(/\s+/g, " ").trim().length;
  return chars / pages < THRESHOLDS.MIN_YIELD_CHARS_PER_PAGE;
}

/**
 * Flattened-table signature: multiple lines carrying several numeric clusters
 * with no pipe-table syntax — the classic result of a text extractor running
 * over a table region.
 */
export function detectTableDegradation(markdown: string): boolean {
  const flattenedRows = markdown.split(/\r?\n/).filter((line) => {
    if (line.includes("|")) return false;
    const clusters = line.match(/(?:^|\s)\(?\d[\d,.]*\)?%?(?=\s|$)/g) ?? [];
    return clusters.length >= THRESHOLDS.TABLE_ROW_NUMERIC_CLUSTERS;
  });
  return flattenedRows.length >= THRESHOLDS.TABLE_DEGRADATION_MIN_ROWS;
}

export interface EscalationVerdict {
  readonly escalate: boolean;
  readonly failedChecks: readonly PostCheck[];
  /** Low yield usually means a missed scan, so the retry runs with OCR. */
  readonly ocr: boolean;
}

export function shouldEscalate(
  decision: RoutingDecision,
  sniff: SniffReport,
  fastPathMarkdown: string,
): EscalationVerdict {
  const failed: PostCheck[] = [];
  for (const check of decision.postChecks) {
    if (check === "low-yield" && detectLowYield(sniff, fastPathMarkdown)) failed.push(check);
    if (check === "table-degradation" && detectTableDegradation(fastPathMarkdown)) failed.push(check);
  }
  return {
    escalate: failed.length > 0,
    failedChecks: failed,
    ocr: failed.includes("low-yield"),
  };
}
