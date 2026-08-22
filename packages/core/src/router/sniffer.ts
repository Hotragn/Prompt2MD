import { open } from "node:fs/promises";
import { basename, extname } from "node:path";
import { maxInputBytes } from "../limits.js";
import type { InputKind, PdfProbe, SniffReport, SourceInput, TextProbe } from "../types/engine.js";

const OFFICE_EXTENSIONS = new Set([".docx", ".xlsx", ".pptx", ".doc", ".xls", ".ppt", ".msg", ".epub", ".odt", ".ods", ".odp"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp", ".gif"]);

const MIME_BY_KIND: Record<InputKind, string> = {
  prompt: "text/plain",
  email: "message/rfc822",
  html: "text/html",
  csv: "text/csv",
  json: "application/json",
  office: "application/vnd.openxmlformats-officedocument",
  pdf: "application/pdf",
  image: "image/*",
  unknown: "application/octet-stream",
};

export function probeText(text: string): TextProbe {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const tagLines = nonEmpty.filter((l) => /<\/?[a-zA-Z][^>]*>/.test(l)).length;
  const headerHits = (text.match(/^(From|To|Cc|Subject|Sent|Date|Reply-To):\s/gm) ?? []).length;
  return {
    chars: text.length,
    lines: lines.length,
    markupRatio: nonEmpty.length > 0 ? tagLines / nonEmpty.length : 0,
    looksLikeEmail: headerHits >= 2,
    looksLikeCsv: isCsvLike(nonEmpty),
  };
}

/** Uniform comma-delimited field counts across >= 2 rows, >= 3 fields. */
function isCsvLike(rows: readonly string[]): boolean {
  if (rows.length < 2) return false;
  const counts = rows.map((r) => r.split(",").length);
  const first = counts[0];
  return first !== undefined && first >= 3 && counts.every((c) => c === first);
}

/**
 * Byte-level PDF probe. Object dictionaries stay plain-text even when content
 * streams are FlateDecode-compressed, so font/image object counts are reliable;
 * text operators are only visible in uncompressed streams and are treated as
 * a bonus signal, never as proof of absence.
 */
export function probePdf(data: Uint8Array): PdfProbe {
  const raw = Buffer.from(data).toString("latin1");
  const count = (re: RegExp): number => raw.match(re)?.length ?? 0;
  const pageCount = Math.max(1, count(/\/Type\s*\/Page(?![a-zA-Z])/g));
  const fontObjects = Math.max(count(/\/Type\s*\/Font(?![a-zA-Z])/g), count(/\/BaseFont\s*\//g));
  const imageObjects = count(/\/Subtype\s*\/Image(?![a-zA-Z])/g);
  const textOperators = count(/\bTj\b|\bTJ\b/g);
  return {
    pageCount,
    fontObjects,
    imageObjects,
    textOperators,
    looksScanned: fontObjects === 0 && imageObjects > 0,
  };
}

function classifyText(text: string, probe: TextProbe, ext: string): InputKind {
  if (ext === ".html" || ext === ".htm" || /^\s*(?:<!DOCTYPE|<html)/i.test(text) || probe.markupRatio > 0.2) {
    return "html";
  }
  if (ext === ".csv" || probe.looksLikeCsv) return "csv";
  if (ext === ".json" || isJson(text)) return "json";
  if (ext === ".eml" || probe.looksLikeEmail) return "email";
  return "prompt";
}

function isJson(text: string): boolean {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

export function sniffText(text: string, filename?: string): SniffReport {
  const probe = probeText(text);
  const kind = classifyText(text, probe, filename ? extname(filename).toLowerCase() : "");
  return {
    kind,
    mime: MIME_BY_KIND[kind],
    bytes: Buffer.byteLength(text, "utf8"),
    text: probe,
    ...(filename !== undefined ? { filename: basename(filename) } : {}),
  };
}

export function sniffBuffer(data: Uint8Array, filename?: string): SniffReport {
  const ext = filename ? extname(filename).toLowerCase() : "";
  const base = {
    bytes: data.byteLength,
    ...(filename !== undefined ? { filename: basename(filename) } : {}),
  };

  if (startsWith(data, "%PDF")) {
    return { kind: "pdf", mime: MIME_BY_KIND.pdf, ...base, pdf: probePdf(data) };
  }
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && (OFFICE_EXTENSIONS.has(ext) || ext === "")) {
    // ZIP container; OOXML/ODF when the extension agrees, otherwise still office-shaped.
    return { kind: "office", mime: MIME_BY_KIND.office, ...base };
  }
  if (IMAGE_EXTENSIONS.has(ext) || startsWith(data, "\x89PNG") || (data[0] === 0xff && data[1] === 0xd8)) {
    return { kind: "image", mime: MIME_BY_KIND.image, ...base };
  }

  const text = tryDecodeUtf8(data);
  if (text !== undefined) {
    return sniffText(text, filename);
  }
  return { kind: "unknown", mime: MIME_BY_KIND.unknown, ...base };
}

/**
 * Every file path in the pipeline passes through here, which makes this the one
 * place a size ceiling can be enforced once and be true everywhere.
 *
 * Measuring before reading is the point: an oversized file is refused on its
 * declared size, without a byte of it ever becoming resident. Checking after
 * the read would be an OOM guard that first performs the OOM.
 *
 * Both the measurement and the read go through one open handle. Measuring a
 * path and then reading that path again are two different questions, and
 * between them the name can be pointed at something else -- which is precisely
 * how a size ceiling gets walked past.
 */
export async function sniffInput(input: SourceInput): Promise<SniffReport> {
  switch (input.kind) {
    case "text":
      return sniffText(input.text, input.filename);
    case "buffer":
      return sniffBuffer(input.data, input.filename);
    case "file": {
      const limit = maxInputBytes();
      const handle = await open(input.path, "r");
      try {
        const info = await handle.stat();
        if (info.isFile() && info.size > limit) {
          throw new Error(
            `file is ${Math.round(info.size / 1_000_000)}MB; the limit is ` +
              `${Math.round(limit / 1_000_000)}MB. Raise P2MD_MAX_INPUT_BYTES if that is deliberate.`,
          );
        }
        return sniffBuffer(await handle.readFile(), input.path);
      } finally {
        await handle.close();
      }
    }
  }
}

function startsWith(data: Uint8Array, ascii: string): boolean {
  if (data.length < ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (data[i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

function tryDecodeUtf8(data: Uint8Array): string | undefined {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    // Control characters (other than whitespace) indicate binary content.
    return /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text) ? undefined : text;
  } catch {
    return undefined;
  }
}
