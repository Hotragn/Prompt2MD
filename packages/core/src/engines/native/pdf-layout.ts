import { looksLikeFlattenedTableRow } from "../../router/escalation.js";
import { toMarkdownTable } from "./ooxml.js";

/**
 * Table reconstruction from PDF text geometry.
 *
 * A PDF has no tables. It has glyphs at coordinates, and a table is something
 * a human infers from where they sit. Plain text extraction throws the
 * coordinates away, which is why every extractor flattens a table into a
 * run-on line — the damage the pipeline's `table-degradation` check exists to
 * notice. pdf.js hands back the position of every run, so the geometry is
 * right there; this reads it.
 *
 * Columns are found as vertical whitespace corridors, not by clustering the
 * left edges of the text. That distinction is the whole design: numeric
 * columns are right-aligned, so their left edges wander by ten points or more
 * between rows (4,812 / 917 / 1,204) and clustering on them produces garbage.
 * A gap that stays empty down the entire block is a column boundary no matter
 * how the text inside is aligned.
 */

export interface PositionedItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextRow {
  readonly y: number;
  readonly items: readonly PositionedItem[];
}

/** Rows closer than this share a baseline; below it they are separate lines. */
const ROW_TOLERANCE_RATIO = 0.6;
/** A corridor narrower than this is inter-word spacing, not a column break. */
const MIN_CORRIDOR = 5;
/** Fewer rows than this is not a table, it is a coincidence. */
const MIN_TABLE_ROWS = 2;
/** A row needs this many cells before it can anchor a table block. */
const MIN_TABLE_COLUMNS = 3;

/** Group runs onto shared baselines, top of page first. */
export function groupRows(items: readonly PositionedItem[]): TextRow[] {
  const usable = items.filter((i) => i.text.trim() !== "");
  if (usable.length === 0) return [];

  const heights = usable.map((i) => i.height).filter((h) => h > 0).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] ?? 10;
  const tolerance = Math.max(1, median * ROW_TOLERANCE_RATIO);

  // PDF space puts the origin at the bottom, so descending y reads down the page.
  const sorted = [...usable].sort((a, b) => b.y - a.y);
  const rows: { y: number; items: PositionedItem[] }[] = [];

  for (const item of sorted) {
    const row = rows[rows.length - 1];
    if (row !== undefined && Math.abs(row.y - item.y) <= tolerance) {
      row.items.push(item);
      continue;
    }
    rows.push({ y: item.y, items: [item] });
  }

  return rows.map((r) => ({ y: r.y, items: [...r.items].sort((a, b) => a.x - b.x) }));
}

/**
 * Split a row into cells wherever the runs are separated by a real gap.
 *
 * pdf.js emits a run per styling change, so "Op. Income" can arrive as two
 * runs; merging on small gaps keeps a phrase in one cell.
 */
function cells(row: TextRow, gap: number): { x: number; end: number; text: string }[] {
  const out: { x: number; end: number; text: string }[] = [];
  for (const item of row.items) {
    const last = out[out.length - 1];
    if (last !== undefined && item.x - last.end < gap) {
      // Whether to put a space back depends on the type size, not an absolute
      // distance: a space is roughly a fifth of the font size, while a styling
      // change inside a word leaves almost no gap at all. A fixed threshold
      // renders "Op. Income" as "Op.Income" at one size and splits words at
      // another.
      const spaceWidth = Math.max(0.5, (item.height > 0 ? item.height : 10) * 0.2);
      last.text = `${last.text}${item.x - last.end >= spaceWidth ? " " : ""}${item.text}`;
      last.end = Math.max(last.end, item.x + item.width);
      continue;
    }
    out.push({ x: item.x, end: item.x + item.width, text: item.text });
  }
  return out.map((c) => ({ ...c, text: c.text.replace(/\s+/g, " ").trim() })).filter((c) => c.text !== "");
}

/**
 * The x ranges left empty by every row in the block.
 *
 * Built by painting each row's occupied spans onto one line and reading off
 * what nothing ever covered. Alignment inside the columns is irrelevant to
 * this, which is the point.
 */
