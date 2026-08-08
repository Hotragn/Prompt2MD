/**
 * Lazy context: send a navigable INDEX of a document instead of the document.
 *
 * Compression answers "how do I fit this in the window?". This answers a better
 * question: "why send it at all before knowing which part matters?". Headings
 * stay verbatim because they are the map. Every other section becomes a one-line
 * stub carrying its kind, token cost, a short preview, and its `p2md:src`
 * anchor — enough for a model to choose, and nothing more. The chosen sections
 * come back verbatim through `retrieve_original`, so nothing is summarized and
 * nothing is lost.
 *
 * For a task that needs three sections out of two hundred, this beats
 * compressing all two hundred, and it beats truncation outright.
 *
 * Two rules keep it honest, both learned the hard way elsewhere in this
 * codebase:
 *
 *   1. A stub is not free. Anchor plus preview runs ~25-40 tokens, so stubbing a
 *      short paragraph COSTS tokens. Sections cheaper than their own stub stay
 *      verbatim.
 *   2. A section with no `source` span cannot be retrieved. Stubbing it would
 *      destroy content while claiming to be lossless, so it always stays
 *      verbatim.
 */
import type { MarkdownDoc, MarkdownSection } from "../types/document.js";
import { formatAnchor } from "../store.js";

export interface OutlineOptions {
  /** Characters of preview text per stub. Enough to choose by, not to read. */
  readonly previewChars?: number;
  /**
   * Sections never stubbed regardless of size, because a preview of them is
   * misleading rather than merely short. A half-shown table is worse than no
   * table, and code loses meaning the moment it is elided.
   */
  readonly alwaysVerbatim?: readonly MarkdownSection["kind"][];
}

export interface OutlineResult {
  /** The index. Send this instead of the document. */
  readonly markdown: string;
  readonly indexTokens: number;
  readonly fullTokens: number;
  /** Sections replaced by a stub. */
  readonly stubbed: number;
  /** Sections left verbatim, either too small to stub or not retrievable. */
  readonly verbatim: number;
  /**
   * Sections that could not be stubbed because they carry no source span.
   * A high count means the upstream pipeline is dropping anchors and the
   * saving will be far smaller than expected — surfaced rather than hidden.
   */
  readonly unanchored: number;
  /**
   * False when the index costs at least as much as the document it describes,
   * which happens on short inputs where the fixed preamble dominates. Send the
   * document itself in that case.
   */
  readonly worthwhile: boolean;
}

const DEFAULT_PREVIEW_CHARS = 72;
const DEFAULT_ALWAYS_VERBATIM: readonly MarkdownSection["kind"][] = ["heading", "table", "code"];

/** First line of real text, collapsed and clipped, for a one-line preview. */
function preview(markdown: string, limit: number): string {
  const flat = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= limit) return flat;
  return `${flat.slice(0, limit).trimEnd()}…`;
}

export function buildOutline(
  doc: MarkdownDoc,
  countTokens: (text: string) => number,
  options: OutlineOptions = {},
): OutlineResult {
  const previewChars = options.previewChars ?? DEFAULT_PREVIEW_CHARS;
  const alwaysVerbatim = options.alwaysVerbatim ?? DEFAULT_ALWAYS_VERBATIM;

  const lines: string[] = [];
  let stubbed = 0;
  let verbatim = 0;
  let unanchored = 0;
  let fullTokens = 0;

  for (const section of doc.sections) {
    fullTokens += section.tokens;

    const keepWhole = alwaysVerbatim.includes(section.kind);
    if (keepWhole) {
      lines.push(section.markdown);
      verbatim += 1;
      continue;
    }

    // Rule 2: unretrievable content is never replaced by a pointer to nothing.
    if (section.source === undefined) {
      lines.push(section.markdown);
      verbatim += 1;
      unanchored += 1;
      continue;
    }

    const anchor = formatAnchor({
      sourceId: section.source.sourceId,
      start: section.source.start,
      end: section.source.end,
    });
    const stub = `- ${section.kind} · ${section.tokens} tokens · "${preview(section.markdown, previewChars)}" ${anchor}`;

    // Rule 1: a stub that costs more than the content it hides is a loss.
    if (countTokens(stub) >= section.tokens) {
      lines.push(section.markdown);
      verbatim += 1;
      continue;
    }

    lines.push(stub);
    stubbed += 1;
  }

  // Kept deliberately terse. This preamble is a FIXED cost paid on every
  // index, so verbose guidance here is the same mistake as a bloated
  // instruction file: on a small document it costs more than the stubs save.
  // The first draft ran ~115 tokens and swallowed the entire saving on a
  // three-section document. Every sentence below is load-bearing: what this
  // is, how to read a section, fetch less, and do not quote a preview.
  const header = [
    "<!-- p2md:index v1 -->",
    doc.title === undefined ? undefined : `# ${doc.title}`,
    "",
    "INDEX, not content. Each `-` is a placeholder — pass its anchor to",
    "retrieve_original to read that section. Fetch only what the task needs; quote",
    "retrieved text, never the clipped preview.",
    "",
  ].filter((line): line is string => line !== undefined);

  const body = lines.join("\n\n");
  const markdown = `${header.join("\n")}\n${body}\n`;
  const indexTokens = countTokens(markdown);

  return {
    markdown,
    indexTokens,
    fullTokens,
    stubbed,
    verbatim,
    unanchored,
    // Indexing is not free, and on a short document the preamble alone can
    // exceed what stubbing saves. Say so rather than let a caller assume any
    // index is an improvement.
    worthwhile: indexTokens < fullTokens,
  };
}
