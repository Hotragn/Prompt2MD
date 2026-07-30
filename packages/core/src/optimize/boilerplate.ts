import type { MarkdownDoc, MarkdownSection } from "../types/document.js";
import type { TokenCounter } from "../types/tokens.js";

/**
 * Deterministic boilerplate removal + paragraph-level deduplication. Runs on
 * every document-path conversion (pipeline OPTIMIZE stage) and again as phase 2
 * of compression — free, reproducible, and idempotent. Structure-critical
 * kinds (tables, code, headings) are never candidates.
 */

export interface StripResult {
  readonly doc: MarkdownDoc;
  readonly removedTokens: number;
  readonly removedSections: number;
}

const SIGNOFF_LINE = /^\s*sent from my [a-z0-9 ]+$/im;
const LEGAL_FOOTER =
  /\b(this (e-?mail|message) (and any attachments )?(is|are) confidential|intended solely for the (addressee|recipient)|if you (have )?received this (e-?mail|message) in error)\b/i;
const NEWSLETTER_CHROME =
  /\b(unsubscribe|manage (your )?preferences|view (this email )?in (your )?browser|in your inbox|sign up free|accept all cookies|we use cookies)\b/i;
const EMAIL_QUOTE_HEADER = /^\s*>?\s*-{2,}\s*Original Message\s*-{2,}|^\s*>?\s*(From|Sent|Subject|To):\s/im;
const COPYRIGHT_FOOTER = /^\s*(©|\(c\)\s*\d{4}|copyright\s+\d{4})/i;
const AD_FIGURE = /!\[(advertisement|ad\b|banner|sponsor)[^\]]*\]/i;
const LINK_ONLY_ITEM = /^\s*[-*+]\s*\[[^\]]{1,80}\]\([^)]+\)\s*$/;

function isNavLinkList(markdown: string): boolean {
  const items = markdown.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return items.length >= 2 && items.every((l) => LINK_ONLY_ITEM.test(l));
}

function isBoilerplate(section: MarkdownSection): boolean {
  const { kind, markdown } = section;
  if (kind === "table" || kind === "code" || kind === "heading") return false;
  if (SIGNOFF_LINE.test(markdown)) return true;
  if (LEGAL_FOOTER.test(markdown)) return true;
  if (kind === "paragraph" && markdown.length < 300 && NEWSLETTER_CHROME.test(markdown)) return true;
  if (kind === "paragraph" && markdown.length < 200 && COPYRIGHT_FOOTER.test(markdown)) return true;
  // Nav/related-links chrome: lists whose every item is a bare link.
  if (kind === "list" && isNavLinkList(markdown)) return true;
  if (kind === "figure" && AD_FIGURE.test(markdown)) return true;
  // Quoted email history: blockquotes are only stripped when they carry
  // mail headers — ordinary markdown blockquotes are content, not noise.
  if (kind === "blockquote" && EMAIL_QUOTE_HEADER.test(markdown)) return true;
  return false;
}

/** Whitespace/markup-insensitive key for duplicate detection. */
function dedupeKey(markdown: string): string {
  return markdown
    .toLowerCase()
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Headings whose entire section content got stripped are chrome too. */
function pruneOrphanHeadings(sections: readonly MarkdownSection[]): MarkdownSection[] {
  const kept: MarkdownSection[] = [];
  for (const section of sections) {
    while (kept.length > 0) {
      const last = kept[kept.length - 1]!;
      const isOrphan =
        last.kind === "heading" &&
        section.kind === "heading" &&
        (section.level ?? 1) <= (last.level ?? 1);
      if (!isOrphan) break;
      kept.pop();
    }
    kept.push(section);
  }
  while (kept.length > 0 && kept[kept.length - 1]!.kind === "heading" && (kept[kept.length - 1]!.level ?? 1) > 1) {
    kept.pop();
  }
  return kept;
}

export function stripBoilerplate(doc: MarkdownDoc, counter: TokenCounter): StripResult {
  const seen = new Set<string>();
  const filtered: MarkdownSection[] = [];
  let removedTokens = 0;
  let removedSections = 0;

  for (const section of doc.sections) {
    if (isBoilerplate(section)) {
      removedTokens += section.tokens;
      removedSections += 1;
      continue;
    }
    // Dedupe applies to repeatable prose only; headings/tables/code repeat legitimately.
    if (section.kind === "paragraph" || section.kind === "list" || section.kind === "blockquote") {
      const key = dedupeKey(section.markdown);
      if (key.length > 0 && seen.has(key)) {
        removedTokens += section.tokens;
        removedSections += 1;
        continue;
      }
      seen.add(key);
    }
    filtered.push(section);
  }

  const pruned = pruneOrphanHeadings(filtered);
  for (const dropped of filtered.filter((s) => !pruned.includes(s))) {
    removedTokens += dropped.tokens;
    removedSections += 1;
  }

  void counter;
  return {
    doc: { ...doc, sections: pruned },
    removedTokens,
    removedSections,
  };
}