export function findCorridors(rows: readonly TextRow[]): number[] {
  const spans: { from: number; to: number }[] = [];
  for (const row of rows) {
    for (const cell of cells(row, MIN_CORRIDOR)) spans.push({ from: cell.x, to: cell.end });
  }
  if (spans.length === 0) return [];

  spans.sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last !== undefined && span.from <= last.to) {
      last.to = Math.max(last.to, span.to);
      continue;
    }
    merged.push({ ...span });
  }

  const boundaries: number[] = [];
  for (let i = 1; i < merged.length; i++) {
    const from = merged[i - 1]?.to ?? 0;
    const to = merged[i]?.from ?? 0;
    if (to - from >= MIN_CORRIDOR) boundaries.push((from + to) / 2);
  }
  return boundaries;
}

/** True when this row looks like it belongs to a grid rather than a paragraph. */
function isTabular(row: TextRow): boolean {
  return cells(row, MIN_CORRIDOR).length >= MIN_TABLE_COLUMNS;
}

export interface Block {
  readonly kind: "table" | "prose";
  readonly rows: readonly TextRow[];
}

/** Partition the page into runs of tabular rows and everything else. */
export function segment(rows: readonly TextRow[]): Block[] {
  const blocks: Block[] = [];
  for (const row of rows) {
    const kind = isTabular(row) ? "table" : "prose";
    const last = blocks[blocks.length - 1];
    if (last !== undefined && last.kind === kind) {
      (last.rows as TextRow[]).push(row);
      continue;
    }
    blocks.push({ kind, rows: [row] });
  }

  // A lone tabular row has no grid to belong to — a wide line with a few gaps
  // is far more often a heading with tab stops than a one-row table.
  return blocks.map((b) =>
    b.kind === "table" && b.rows.length < MIN_TABLE_ROWS ? { kind: "prose" as const, rows: b.rows } : b,
  );
}

function renderTable(rows: readonly TextRow[]): string {
  const boundaries = findCorridors(rows);
  if (boundaries.length === 0) return renderProse(rows);

  const grid = rows.map((row) => {
    const line = Array.from({ length: boundaries.length + 1 }, () => "");
    for (const cell of cells(row, MIN_CORRIDOR)) {
      // Place by the cell's midpoint: a right-aligned number and a
      // left-aligned label in the same column both land in the same slot.
      const centre = (cell.x + cell.end) / 2;
      let column = 0;
      while (column < boundaries.length && centre > (boundaries[column] ?? 0)) column++;
      line[column] = line[column] === "" ? cell.text : `${line[column]} ${cell.text}`;
    }
    return line;
  });

  // A column empty in every row is a corridor we split on twice; dropping it
  // avoids a table of blank gutters.
  const keep = Array.from({ length: boundaries.length + 1 }, (_, i) =>
    grid.some((line) => (line[i] ?? "") !== ""),
  );
  const trimmed = grid.map((line) => line.filter((_, i) => keep[i] === true));
  return toMarkdownTable(trimmed);
}

/**
 * Prose rows, with lines rejoined where the page merely wrapped them.
 *
 * Safe to do here in a way it was not before: tabular rows are their own
 * blocks by this point, so joining can no longer merge table rows into one
 * line and blind the `table-degradation` check. The predicate is still
 * consulted as a second line of defence in case a grid was misread as prose.
 */
function renderProse(rows: readonly TextRow[]): string {
  const lines = rows
    .map((row) => row.items.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim())
    .filter((l) => l !== "");

  const out: string[] = [];
  for (const line of lines) {
    const previous = out[out.length - 1];
    if (previous !== undefined && canJoin(previous, line)) {
      out[out.length - 1] = /\w-$/.test(previous)
        ? previous.replace(/-$/, "") + line
        : `${previous} ${line}`;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function canJoin(previous: string, line: string): boolean {
  if (previous === "" || line === "") return false;
  if (looksLikeFlattenedTableRow(previous) || looksLikeFlattenedTableRow(line)) return false;
  if (/[.!?:;]$/.test(previous)) return false;
  return !/^\s*(?:[-*•#>]|\d+[.)])/.test(line);
}

/** One page of positioned runs to Markdown, tables kept as tables. */
export function layoutToMarkdown(items: readonly PositionedItem[]): string {
  return segment(groupRows(items))
    .map((block) => (block.kind === "table" ? renderTable(block.rows) : renderProse(block.rows)))
    .filter((s) => s.trim() !== "")
    .join("\n\n");
}
