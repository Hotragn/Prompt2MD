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

/**
 * Decompression ceilings. DEFLATE reaches roughly 1000:1, so without a limit a
 * 25MB upload — comfortably inside the web app's size guard, which weighs the
 * compressed bytes — expands to about 25GB and takes the process out with it.
 * A real .xlsx of a few hundred MB uncompressed does not exist in practice, so
 * these are far above any honest document and far below anything fatal.
 */
const MAX_ENTRY_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

export function unzip(data: Uint8Array): ZipEntries {
  let total = 0;

  // The check runs in `filter`, which fflate calls before inflating anything —
  // the size comes from the archive's directory, so an oversized entry is
  // refused without ever being expanded.
  //
  // That directory is written by whoever made the file, so a header that
  // understates its entry still gets inflated: this stops every ordinary bomb,
  // not a determined liar. The caller's own byte limit on the upload is what
  // bounds that case, which is why this is a guard and not a guarantee.
  return unzipSync(data, {
    filter: (file) => {
      total += file.originalSize;
      if (file.originalSize > MAX_ENTRY_BYTES || total > MAX_TOTAL_BYTES) {
        throw new Error(
          `archive declares ${Math.round(total / 1024 / 1024)}MB uncompressed, ` +
            `over the ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB limit — refusing to expand it`,
        );
      }
      return true;
    },
  });
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
