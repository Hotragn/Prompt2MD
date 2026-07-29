import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EngineId } from "../src/types/engine.js";

export const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "fixtures",
  "cases",
);

export interface CaseMeta {
  readonly id: string;
  readonly inputKind: "prompt" | "email" | "html" | "pdf-table" | "csv" | "scanned-pdf";
  readonly expectedEngine: EngineId;
  readonly tokens: { readonly maxRatio: number };
}

export interface FixtureCase {
  readonly meta: CaseMeta;
  readonly dir: string;
}

export function loadCases(): FixtureCase[] {
  return readdirSync(FIXTURES_DIR).map((name) => {
    const dir = join(FIXTURES_DIR, name);
    const meta = JSON.parse(readFileSync(join(dir, "case.json"), "utf8")) as CaseMeta;
    return { meta, dir };
  });
}

export function readFixture(dir: string, filename: string): string {
  return readFileSync(join(dir, filename), "utf8");
}

/** Minimal image-only PDF: image XObject, zero font objects. */
export function syntheticScannedPdf(): Uint8Array {
  const body = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> >> endobj",
    "4 0 obj << /Type /XObject /Subtype /Image /Width 1700 /Height 2200 /Filter /DCTDecode >> endobj",
    "%%EOF",
  ].join("\n");
  return Buffer.from(body, "latin1");
}

/** Minimal born-digital PDF: font objects present, given page count. */
export function syntheticTextPdf(pages: number): Uint8Array {
  const pageObjects = Array.from(
    { length: pages },
    (_, i) => `${5 + i} 0 obj << /Type /Page /Parent 2 0 R >> endobj`,
  ).join("\n");
  const body = [
    "%PDF-1.7",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Count ${pages} >> endobj`,
    "3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    pageObjects,
    "%%EOF",
  ].join("\n");
  return Buffer.from(body, "latin1");
}
