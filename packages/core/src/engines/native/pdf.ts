import { maxPdfPages } from "../../limits.js";
import { layoutToMarkdown, type PositionedItem } from "./pdf-layout.js";

/**
 * PDF -> Markdown, via unpdf (a Node-friendly build of Mozilla's pdf.js).
 *
 * Layout-aware rather than a flat text dump. pdf.js reports the position of
 * every run, so tables are reconstructed from the page geometry instead of
 * being flattened into a run-on line — see pdf-layout.ts for how the columns
 * are found. What remains out of reach in-process is a page with no text layer
 * at all: a scan is an image, and reading it needs OCR, which is what the
 * high-fidelity engine is for. Returning nothing there is correct, and the
 * pipeline's `low-yield` check reads it as evidence and escalates.
 */

export interface PdfExtraction {
  readonly markdown: string;
  /** Pages actually read. Below `declaredPages` when the page cap truncated. */
  readonly pages: number;
  /** Pages the file claims to have. */
  readonly declaredPages: number;
  /** True when the text layer produced almost nothing — the scan signature. */
  readonly empty: boolean;
}

interface RawTextItem {
  readonly str?: string;
  readonly transform?: readonly number[];
  readonly width?: number;
  readonly height?: number;
}

export async function pdfToMarkdown(data: Uint8Array): Promise<PdfExtraction> {
  const { getDocumentProxy } = await import("unpdf");

  // pdf.js transfers and detaches the buffer it is handed. Passing the
  // caller's array directly would leave it zero-length afterwards — which
  // matters because the pipeline may hand the same bytes to another engine
  // when this one escalates, and that second read would see an empty file.
  const pdf = await getDocumentProxy(Uint8Array.from(data));
  const pages: string[] = [];

  // Page count is declared in the file, and each page builds its own text-item
  // list, so a small file can declare a page count large enough to hang the
  // process. The byte ceiling upstream does not bound this — only a page cap
  // does. Truncating and saying so beats both hanging and refusing outright.
  const declaredPages = pdf.numPages;
  const readable = Math.min(declaredPages, maxPdfPages());

  for (let n = 1; n <= readable; n++) {
    const page = await pdf.getPage(n);
    const content = (await page.getTextContent()) as { items?: RawTextItem[] };
    pages.push(layoutToMarkdown(toPositioned(content.items ?? [])));
  }

  const markdown = pages.filter((p) => p.trim() !== "").join("\n\n");
  return {
    markdown,
    pages: readable,
    declaredPages,
    // Measured per page rather than in total: one text page in a 200-page scan
    // should still read as a scan. Scored against the pages actually read, so a
    // truncated document is not judged against pages nobody looked at.
    empty: markdown.replace(/\s/g, "").length < Math.max(20, readable * 10),
  };
}

/**
 * The transform matrix is [a, b, c, d, e, f]; e and f are the run's x and y.
 * Items without one carry no geometry and cannot be placed, so they are
 * dropped rather than guessed at.
 */
function toPositioned(items: readonly RawTextItem[]): PositionedItem[] {
  const out: PositionedItem[] = [];
  for (const item of items) {
    const text = item.str;
    const transform = item.transform;
    if (typeof text !== "string" || transform === undefined || transform.length < 6) continue;
    out.push({
      text,
      x: transform[4] ?? 0,
      y: transform[5] ?? 0,
      width: item.width ?? 0,
      // Fall back to the matrix's vertical scale when height is absent.
      height: item.height !== undefined && item.height > 0 ? item.height : Math.abs(transform[3] ?? 10),
    });
  }
  return out;
}
