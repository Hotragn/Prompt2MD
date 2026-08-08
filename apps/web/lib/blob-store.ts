import { hashSource } from "@prompt2md/core";
import type { OriginalStore, StoredOriginal } from "@prompt2md/core";

/**
 * Durable originals store backed by Vercel Blob.
 *
 * Serverless instances have no persistent disk, so the default file store
 * falls back to per-instance temp storage and a valid sourceId stops resolving
 * after a cold start. That makes `retrieve_original` — the mechanism the whole
 * losslessness claim rests on — unreliable in exactly the deployment most
 * people will try first.
 *
 * Blobs are written with `access: "private"`, so originals are reachable only
 * with the store token, never from a public URL. This matters: these are whole
 * documents that users pasted or uploaded, and object storage that anyone with
 * a link can read would be a worse privacy position than the ephemeral store
 * it replaces.
 *
 * Object storage rather than a KV/Redis store because originals are whole
 * documents — uploads up to 25 MB — which is well past what Redis values are
 * priced or sized for.
 */

/** The slice of `@vercel/blob` this needs, injectable so tests need no network. */
export interface BlobClient {
  put(
    pathname: string,
    body: string,
    options: { access: "private"; contentType?: string; allowOverwrite?: boolean; addRandomSuffix?: boolean },
  ): Promise<unknown>;
  get(pathname: string, options: { access: "private" }): Promise<{ stream: ReadableStream | null } | null>;
}

const SOURCE_ID = /^[0-9a-f]{16}$/;
const PREFIX = "prompt2md/originals";

const pathFor = (sourceId: string): string => `${PREFIX}/${sourceId}.json`;

export function createBlobStore(client: BlobClient): OriginalStore {
  // Content-addressed ids are immutable, so caching a fetched record is always
  // safe and saves a round trip per anchor on a multi-anchor document.
  const cache = new Map<string, StoredOriginal>();

  async function load(sourceId: string): Promise<StoredOriginal | undefined> {
    // Also blocks path traversal: the id becomes part of the blob pathname.
    if (!SOURCE_ID.test(sourceId)) return undefined;

    const cached = cache.get(sourceId);
    if (cached !== undefined) return cached;

    try {
      const result = await client.get(pathFor(sourceId), { access: "private" });
      if (result === null || result.stream === null) return undefined;
      const text = await new Response(result.stream).text();
      const record = JSON.parse(text) as StoredOriginal;
      cache.set(sourceId, record);
      return record;
    } catch {
      // A missing blob is a normal outcome, not an error worth propagating —
      // callers distinguish "no original" from "lookup failed" by the 404 they
      // already handle.
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

      await client.put(pathFor(sourceId), JSON.stringify(record), {
        access: "private",
        contentType: "application/json",
        // Deterministic pathname: the id IS the content hash, so re-writing
        // identical content must land on the same key rather than accumulate
        // suffixed duplicates.
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      cache.set(sourceId, record);
      return sourceId;
    },

    get: load,

    async getSpan(sourceId: string, start: number, end: number): Promise<string | undefined> {
      const record = await load(sourceId);
      return record?.text.slice(start, end);
    },
  };
}
