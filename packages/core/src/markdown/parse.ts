import { createHash } from "node:crypto";
import type { MarkdownDoc, MarkdownSection, SectionKind } from "../types/document.js";
import type { TokenCounter } from "../types/tokens.js";

export function hashSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

interface Classified {
  readonly kind: SectionKind;
  readonly level?: number;
}

function classifyBlock(block: string): Classified {
  const first = block.trimStart();
  const heading = /^(#{1,6})\s/.exec(first);
  if (heading?.[1] !== undefined) return { kind: "heading", level: heading[1].length };
  if (first.startsWith("|")) return { kind: "table" };
  if (first.startsWith("```")) return { kind: "code" };
  if (first.startsWith(">")) return { kind: "blockquote" };
  if (/^(?:[-*+]|\d+\.)\s/.test(first)) return { kind: "list" };
  if (first.startsWith("![")) return { kind: "figure" };
  return { kind: "paragraph" };
}

interface Block {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Split markdown into blocks on blank lines, keeping fenced code intact.
 *
 * Offsets are tracked against the ORIGINAL string rather than re-locating
 * rejoined text, so `markdown.slice(block.start, block.end) === block.text`
 * holds for every line-ending style. This is what makes `retrieve_original`
 * byte-exact on CRLF content (the default for Windows Git checkouts).
 */
function splitBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let inFence = false;
  let start = -1;
  let end = -1;

  const flush = (): void => {
    if (start < 0) return;
    let s = start;
    let e = end;
    while (s < e && /\s/.test(markdown[s]!)) s++;
    while (e > s && /\s/.test(markdown[e - 1]!)) e--;
    if (e > s) blocks.push({ text: markdown.slice(s, e), start: s, end: e });
    start = -1;
    end = -1;
  };

  let pos = 0;
  for (;;) {
    const newline = markdown.indexOf("\n", pos);
    const lineEnd = newline === -1 ? markdown.length : newline;
    const line = markdown.slice(pos, lineEnd);

    if (/^\s*```/.test(line)) inFence = !inFence;

    if (!inFence && line.trim() === "") {
      flush();
    } else if (!inFence && /^#{1,6}\s/.test(line.trimStart())) {
      // Headings are line-scoped: always their own block, even without
      // surrounding blank lines.
      flush();
      start = pos;
      end = lineEnd;
      flush();
    } else {
      if (start < 0) start = pos;
      end = lineEnd;
    }

    if (newline === -1) break;
    pos = newline + 1;
  }
  flush();
  return blocks;
}

/**
 * Parse engine Markdown output into the MarkdownDoc IR. Every section gets a
 * SourceSpan into the parsed text so `retrieve_original` can anchor back;
 * Phase 3 re-points spans at the pre-conversion original where offsets are
 * recoverable.
 */
export function parseMarkdown(markdown: string, counter: TokenCounter): MarkdownDoc {
  const sourceId = hashSource(markdown);
  const sections: MarkdownSection[] = [];
  let title: string | undefined;

  for (const [index, block] of splitBlocks(markdown).entries()) {
    const { kind, level } = classifyBlock(block.text);
    if (title === undefined && kind === "heading" && level === 1) {
      title = block.text.replace(/^#\s*/, "").trim();
    }
    sections.push({
      id: `s${index}`,
      kind,
      ...(level !== undefined ? { level } : {}),
      markdown: block.text,
      tokens: counter.count(block.text),
      volatility: "stable",
      source: { sourceId, start: block.start, end: block.end },
    });
  }

  return {
    sourceId,
    ...(title !== undefined ? { title } : {}),
    sections,
    warnings: [],
  };
}
