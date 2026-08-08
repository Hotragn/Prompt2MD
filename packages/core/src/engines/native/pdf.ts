import { looksLikeFlattenedTableRow } from "../../router/escalation.js";
/**
 * PDF -> text, via unpdf (a Node-friendly build of Mozilla's pdf.js).
 *
 * This is a text-layer extraction, the same class of operation the Python fast
 * path performs — it reads the text a PDF already contains. It does not
 * reconstruct table structure and it cannot read a scan, which is exactly what
 * the high-fidelity engine is for. Returning little or nothing on a scan is
 * the correct behaviour here, not a bug: the pipeline's `low-yield` check
 * reads that as evidence and escalates.
 */

export interface PdfExtraction {
  readonly markdown: string;
  readonly pages: number;
  /** True when the text layer produced almost nothing — the scan signature. */
  readonly empty: boolean;
}

export async function pdfToMarkdown(data: Uint8Array): Promise<PdfExtraction> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  // pdf.js transfers and detaches the buffer it is handed. Passing the caller's
  // array directly would leave it zero-length afterwards — which matters
  // because the pipeline may hand the same bytes to another engine when this
  // one escalates, and that second read would silently see an empty file.
  const pdf = await getDocumentProxy(Uint8Array.from(data));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const pages = Array.isArray(text) ? text : [text];
  const cleaned = pages.map(normalizePage);
  const markdown = cleaned.filter((p) => p !== "").join("\n\n");

  return {
    markdown,
    pages: totalPages,
    // Per page rather than in total: one text page in a 200-page scan should
    // still read as a scan.
    empty: markdown.replace(/\s/g, "").length < Math.max(20, totalPages * 10),
  };
}

/**
 * pdf.js emits text in layout order, so a paragraph arrives pre-broken at
 * whatever column the page happened to wrap at. Rejoining those lines stops
 * every wrapped sentence from parsing as its own block downstream.
 *
 * Table rows are deliberately left alone. Joining them would merge many
 * flattened rows into one line, and `detectTableDegradation` counts lines — so
 * tidying the text here would quietly disable the escalation that exists to
 * catch exactly this damage, and a mangled table would sail through looking
 * like clean prose. The shared predicate keeps the two in agreement.
 */
function normalizePage(page: string): string {
  const lines = page.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/[ \t]{2,}/g, " ").trim();
    const previous = out[out.length - 1];

    if (previous !== undefined && canJoin(previous, line)) {
      // A hyphen at the end of a line is a word split across the break.
      out[out.length - 1] = /\w-$/.test(previous)
        ? previous.replace(/-$/, "") + line
        : `${previous} ${line}`;
      continue;
    }
    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function canJoin(previous: string, line: string): boolean {
  if (previous === "" || line === "") return false;
  if (looksLikeFlattenedTableRow(previous) || looksLikeFlattenedTableRow(line)) return false;
  // A finished sentence, or a new block of any kind, starts its own line.
  if (/[.!?:;]$/.test(previous)) return false;
  return !/^\s*(?:[-*•#>]|\d+[.)])/.test(line);
}
