import { createRuntimeFromEnv, type HermesRuntime } from "@prompt2md/hermes-mcp";

let cached: HermesRuntime | undefined;

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
  cached ??= createRuntimeFromEnv();
  return cached;
}

/**
 * True when originals are kept in per-instance temporary storage rather than
 * anywhere durable.
 *
 * Losslessness is the product's central promise, and on a serverless
 * deployment it is materially weaker: the store lives in the instance's temp
 * directory, so a valid sourceId stops resolving once that instance recycles.
 * Callers surface this so a user is never told "nothing is lost" by a
 * deployment that cannot keep that promise past a cold start.
 */
export function storeIsEphemeral(): boolean {
  if (process.env["P2MD_STORE_DIR"] !== undefined) return false;
  return process.env["VERCEL"] !== undefined || process.env["P2MD_ON_SERVERLESS"] !== undefined;
}
