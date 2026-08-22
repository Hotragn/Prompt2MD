import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";
import { createRuntimeFromEnv, type HermesRuntime } from "@prompt2md/core";
import { createBlobStore, type BlobClient } from "./blob-store";

let cached: HermesRuntime | undefined;

/**
 * How long the hosted studio keeps a submitted document.
 *
 * This is a public form: anyone can paste anything, and a sourceId is a bearer
 * handle rather than an owned resource. Seven days is long enough for
 * `retrieve_original` to be genuinely useful across a working session and short
 * enough that a leaked id is a bounded problem rather than a permanent one.
 *
 * Operators running their own deployment can change it. Zero disables expiry,
 * which is correct for a single-tenant instance and wrong for a public one.
 */
export const RETENTION_DAYS = (() => {
  const raw = process.env["P2MD_STORE_TTL_DAYS"];
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7;
})();

const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * True when a durable originals store is configured.
 *
 * Enabling is an explicit operator action — create a Vercel Blob store and the
 * BLOB_READ_WRITE_TOKEN appears in the environment. Nothing is written to
 * third-party storage unless someone chose that.
 */
export function hasDurableStore(): boolean {
  return process.env["BLOB_READ_WRITE_TOKEN"] !== undefined;
}

/**
 * Lazily construct the shared pipeline runtime.
 *
 * Route modules must NOT build this at module scope: `next build` imports every
 * route to collect metadata, so top-level construction runs pipeline setup —
 * including `homedir()` resolution for the originals store — during the build
 * itself, on a machine that has nothing to do with where the code will run.
 *
 * Deferring to first request keeps the build free of filesystem work and still
 * shares one runtime across all requests in a server instance.
 */
export function getRuntime(): HermesRuntime {
  cached ??= createRuntimeFromEnv(
    // The retention window is passed through the env the runtime reads, so the
    // temp-dir file store used when no blob token is configured gets the same
    // ceiling as the durable one. That path already dies with its instance;
    // this makes the bound a stated policy rather than a side effect of
    // serverless recycling.
    { ...process.env, P2MD_STORE_TTL_DAYS: String(RETENTION_DAYS) },
    hasDurableStore() ? { store: createBlobStore(blobClient(), { ttlMs: RETENTION_MS }) } : {},
  );
  return cached;
}

/**
 * Adapter over `@vercel/blob`, which reads BLOB_READ_WRITE_TOKEN from the
 * environment itself.
 *
 * Imported statically rather than lazily: a `require` inside a Next server
 * module is fragile across its ESM/CJS output, and the SDK is small enough
 * that always bundling it is cheaper than a runtime module-resolution failure
 * on the one path that exists to make data durable.
 */
function blobClient(): BlobClient {
  return {
    put: (pathname, body, options) =>
      blobPut(pathname, body, options as Parameters<typeof blobPut>[2]),
    get: (pathname, options) => blobGet(pathname, options as Parameters<typeof blobGet>[1]),
    // Required for retention to mean anything: without a delete, an expired
    // record stops being served but never stops existing.
    del: (pathname) => blobDel(pathname),
  };
}

/**
 * True when originals are kept in per-instance temporary storage rather than
 * anywhere durable.
 *
 * Losslessness is the product's central promise, and on a serverless
 * deployment without a durable store it is materially weaker: originals live
 * in the instance's temp directory, so a valid sourceId stops resolving once
 * that instance recycles. Callers surface this so a user is never told
 * "nothing is lost" by a deployment that cannot keep that promise past a cold
 * start.
 */
export function storeIsEphemeral(): boolean {
  if (hasDurableStore()) return false;
  if (process.env["P2MD_STORE_DIR"] !== undefined) return false;
  return process.env["VERCEL"] !== undefined || process.env["P2MD_ON_SERVERLESS"] !== undefined;
}
