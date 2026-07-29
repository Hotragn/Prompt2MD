import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashSource } from "@prompt2md/core";

/**
 * Content-addressed store of verbatim originals. Compression is never
 * destructive: every compressed section carries a `p2md:src=<id>#<start>-<end>`
 * anchor resolving here.
 */

export interface StoredOriginal {
  readonly sourceId: string;
  readonly text: string;
  readonly label?: string;
  readonly createdAt: string;
}

export interface OriginalStore {
  /** Idempotent: identical text yields the same sourceId. */
  put(text: string, label?: string): Promise<string>;
  get(sourceId: string): Promise<StoredOriginal | undefined>;
  getSpan(sourceId: string, start: number, end: number): Promise<string | undefined>;
}

const SOURCE_ID = /^[0-9a-f]{16}$/;

export function createFileStore(dir: string): OriginalStore {
  const cache = new Map<string, StoredOriginal>();

  async function load(sourceId: string): Promise<StoredOriginal | undefined> {
    if (!SOURCE_ID.test(sourceId)) return undefined; // also blocks path traversal
    const cached = cache.get(sourceId);
    if (cached !== undefined) return cached;
    try {
      const record = JSON.parse(await readFile(join(dir, `${sourceId}.json`), "utf8")) as StoredOriginal;
      cache.set(sourceId, record);
      return record;
    } catch {
      return undefined;
    }
  }

  return {
    async put(text: string, label?: string): Promise<string> {
      const sourceId = hashSource(text);
      if (cache.has(sourceId)) return sourceId;
      const record: StoredOriginal = {
        sourceId,
        text,
        createdAt: new Date().toISOString(),
        ...(label !== undefined ? { label } : {}),
      };
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${sourceId}.json`), JSON.stringify(record), "utf8");
      cache.set(sourceId, record);
      return sourceId;
    },

    get: load,

    async getSpan(sourceId: string, start: number, end: number): Promise<string | undefined> {
      const record = await load(sourceId);
      if (record === undefined || start < 0 || end < start) return undefined;
      return record.text.slice(start, Math.min(end, record.text.length));
    },
  };
}

/** Anchor written into compressed sections and accepted by retrieve_original. */
export interface SourceAnchor {
  readonly sourceId: string;
  readonly start: number;
  readonly end: number;
}

export function formatAnchor(anchor: SourceAnchor): string {
  return `<!-- p2md:src=${anchor.sourceId}#${anchor.start}-${anchor.end} -->`;
}

export function parseAnchor(text: string): SourceAnchor | undefined {
  const match = /p2md:src=([0-9a-f]{16})#(\d+)-(\d+)/.exec(text);
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return undefined;
  return { sourceId: match[1], start: Number(match[2]), end: Number(match[3]) };
}
