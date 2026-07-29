import type { MarkdownDoc, MarkdownSection, TokenCounter } from "@prompt2md/core";

/**
 * Phase 2 of the compression pipeline: deterministic boilerplate removal and
 * paragraph-level deduplication. No LLM involved, so this phase is free,
 * reproducible, and safe to run on every input.
 */

export interface StripResult {
  readonly doc: MarkdownDoc;
  readonly removedTokens: number;
  readonly removedSections: number;
}

const SIGNOFF_LINE = /^\s*sent from my [a-z0-9 ]+$/im;
const LEGAL_FOOTER =
  /\b(this (e-?mail|message) (and any attachments )?(is|are) confidential|intended solely for the (addressee|recipient)|if you (have )?received this (e-?mail|message) in error)\b/i;
const NEWSLETTER_CHROME = /\b(unsubscribe|manage (your )?preferences|view (this email )?in (your )?browser)\b/i;
const EMAIL_QUOTE_HEADER = /^\s*>?\s*-{2,}\s*Original Message\s*-{2,}|^\s*>?\s*(From|Sent|Subject|To):\s/im;

function isBoilerplate(section: MarkdownSection): boolean {
  const { kind, markdown } = section;
  if (kind === "table" || kind === "code" || kind === "heading") return false;
  if (SIGNOFF_LINE.test(markdown)) return true;
  if (LEGAL_FOOTER.test(markdown)) return true;
  if (kind === "paragraph" && markdown.length < 300 && NEWSLETTER_CHROME.test(markdown)) return true;
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

export function stripBoilerplate(doc: MarkdownDoc, counter: TokenCounter): StripResult {
  const seen = new Set<string>();
  const kept: MarkdownSection[] = [];
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
    kept.push(section);
  }

  void counter;
  return {
    doc: { ...doc, sections: kept },
    removedTokens,
    removedSections,
  };
}
