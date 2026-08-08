import { collectText, createParser, readEntry, toMarkdownTable, unzip, type ZipEntries } from "./ooxml.js";

/**
 * PPTX -> Markdown, one section per slide, plus speaker notes.
 *
 * A slide is a bag of positioned shapes with no reading order recorded
 * anywhere, so "the title" is a structural claim the file rarely makes
 * explicitly. Rather than guess from geometry, every shape's text becomes a
 * paragraph under a `## Slide N` heading — dull, but it never asserts a
 * hierarchy that is not in the file.
 */

const parser = createParser(["p:sp", "a:p", "a:r", "a:tr", "a:tc", "p:graphicFrame"]);

function slidePaths(entries: ZipEntries): string[] {
  return Object.keys(entries)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    // Numeric order: slide10 sorts before slide2 lexically, which would
    // reorder any deck with ten or more slides.
    .sort((a, b) => slideNumber(a) - slideNumber(b));
}

function slideNumber(path: string): number {
  return Number(/slide(\d+)\.xml$/.exec(path)?.[1] ?? 0);
}

/** Each <a:p> is one paragraph; its <a:t> runs concatenate without separators. */
function paragraphs(node: unknown): string[] {
  const parsed = node as { "a:p"?: unknown[] } | undefined;
  const list = parsed?.["a:p"];
  if (!Array.isArray(list)) return collectText(node, "a:t").join("").trim() === "" ? [] : [collectText(node, "a:t").join("").trim()];
  return list.map((p) => collectText(p, "a:t").join("").trim()).filter((t) => t !== "");
}

/** Tables live in a graphicFrame; rows and cells are a:tr / a:tc. */
function tables(shapeTree: unknown): string[] {
  const frames = (shapeTree as { "p:graphicFrame"?: unknown[] } | undefined)?.["p:graphicFrame"];
  if (!Array.isArray(frames)) return [];
  const out: string[] = [];
  for (const frame of frames) {
    const rows = findRows(frame);
    if (rows.length > 0) out.push(toMarkdownTable(rows));
  }
  return out;
}

function findRows(node: unknown): string[][] {
  if (node === null || typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  const tr = record["a:tr"];
  if (Array.isArray(tr)) {
    return tr.map((row) => {
      const cells = (row as { "a:tc"?: unknown[] })["a:tc"] ?? [];
      return (Array.isArray(cells) ? cells : [cells]).map((cell) =>
        collectText(cell, "a:t").join("").trim(),
      );
    });
  }
  for (const value of Object.values(record)) {
    const found = findRows(value);
    if (found.length > 0) return found;
  }
  return [];
}

function slideMarkdown(entries: ZipEntries, path: string, index: number): string {
  const xml = readEntry(entries, path);
  if (xml === undefined) return "";
  const parsed = parser.parse(xml) as {
    "p:sld"?: { "p:cSld"?: { "p:spTree"?: { "p:sp"?: unknown[] } } };
  };
  const tree = parsed["p:sld"]?.["p:cSld"]?.["p:spTree"];

  const blocks: string[] = [];
  for (const shape of tree?.["p:sp"] ?? []) {
    const body = (shape as Record<string, unknown>)["p:txBody"];
    blocks.push(...paragraphs(body));
  }
  blocks.push(...tables(tree));

  const notes = notesFor(entries, index);
  if (notes !== "") blocks.push(`> **Speaker notes:** ${notes}`);

  if (blocks.length === 0) return `## Slide ${index}\n\n_(no text on this slide)_`;
  return `## Slide ${index}\n\n${blocks.join("\n\n")}`;
}

/**
 * Notes carry the argument a deck only gestures at, so they are worth keeping
 * — marked as notes, never merged into the slide's own text.
 */
function notesFor(entries: ZipEntries, index: number): string {
  const xml = readEntry(entries, `ppt/notesSlides/notesSlide${index}.xml`);
  if (xml === undefined) return "";
  const text = collectText(parser.parse(xml), "a:t").join(" ").replace(/\s+/g, " ").trim();
  // The slide number is itself a text run in the notes master; a notes part
  // containing only that is empty in every sense that matters here.
  return text === String(index) ? "" : text;
}

export function pptxToMarkdown(data: Uint8Array): string {
  const entries = unzip(data);
  const slides = slidePaths(entries);
  return slides
    .map((path, i) => slideMarkdown(entries, path, i + 1))
    .filter((s) => s !== "")
    .join("\n\n")
    .trim();
}
