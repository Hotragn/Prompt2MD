// Library surface. The stdio server executable lives in bin.ts.
//
// This package is now purely the MCP adapter: it owns the protocol surface
// (server.ts) and the stdio entrypoint (bin.ts), and nothing else. The
// compression engine, the originals store, and the runtime composition root all
// live in @prompt2md/core, where the CLI and web app reach them without pulling
// in the MCP SDK.
//
// The re-exports below are kept deliberately so existing
// `@prompt2md/hermes-mcp` imports keep working. New code should import them
// from @prompt2md/core directly.
export { createHermesServer, type HermesDeps } from "./server.js";

// --- moved to @prompt2md/core; re-exported for backwards compatibility -------
export {
  buildOutline,
  buildSavings,
  compressContext,
  createDeterministicTextEngine,
  createExtractiveSummarizer,
  createFileStore,
  createLlmSummarizer,
  createRuntimeFromEnv,
  createUnavailableEngine,
  formatAnchor,
  parseAnchor,
  stablePrefixTokens,
  stripBoilerplate,
  withDeterministicFallback,
  type CacheSavings,
  type CompressOptions,
  type CompressResult,
  type HermesRuntime,
  type OriginalStore,
  type OutlineOptions,
  type OutlineResult,
  type PhaseTrace,
  type SavingsReport,
  type SourceAnchor,
  type StoredOriginal,
  type StripResult,
  type Summarizer,
} from "@prompt2md/core";
