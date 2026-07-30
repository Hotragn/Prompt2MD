// Types (public contract)
export type * from "./types/document.js";
export type * from "./types/engine.js";
export type * from "./types/tokens.js";
export type * from "./types/gateway.js";

// IR helpers
export { renderMarkdown } from "./types/document.js";
export { parseMarkdown, hashSource } from "./markdown/parse.js";

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

// Tokens
export { approxCounter } from "./tokens/counter.js";
export { buildTokenReport, type ReportContext } from "./tokens/report.js";

// Engines
export { createMarkitdownEngine, type MarkitdownEngineOptions } from "./engines/markitdown.js";
export { createDoclingEngine, type DoclingEngineOptions } from "./engines/docling.js";
export { createPromptOptimizerEngine } from "./engines/prompt-optimizer.js";

// Pipeline
export { convertDocument, type ConversionOutcome, type PipelineDeps } from "./pipeline.js";
