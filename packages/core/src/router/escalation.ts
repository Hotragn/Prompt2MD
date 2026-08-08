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
 * One line carrying several numeric clusters and no pipe syntax — what a table
 * row looks like after a text extractor has walked over it.
 *
 * Exported because the PDF reader has to agree with this exactly. That reader
 * rejoins wrapped lines so prose does not arrive pre-broken, and a line join
 * across a table turns many flattened rows into one, which is invisible to the
 * check below. Sharing the predicate makes "do not join this" and "this is
 * damage" the same sentence rather than two that can drift apart.
 */
export function looksLikeFlattenedTableRow(line: string): boolean {
  if (line.includes("|")) return false;
  const clusters = line.match(/(?:^|\s)\(?\d[\d,.]*\)?%?(?=\s|$)/g) ?? [];
  return clusters.length >= THRESHOLDS.TABLE_ROW_NUMERIC_CLUSTERS;
}

/**
 * Flattened-table signature: multiple lines carrying several numeric clusters
 * with no pipe-table syntax — the classic result of a text extractor running
 * over a table region.
 */
export function detectTableDegradation(markdown: string): boolean {
  const flattenedRows = markdown.split(/\r?\n/).filter(looksLikeFlattenedTableRow);
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
