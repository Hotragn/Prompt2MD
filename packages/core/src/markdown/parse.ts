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

/** Split markdown into blocks on blank lines, keeping fenced code intact. */
function splitBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  const flush = (): void => {
    const text = current.join("\n").trim();
    if (text.length > 0) blocks.push(text);
    current = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === "") {
      flush();
    } else if (!inFence && /^#{1,6}\s/.test(line.trimStart())) {
      // Headings are line-scoped: always their own block, even without
      // surrounding blank lines.
      flush();
      current.push(line);
      flush();
    } else {
      current.push(line);
    }
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
  let cursor = 0;

  for (const [index, block] of splitBlocks(markdown).entries()) {
    const { kind, level } = classifyBlock(block);
    if (title === undefined && kind === "heading" && level === 1) {
      title = block.replace(/^#\s*/, "").trim();
    }
    const start = markdown.indexOf(block, cursor);
    const end = start >= 0 ? start + block.length : cursor;
    if (start >= 0) cursor = end;
    sections.push({
      id: `s${index}`,
      kind,
      ...(level !== undefined ? { level } : {}),
      markdown: block,
      tokens: counter.count(block),
      volatility: "stable",
      source: { sourceId, start: Math.max(start, 0), end },
    });
  }

  return {
    sourceId,
    ...(title !== undefined ? { title } : {}),
    sections,
    warnings: [],
  };
}
