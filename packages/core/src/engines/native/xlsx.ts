import { collectText, createParser, readEntry, toMarkdownTable, unzip, type ZipEntries } from "./ooxml.js";

/**
 * XLSX -> Markdown tables, one section per sheet.
 *
 * Reads the parts directly rather than through a spreadsheet library, because
 * the goal is text for a language model, not a working formula engine: values
 * as they were stored, laid out as a table.
 */

const parser = createParser(["si", "row", "c", "sheet", "r", "Relationship"]);

/** "A" -> 0, "Z" -> 25, "AA" -> 26. */
export function columnIndex(ref: string): number {
  const letters = /^([A-Z]+)/.exec(ref.toUpperCase())?.[1];
  if (letters === undefined) return 0;
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * The shared string table. Rich text splits one logical string across several
 * <r> runs, so a naive read of the first <t> truncates at the first change of
 * formatting — "Q1 **2024** revenue" would come back as "Q1 ".
 */
function sharedStrings(entries: ZipEntries): string[] {
  const xml = readEntry(entries, "xl/sharedStrings.xml");
  if (xml === undefined) return [];
  const parsed = parser.parse(xml) as { sst?: { si?: unknown[] } };
  const items = parsed.sst?.si ?? [];
  return items.map((si) => collectText(si, "t").join(""));
}

interface SheetRef {
  readonly name: string;
  readonly path: string;
}

/**
 * Sheet order and names come from workbook.xml; the file each one lives in
 * comes from the rels part. Falling back to positional sheetN.xml is wrong
 * often enough to matter — Excel does not renumber those files when sheets are
 * deleted, so sheet2.xml can be the third tab, or absent entirely.
 */
function sheetRefs(entries: ZipEntries): SheetRef[] {
  const workbook = readEntry(entries, "xl/workbook.xml");
  const rels = readEntry(entries, "xl/_rels/workbook.xml.rels");
  if (workbook === undefined) return [];

  const relById = new Map<string, string>();
  if (rels !== undefined) {
    const parsedRels = parser.parse(rels) as {
      Relationships?: { Relationship?: { "@Id"?: string; "@Target"?: string }[] };
    };
    for (const rel of parsedRels.Relationships?.Relationship ?? []) {
      const id = rel["@Id"];
      const target = rel["@Target"];
      if (id !== undefined && target !== undefined) {
        relById.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
      }
    }
  }

  const parsed = parser.parse(workbook) as {
    workbook?: { sheets?: { sheet?: { "@name"?: string; "@r:id"?: string }[] } };
  };
  const sheets = parsed.workbook?.sheets?.sheet ?? [];
  return sheets.flatMap((sheet, i) => {
    const name = sheet["@name"] ?? `Sheet${i + 1}`;
    const target = sheet["@r:id"] !== undefined ? relById.get(sheet["@r:id"]) : undefined;
    const path = `xl/${target ?? `worksheets/sheet${i + 1}.xml`}`;
    return entries[path] === undefined ? [] : [{ name, path }];
  });
}

interface RawCell {
  readonly "@r"?: string;
  readonly "@t"?: string;
  readonly v?: string | number;
  readonly is?: unknown;
}

function cellText(cell: RawCell, strings: readonly string[]): string {
  const type = cell["@t"];
  if (type === "s") {
    const index = Number(cell.v);
    return Number.isInteger(index) ? (strings[index] ?? "") : "";
  }
  // Typed inline, rather than via the shared table.
  if (type === "inlineStr") return collectText(cell.is, "t").join("");
  if (type === "b") return cell.v === "1" || cell.v === 1 ? "TRUE" : "FALSE";
  if (cell.v === undefined) return "";
  return String(cell.v);
}

function sheetRows(entries: ZipEntries, path: string, strings: readonly string[]): string[][] {
  const xml = readEntry(entries, path);
  if (xml === undefined) return [];
  const parsed = parser.parse(xml) as {
    worksheet?: { sheetData?: { row?: { c?: RawCell[] }[] } };
  };

  const rows: string[][] = [];
  for (const row of parsed.worksheet?.sheetData?.row ?? []) {
    const cells: string[] = [];
    for (const cell of row.c ?? []) {
      // Empty cells are omitted from the XML entirely, so position has to come
      // from the cell's own reference. Reading sequentially would shift every
      // value left of a gap into the wrong column — silently, and worst in
      // exactly the sparse sheets people actually keep.
      const index = cell["@r"] !== undefined ? columnIndex(cell["@r"]) : cells.length;
      while (cells.length < index) cells.push("");
      cells[index] = cellText(cell, strings);
    }
    rows.push(cells);
  }

  // Trailing all-empty rows are padding, not data.
  while (rows.length > 0 && rows[rows.length - 1]?.every((c) => c === "") === true) rows.pop();
  return rows;
}

export function xlsxToMarkdown(data: Uint8Array): string {
  const entries = unzip(data);
  const strings = sharedStrings(entries);
  const parts: string[] = [];

  for (const sheet of sheetRefs(entries)) {
    const rows = sheetRows(entries, sheet.path, strings);
    parts.push(`## ${sheet.name}`);
    parts.push(rows.length === 0 ? "_(empty sheet)_" : toMarkdownTable(rows));
  }
  return parts.join("\n\n").trim();
}
