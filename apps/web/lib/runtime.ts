import { get as blobGet, put as blobPut } from "@vercel/blob";
import { createRuntimeFromEnv, type HermesRuntime } from "@prompt2md/core";
import { createBlobStore, type BlobClient } from "./blob-store";

let cached: HermesRuntime | undefined;

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
    process.env,
    hasDurableStore() ? { store: createBlobStore(blobClient()) } : {},
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
