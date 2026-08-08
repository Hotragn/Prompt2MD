import { toMarkdownTable } from "./ooxml.js";

/**
 * HTML, CSV, and JSON.
 *
 * CSV and JSON are hand-rolled: both are small, and the parsers that would
 * otherwise be pulled in are larger than the code they replace.
 */

/**
 * The slice of the DOM the table rule touches.
 *
 * Turndown runs on its own DOM implementation in Node, not the browser's, so
 * `lib: ["dom"]` would be a lie about what is actually there — and it would
 * pull every browser global into scope for a package that has none.
 */
interface DomLike {
  querySelectorAll(selector: string): ArrayLike<DomLike>;
  readonly textContent: string | null;
}

/**
 * HTML -> Markdown.
 *
 * Turndown is loaded lazily so importing this module costs nothing until an
 * HTML document actually arrives.
 *
 * Elements are dropped before conversion rather than after. Turndown already
 * ignores <script> and <style> tag *names*, but their text nodes survive into
 * the output as bare CSS and JavaScript — which is the single worst thing to
 * feed a token budget, since minified CSS tokenizes appallingly. nav/header/
 * footer/aside go too: they are the chrome that repeats on every page of a
 * site and carries no meaning for the page you asked about.
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  const { default: TurndownService } = await import("turndown");
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  service.remove(["script", "style", "noscript", "nav", "header", "footer", "aside", "form"]);

  // Turndown has no table support of its own; without this a table degrades to
  // a run-on line of cell text, which is exactly the "flattened table" damage
  // the escalation checks exist to catch.
  service.addRule("table", {
    filter: "table",
    replacement: (_content, node) => {
      const rows = Array.from((node as unknown as DomLike).querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((cell) =>
          (cell.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
      );
      const table = toMarkdownTable(rows);
      return table === "" ? "" : `\n\n${table}\n\n`;
    },
  });

  return service.turndown(html).replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Split one CSV line on delimiters that are not inside quotes.
 *
 * Hand-rolled because the rule that matters is small and specific: a quoted
 * field may contain the delimiter, and "" inside a quoted field is a literal
 * quote. A naive split on commas corrupts every address and every quoted
 * sentence in the file, which is most real CSVs.
 */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      fields.push(field);
      field = "";
    } else field += ch;
  }
  fields.push(field);
  return fields;
}

/** Pick the delimiter by which one yields the most consistent column count. */
function detectDelimiter(lines: readonly string[]): string {
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestScore = -1;
  for (const candidate of candidates) {
    const counts = lines.slice(0, 10).map((l) => splitCsvLine(l, candidate).length);
    const columns = counts[0] ?? 1;
    if (columns < 2) continue;
    // Consistency across rows is the signal; a delimiter that appears in prose
    // gives a different count on every line.
    const consistent = counts.filter((n) => n === columns).length;
    const score = consistent * columns;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * CSV -> a Markdown table.
 *
 * Quoted fields may contain newlines, so the file cannot simply be split on
 * them; rows are accumulated until quotes balance.
 */
export function csvToMarkdown(text: string): string {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const physical = raw.split("\n");

  const logical: string[] = [];
  let buffer = "";
  for (const line of physical) {
    buffer = buffer === "" ? line : `${buffer}\n${line}`;
    const quotes = (buffer.match(/"/g) ?? []).length;
    if (quotes % 2 === 0) {
      logical.push(buffer);
      buffer = "";
    }
  }
  if (buffer !== "") logical.push(buffer);

  const nonEmpty = logical.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return "";

  const delimiter = detectDelimiter(nonEmpty);
  const rows = nonEmpty.map((line) =>
    splitCsvLine(line, delimiter).map((f) => f.trim().replace(/^"|"$/g, "")),
  );
  return toMarkdownTable(rows);
}

/**
 * JSON -> Markdown.
 *
 * An array of flat objects is a table, and rendering it as one is a large
 * token win over pretty-printed JSON: keys stop repeating on every row.
 * Anything else keeps its shape in a fenced block, because inventing a
 * flattening for arbitrary nesting loses information the model may need.
 */
export function jsonToMarkdown(text: string): string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    // Not actually JSON: hand it back untouched rather than assert a shape.
    return text.trim();
  }

  if (Array.isArray(value) && value.length > 0 && value.every(isFlatObject)) {
    const keys = [...new Set(value.flatMap((row) => Object.keys(row as object)))];
    const rows = [keys, ...value.map((row) => keys.map((k) => scalar((row as Record<string, unknown>)[k])))];
    return toMarkdownTable(rows);
  }
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function isFlatObject(v: unknown): boolean {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    (x) => x === null || typeof x !== "object",
  );
}

function scalar(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}
