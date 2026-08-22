import { hashSource } from "@prompt2md/core";
import type { OriginalStore, StoredOriginal, StoreOptions } from "@prompt2md/core";

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
 * ── Retention ───────────────────────────────────────────────────────────────
 * Durable was the missing half of the losslessness promise; bounded is the
 * missing half of the privacy one. A sourceId is a content hash, which makes it
 * a fine dedup key and a poor access token: nothing ties a record to whoever
 * submitted it, so anyone holding an id can read that document. Ids travel —
 * they are returned in JSON, printed by the CLI, and embedded in `p2md:src`
 * anchors inside Markdown people share.
 *
 * Keeping strangers' documents forever under a bearer handle is not a defensible
 * default, so this store takes a TTL and the hosted app sets one. That trades a
 * permanent exposure for a bounded one. It is not the same as per-user
 * authorization, and the docs say so rather than implying otherwise.
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
  del?(pathname: string): Promise<unknown>;
}

const SOURCE_ID = /^[0-9a-f]{16}$/;
const PREFIX = "prompt2md/originals";

const pathFor = (sourceId: string): string => `${PREFIX}/${sourceId}.json`;

/** Expired-or-not. An unparseable stamp counts as expired — see store.ts. */
function isExpired(record: StoredOriginal, now: number): boolean {
  if (record.expiresAt === undefined) return false;
  const at = Date.parse(record.expiresAt);
  return Number.isNaN(at) || at <= now;
}

export function createBlobStore(client: BlobClient, options: StoreOptions = {}): OriginalStore {
  const ttlMs = options.ttlMs !== undefined && options.ttlMs > 0 ? options.ttlMs : undefined;
  // Content-addressed ids are immutable, so caching a fetched record is safe
  // and saves a round trip per anchor on a multi-anchor document. Expiry is
  // still checked on every hit: immutable content does not mean immutable
  // retention.
  const cache = new Map<string, StoredOriginal>();

  async function load(sourceId: string): Promise<StoredOriginal | undefined> {
    // Also blocks path traversal: the id becomes part of the blob pathname.
    if (!SOURCE_ID.test(sourceId)) return undefined;
    const now = Date.now();

    const cached = cache.get(sourceId);
    if (cached !== undefined) {
      if (!isExpired(cached, now)) return cached;
      cache.delete(sourceId);
      await client.del?.(pathFor(sourceId)).catch(() => undefined);
      return undefined;
    }

    try {
      const result = await client.get(pathFor(sourceId), { access: "private" });
      if (result === null || result.stream === null) return undefined;
      const text = await new Response(result.stream).text();
      const record = JSON.parse(text) as StoredOriginal;
      if (isExpired(record, now)) {
        // Delete on read: object storage has no TTL of its own here, so the
        // read path is where an expired document actually stops existing.
        await client.del?.(pathFor(sourceId)).catch(() => undefined);
        return undefined;
      }
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
      const now = Date.now();
      const cached = cache.get(sourceId);
      // With a TTL configured, a repeat submission restarts its own window
      // rather than inheriting the first copy's — so the write is not skipped.
      if (cached !== undefined && ttlMs === undefined && !isExpired(cached, now)) {
        return sourceId;
      }

      const record: StoredOriginal = {
        sourceId,
        text,
        createdAt: new Date(now).toISOString(),
        ...(label !== undefined ? { label } : {}),
        ...(ttlMs !== undefined ? { expiresAt: new Date(now + ttlMs).toISOString() } : {}),
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
      // Bounds-checked to match the file store rather than relying on slice's
      // negative-index behaviour, which would quietly return a tail span.
      if (record === undefined || start < 0 || end < start) return undefined;
      return record.text.slice(start, Math.min(end, record.text.length));
    },

    async delete(sourceId: string): Promise<boolean> {
      if (!SOURCE_ID.test(sourceId)) return false;
      const existed = (await load(sourceId)) !== undefined;
      cache.delete(sourceId);
      if (client.del === undefined) return false;
      await client.del(pathFor(sourceId)).catch(() => undefined);
      return existed;
    },
  };
}
