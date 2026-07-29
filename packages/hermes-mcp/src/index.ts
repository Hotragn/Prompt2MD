// Library surface. The stdio server executable lives in bin.ts.
export { createHermesServer, type HermesDeps } from "./server.js";
export { compressContext, type CompressOptions, type CompressResult } from "./compress/compressor.js";
export { stripBoilerplate, type StripResult } from "./compress/boilerplate.js";
export {
  createExtractiveSummarizer,
  createLlmSummarizer,
  type Summarizer,
} from "./compress/summarize.js";
export {
  buildSavings,
  stablePrefixTokens,
  type CacheSavings,
  type PhaseTrace,
  type SavingsReport,
} from "./compress/savings.js";
export {
  createFileStore,
  formatAnchor,
  parseAnchor,
  type OriginalStore,
  type SourceAnchor,
  type StoredOriginal,
} from "./store.js";
export {
  createRuntimeFromEnv,
  createDeterministicTextEngine,
  createUnavailableEngine,
  type HermesRuntime,
} from "./runtime.js";
