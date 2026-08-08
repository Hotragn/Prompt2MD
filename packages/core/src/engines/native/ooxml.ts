import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

/**
 * Shared OOXML plumbing for the xlsx and pptx readers.
 *
 * Office files are ZIP containers of XML parts. Reading them directly costs
 * ~2MB of dependencies (fflate + fast-xml-parser); the obvious alternative,
 * exceljs, is 21.8MB on its own — five times everything else in this engine
 * combined — for one of the seven formats. Hand-rolling the two OOXML readers
 * is the cheaper trade.
 */

export type ZipEntries = Readonly<Record<string, Uint8Array>>;

export function unzip(data: Uint8Array): ZipEntries {
  return unzipSync(data);
}

const decoder = new TextDecoder("utf8");

export function readEntry(entries: ZipEntries, path: string): string | undefined {
  const raw = entries[path];
  return raw === undefined ? undefined : decoder.decode(raw);
}

/**
 * `isArray` is the whole reason this is centralised. XML has no way to say
 * "this is a list of one", so a parser hands back a bare object for a single
 * row and an array for two — and code that reads `rows[0]` silently returns
 * undefined on every single-row sheet. Forcing the repeatable elements to
 * arrays makes one-of-N behave like N-of-N.
 */
export function createParser(arrayTags: readonly string[]): XMLParser {
  const wanted = new Set(arrayTags);
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    // Whitespace inside <a:t> and <t> is content — leading spaces in a run are
    // how Office spells "word boundary between two styled spans".
    trimValues: false,
    parseTagValue: false,
    isArray: (name) => wanted.has(name),
  });
}

/** Every node's text, depth-first, for shapes whose structure we do not model. */
export function collectText(node: unknown, tag: string, out: string[] = []): string[] {
  if (node === null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, tag, out);
    return out;
  }
  for (const [key, value] of Object.entries(node as unknown as Record<string, unknown>)) {
    if (key === tag) {
      if (typeof value === "string") out.push(value);
      else if (Array.isArray(value)) for (const v of value) if (typeof v === "string") out.push(v);
      else if (value !== null && typeof value === "object") {
        const text = (value as unknown as Record<string, unknown>)["#text"];
        if (typeof text === "string") out.push(text);
      }
      continue;
    }
    collectText(value, tag, out);
  }
  return out;
}

/** A cell that would otherwise break the table it sits in. */
export function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * Render a grid as a Markdown table, dropping trailing empty columns.
 *
 * A header separator is emitted only when there is more than one row: a
 * one-row "table" with a separator under it claims the row is a header, which
 * for a stray cell in a spreadsheet is a fact we invented.
 */
export function toMarkdownTable(rows: readonly (readonly string[])[]): string {
  const width = rows.reduce((n, row) => Math.max(n, row.length), 0);
  if (width === 0) return "";
  const padded = rows.map((row) => {
    const cells = Array.from({ length: width }, (_, i) => escapeCell(row[i] ?? ""));
    return `| ${cells.join(" | ")} |`;
  });
  if (padded.length <= 1) return padded.join("\n");
  const separator = `| ${Array.from({ length: width }, () => "---").join(" | ")} |`;
  return [padded[0], separator, ...padded.slice(1)].join("\n");
}
