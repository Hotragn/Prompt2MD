import { htmlToMarkdown } from "./text-formats.js";

/**
 * DOCX -> Markdown, via mammoth.
 *
 * Mammoth converts to semantic HTML first, which this then runs through the
 * same HTML path everything else uses. The indirection is the point: mammoth
 * understands Word's style model — that "Heading 2" is a heading and a
 * numbered list is a list, rather than bold text of a certain size — and the
 * HTML step then gets tables, lists, and emphasis for free, consistently with
 * every other format here.
 */

export interface DocxExtraction {
  readonly markdown: string;
  /** Mammoth's own notes: unsupported styles, dropped elements. */
  readonly messages: readonly string[];
}

export async function docxToMarkdown(data: Uint8Array): Promise<DocxExtraction> {
  const mammoth = await import("mammoth");
  const convert = mammoth.convertToHtml ?? mammoth.default?.convertToHtml;
  if (typeof convert !== "function") {
    throw new Error("mammoth.convertToHtml is unavailable — the dependency may be corrupt");
  }

  const result = (await convert({ buffer: Buffer.from(data) })) as {
    value: string;
    messages?: { type?: string; message?: string }[];
  };

  return {
    markdown: await htmlToMarkdown(result.value),
    // Warnings only. Mammoth reports an "info" line for every unmapped style,
    // which on a corporate template is dozens of lines of noise about
    // formatting nobody asked to preserve.
    messages: (result.messages ?? [])
      .filter((m) => m.type === "warning" || m.type === "error")
      .map((m) => m.message ?? "")
      .filter((m) => m !== ""),
  };
}
