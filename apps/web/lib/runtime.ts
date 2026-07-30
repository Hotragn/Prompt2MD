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
