import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashSource } from "./markdown/parse.js";

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
  /** ISO instant after which this record is treated as gone. Absent = keeps forever. */
  readonly expiresAt?: string;
}

export interface OriginalStore {
  /** Idempotent: identical text yields the same sourceId. */
  put(text: string, label?: string): Promise<string>;
  get(sourceId: string): Promise<StoredOriginal | undefined>;
  getSpan(sourceId: string, start: number, end: number): Promise<string | undefined>;
  /** True when a record existed and was removed. Idempotent: deleting twice is not an error. */
  delete(sourceId: string): Promise<boolean>;
}

export interface StoreOptions {
  /**
   * Retention window. Omitted or <= 0 means records never expire, which is the
   * right default for a local store: `~/.prompt2md/originals` is the operator's
   * own data on their own disk, and having `retrieve_original` quietly stop
   * resolving a two-week-old anchor would break the losslessness promise to the
   * one person who is not a risk to themselves.
   *
   * A multi-tenant deployment is the opposite case and must set this. There the
   * store holds documents belonging to strangers, a sourceId is a bearer handle
   * with no owner attached, and "forever" is the wrong answer.
   */
  readonly ttlMs?: number;
}

const SOURCE_ID = /^[0-9a-f]{16}$/;

/** Expired-or-not, without trusting the caller's clock more than once per call. */
function isExpired(record: StoredOriginal, now: number): boolean {
  if (record.expiresAt === undefined) return false;
  const at = Date.parse(record.expiresAt);
  // An unparseable stamp is treated as expired. A record we cannot reason about
  // is not one to keep serving.
  return Number.isNaN(at) || at <= now;
}

export function createFileStore(dir: string, options: StoreOptions = {}): OriginalStore {
  const ttlMs = options.ttlMs !== undefined && options.ttlMs > 0 ? options.ttlMs : undefined;
  const cache = new Map<string, StoredOriginal>();

  const pathFor = (sourceId: string): string => join(dir, `${sourceId}.json`);

  async function load(sourceId: string): Promise<StoredOriginal | undefined> {
    if (!SOURCE_ID.test(sourceId)) return undefined; // also blocks path traversal
    const now = Date.now();

    const cached = cache.get(sourceId);
    if (cached !== undefined) {
      if (!isExpired(cached, now)) return cached;
      // Evict from the cache too, or the TTL would be enforced on disk and
      // ignored in memory for the life of the process.
      cache.delete(sourceId);
      await unlink(pathFor(sourceId)).catch(() => undefined);
      return undefined;
    }

    try {
      const record = JSON.parse(await readFile(pathFor(sourceId), "utf8")) as StoredOriginal;
      if (isExpired(record, now)) {
        await unlink(pathFor(sourceId)).catch(() => undefined);
        return undefined;
      }
      cache.set(sourceId, record);
      return record;
    } catch {
      return undefined;
    }
  }

  return {
    async put(text: string, label?: string): Promise<string> {
      const sourceId = hashSource(text);
      const now = Date.now();
      const cached = cache.get(sourceId);
      // A cache hit short-circuits only when there is nothing to refresh.
      // Content-addressing means a re-submission of the same document lands on
      // the same id, and that submission is new activity — its retention window
      // starts now, not whenever the first copy arrived.
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
      await mkdir(dir, { recursive: true });
      await writeFile(pathFor(sourceId), JSON.stringify(record), "utf8");
      cache.set(sourceId, record);
      return sourceId;
    },

    get: load,

    async getSpan(sourceId: string, start: number, end: number): Promise<string | undefined> {
      const record = await load(sourceId);
      if (record === undefined || start < 0 || end < start) return undefined;
      return record.text.slice(start, Math.min(end, record.text.length));
    },

    async delete(sourceId: string): Promise<boolean> {
      if (!SOURCE_ID.test(sourceId)) return false;
      const wasCached = cache.delete(sourceId);
      try {
        await unlink(pathFor(sourceId));
        return true;
      } catch {
        // Already gone on disk. Report whether the caller's id meant anything
        // at all, so a delete of a live cache-only record still reads as a hit.
        return wasCached;
      }
    },
  };
}

/**
 * Drop every expired record in `dir`. Returns the number removed.
 *
 * A TTL enforced only on read leaves expired documents sitting on disk
 * indefinitely — the retention promise would be about what is *served*, not
 * about what is *kept*, and those are different claims. Callers with a
 * scheduler (a cron route, a maintenance command) should run this; the read
 * path stays correct without it.
 */
export async function sweepExpired(dir: string, now: number = Date.now()): Promise<number> {
  let removed = 0;
  const entries = await readdir(dir).catch(() => [] as string[]);
  for (const name of entries) {
    if (!/^[0-9a-f]{16}\.json$/.test(name)) continue;
    const full = join(dir, name);
    try {
      const record = JSON.parse(await readFile(full, "utf8")) as StoredOriginal;
      if (!isExpired(record, now)) continue;
      await unlink(full);
      removed++;
    } catch {
      // Unreadable or already removed — nothing to account for.
    }
  }
  return removed;
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
