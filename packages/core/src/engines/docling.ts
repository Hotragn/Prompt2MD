import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { ConversionWarning } from "../types/document.js";
import type { ConvertOptions, Engine, EngineResult, SniffReport, SourceInput } from "../types/engine.js";

export interface DoclingEngineOptions {
  /** docling-serve base URL, e.g. "http://localhost:5001". */
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  /** Injectable for tests. */
  readonly fetchImpl?: typeof fetch;
}

interface DoclingResponse {
  readonly document?: { readonly md_content?: string };
  readonly status?: string;
  readonly errors?: readonly unknown[];
}

/**
 * High-fidelity engine: docling-serve REST client. Operational guardrails
 * from ADR-001 are defaults here: pypdfium2 backend and <=100-page request
 * chunks, both mitigating docling's documented large-PDF OOM failures.
 */
export function createDoclingEngine(options: DoclingEngineOptions): Engine {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 300_000;

  async function convertChunk(
    base64: string,
    filename: string,
    ocr: boolean,
    pageRange?: readonly [number, number],
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${options.baseUrl.replace(/\/+$/, "")}/v1/convert/source`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          options: {
            to_formats: ["md"],
            pdf_backend: "pypdfium2",
            table_mode: "accurate",
            do_ocr: ocr,
            ...(pageRange !== undefined ? { page_range: pageRange } : {}),
          },
          sources: [{ kind: "file", base64_string: base64, filename }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`docling-serve HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
      }
      const body = (await res.json()) as DoclingResponse;
      return body.document?.md_content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id: "docling",

    async convert(input: SourceInput, sniff: SniffReport, opts: ConvertOptions): Promise<EngineResult> {
      const { data, filename } = await materialize(input, sniff);
      const base64 = Buffer.from(data).toString("base64");
      const ocr = opts.ocr ?? false;
      const chunkSize = opts.pageChunkSize ?? 100;
      const pages = sniff.pdf?.pageCount ?? 1;
      const warnings: ConversionWarning[] = [];

      if (sniff.kind === "pdf" && pages > chunkSize) {
        const parts: string[] = [];
        for (let start = 1; start <= pages; start += chunkSize) {
          const end = Math.min(start + chunkSize - 1, pages);
          parts.push(await convertChunk(base64, filename, ocr, [start, end]));
        }
        warnings.push({
          code: "engine-fallback",
          message: `converted in ${parts.length} chunks of <=${chunkSize} pages (large-PDF OOM guardrail)`,
        });
        return { markdown: parts.join("\n\n"), warnings };
      }

      return { markdown: await convertChunk(base64, filename, ocr), warnings };
    },
  };
}

async function materialize(
  input: SourceInput,
  sniff: SniffReport,
): Promise<{ data: Uint8Array; filename: string }> {
  switch (input.kind) {
    case "file":
      return { data: await readFile(input.path), filename: basename(input.path) };
    case "buffer":
      return { data: input.data, filename: input.filename ?? sniff.filename ?? "input.bin" };
    case "text":
      return { data: Buffer.from(input.text, "utf8"), filename: input.filename ?? "input.txt" };
  }
}
