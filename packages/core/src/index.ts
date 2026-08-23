// Types (public contract)
export type * from "./types/document.js";
export type * from "./types/engine.js";
export type * from "./types/tokens.js";
export type * from "./types/gateway.js";

// IR helpers
export { renderMarkdown } from "./types/document.js";
export { parseMarkdown, hashSource } from "./markdown/parse.js";

// Filesystem containment for untrusted callers (the MCP server). The CLI does
// not use it: a path its operator typed grants no authority they lacked.
export {
  assertInWorkspace,
  assertReadable,
  workspaceRoots,
  FilePolicyError,
  InputTooLargeError,
  PathOutsideWorkspaceError,
} from "./fs-policy.js";

// Resource ceilings shared by every surface.
export { maxInputBytes, maxPdfPages } from "./limits.js";

// Router
export { route, THRESHOLDS } from "./router/router.js";
export { sniffText, sniffBuffer, sniffInput, probeText, probePdf } from "./router/sniffer.js";
export {
  shouldEscalate,
  detectLowYield,
  detectTableDegradation,
  type EscalationVerdict,
} from "./router/escalation.js";

// Gateway
export { createLiteLlmGateway, GatewayHttpError } from "./gateway/litellm.js";
export {
  CACHE_PROFILES,
  orderForCache,
  cacheablePrefixTokens,
  type CacheProfile,
  type CacheProvider,
} from "./gateway/cache-profiles.js";

// Optimize
export { stripBoilerplate, type StripResult } from "./optimize/boilerplate.js";
export { stripPromptFiller, type FillerStripResult } from "./optimize/filler.js";
export { structurePrompt, type StructureResult } from "./optimize/structure.js";

// Tokens
export { approxCounter } from "./tokens/counter.js";
export { buildTokenReport, type ReportContext } from "./tokens/report.js";

// Engines
export { createMarkitdownEngine, type MarkitdownEngineOptions } from "./engines/markitdown.js";
export { createDoclingEngine, type DoclingEngineOptions } from "./engines/docling.js";
export { createPromptOptimizerEngine } from "./engines/prompt-optimizer.js";

// Pipeline
export { convertDocument, type ConversionOutcome, type PipelineDeps } from "./pipeline.js";

// Compression engine. Lives here rather than in the MCP package because it is
// product logic, not protocol: the CLI, the web app, and the MCP server are all
// equal consumers, and embedding the library should not drag in the MCP SDK.
export { compressContext, type CompressOptions, type CompressResult } from "./compress/compressor.js";
export { buildOutline, type OutlineOptions, type OutlineResult } from "./compress/outline.js";
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

// Content-addressed store of verbatim originals — what makes compression
// reversible rather than destructive.
export {
  createFileStore,
  formatAnchor,
  parseAnchor,
  sweepExpired,
  type OriginalStore,
  type SourceAnchor,
  type StoredOriginal,
  type StoreOptions,
} from "./store.js";

// Composition root: builds a configured pipeline from the environment. Shared by
// every surface (CLI, web, MCP server), which is why it lives here rather than
// in the MCP package — a CLI user should not install an MCP SDK to get it.
export {
  createRuntimeFromEnv,
  createDeterministicTextEngine,
  createUnavailableEngine,
  withDeterministicFallback,
  type HermesRuntime,
} from "./runtime.js";
