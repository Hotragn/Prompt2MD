import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { ConversionWarning } from "../../types/document.js";
import type {
  ConvertOptions,
  Engine,
  EngineResult,
  SniffReport,
  SourceInput,
} from "../../types/engine.js";
import { docxToMarkdown } from "./docx.js";
import { pdfToMarkdown } from "./pdf.js";
import { pptxToMarkdown } from "./pptx.js";
import { csvToMarkdown, htmlToMarkdown, jsonToMarkdown } from "./text-formats.js";
import { xlsxToMarkdown } from "./xlsx.js";

/**
 * The in-process document engine.
 *
 * Everything here runs in Node with no sidecar, which is the whole point:
 * before this existed, `convert report.pdf` on a machine without Python failed
 * outright, and — worse, because it looked like success — an HTML file came
 * back as raw HTML with a warning nobody reads, scoring 100% of input while
 * the README promised that stripping markup was the large win.
 *
 * Every conversion library is behind a dynamic import, so none of them load
 * until a document of that type actually arrives. A CLI run that only touches
 * text pays nothing for the existence of a PDF parser.
 */

type OoxmlKind = "docx" | "xlsx" | "pptx";

/**
 * Which OOXML format a zip actually holds, decided by what is inside it.
 *
 * The extension is a hint, not evidence — a .docx that is really a .xlsx is a
 * routine result of someone renaming a file — and the sniffer collapses all of
 * these to one `office` kind anyway. The main part is definitive.
 */
export function detectOoxml(entries: Readonly<Record<string, unknown>>): OoxmlKind | undefined {
  if (entries["word/document.xml"] !== undefined) return "docx";
  if (entries["xl/workbook.xml"] !== undefined) return "xlsx";
  if (entries["ppt/presentation.xml"] !== undefined) return "pptx";
  return undefined;
}

async function bytesOf(input: SourceInput): Promise<Uint8Array> {
  if (input.kind === "buffer") return input.data;
  if (input.kind === "file") return new Uint8Array(await readFile(input.path));
  return new TextEncoder().encode(input.text);
}

async function textOf(input: SourceInput): Promise<string> {
  if (input.kind === "text") return input.text;
  if (input.kind === "file") return readFile(input.path, "utf8");
  return new TextDecoder("utf8").decode(input.data);
}

function nameOf(input: SourceInput, sniff: SniffReport): string {
  if (input.kind === "file") return input.path;
  return input.filename ?? sniff.filename ?? "";
}

export function createNativeEngine(): Engine {
  return {
    id: "native",

    async convert(input: SourceInput, sniff: SniffReport, _options: ConvertOptions): Promise<EngineResult> {
      const warnings: ConversionWarning[] = [];

      switch (sniff.kind) {
        case "html":
          return { markdown: await htmlToMarkdown(await textOf(input)), warnings };

        case "csv":
          return { markdown: csvToMarkdown(await textOf(input)), warnings };

        case "json":
          return { markdown: jsonToMarkdown(await textOf(input)), warnings };

        case "pdf": {
          const result = await pdfToMarkdown(await bytesOf(input));
          if (result.pages < result.declaredPages) {
            // Silent truncation would make the token report look like a
            // triumph for the wrong reason — the same failure the
            // content-removed warnings elsewhere exist to prevent.
            warnings.push({
              code: "content-removed",
              message:
                `read the first ${result.pages} of ${result.declaredPages} pages (page cap). ` +
                `Raise P2MD_MAX_PDF_PAGES to convert the whole document.`,
            });
          }
          if (result.empty) {
            // Not an error: a scan has no text layer to read. Say so in the
            // terms the user can act on, and let the pipeline's escalation
            // checks see an empty result and route to OCR where available.
            warnings.push({
              code: "engine-fallback",
              message:
                `no text layer found across ${result.pages} page(s) — this looks like a scan. ` +
                `Set P2MD_DOCLING_URL for OCR, or convert with --fidelity high.`,
            });
          }
          return { markdown: result.markdown, warnings };
        }

        case "office":
          return await convertOffice(input, sniff, warnings);

        default: {
          // Text-shaped input that reached a document engine: hand back the
          // text rather than assert a structure the file never had.
          return { markdown: (await textOf(input)).trim(), warnings };
        }
      }
    },
  };
}

async function convertOffice(
  input: SourceInput,
  sniff: SniffReport,
  warnings: ConversionWarning[],
): Promise<EngineResult> {
  const data = await bytesOf(input);
  const { unzip } = await import("./ooxml.js");

  let entries: Readonly<Record<string, Uint8Array>>;
  try {
    entries = unzip(data);
  } catch (err) {
    // Legacy .doc/.xls/.ppt are OLE compound files, not zips, and land here.
    // They are genuinely not readable in-process; saying which formats need
    // the sidecar beats "invalid zip".
    const ext = extname(nameOf(input, sniff)).toLowerCase();
    const legacy = [".doc", ".xls", ".ppt"].includes(ext);
    throw new Error(
      legacy
        ? `${ext} is the pre-2007 binary Office format, which the in-process engine cannot read. ` +
          `Re-save as ${ext}x, or install the MarkItDown sidecar (\`pip install "markitdown[all]"\`).`
        : `not a readable Office file (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  const kind = detectOoxml(entries);
  if (kind === "docx") {
    const result = await docxToMarkdown(data);
    for (const message of result.messages) {
      warnings.push({ code: "engine-fallback", message: `docx: ${message}` });
    }
    return { markdown: result.markdown, warnings };
  }
  if (kind === "xlsx") return { markdown: xlsxToMarkdown(data), warnings };
  if (kind === "pptx") return { markdown: pptxToMarkdown(data), warnings };

  // A zip that is not OOXML: .odt/.ods/.odp, .epub, .msg exports, or a plain
  // archive someone pointed at us by mistake.
  throw new Error(
    `zip container is not an OOXML document (no word/, xl/, or ppt/ part found). ` +
      `OpenDocument, EPUB and Outlook formats need the MarkItDown sidecar: ` +
      `\`pip install "markitdown[all]"\`.`,
  );
}
