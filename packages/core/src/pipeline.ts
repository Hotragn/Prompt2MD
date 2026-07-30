import { shouldEscalate } from "./router/escalation.js";
import { route } from "./router/router.js";
import { sniffInput } from "./router/sniffer.js";
import { parseMarkdown } from "./markdown/parse.js";
import { stripBoilerplate } from "./optimize/boilerplate.js";
import { renderMarkdown } from "./types/document.js";
import { approxCounter } from "./tokens/counter.js";
import { buildTokenReport } from "./tokens/report.js";
import type { ConversionWarning, MarkdownDoc } from "./types/document.js";
import type {
  ConvertOptions,
  Engine,
  EngineId,
  EngineResult,
  RoutingDecision,
  SniffReport,
  SourceInput,
} from "./types/engine.js";
import type { TokenCounter, TokenReport } from "./types/tokens.js";

export interface PipelineDeps {
  readonly engines: Readonly<Record<EngineId, Engine>>;
  readonly counter?: TokenCounter;
}

export interface ConversionOutcome {
  readonly doc: MarkdownDoc;
  readonly markdown: string;
  readonly report: TokenReport;
  readonly decision: RoutingDecision;
  readonly sniff: SniffReport;
  readonly escalated: boolean;
}

/**
 * Full Phase 2 pipeline: sniff -> route -> engine -> evidence-based
 * escalation -> IR parse -> TokenReport. Optimization passes (boilerplate
 * strip, budget enforcement, cache layout assignment) attach here in Phase 3.
 */
export async function convertDocument(
  input: SourceInput,
  deps: PipelineDeps,
  options: ConvertOptions = {},
): Promise<ConversionOutcome> {
  const counter = deps.counter ?? approxCounter;
  const sniff = await sniffInput(input);
  const decision = route(sniff, options);
  const warnings: ConversionWarning[] = [];

  let engineId = decision.engine;
  let result: EngineResult;
  try {
    result = await deps.engines[engineId].convert(input, sniff, {
      ...options,
      ocr: decision.ocr,
    });
  } catch (err) {
    // A missing sidecar must not make textual input unconvertible: anything
    // with a decodable text layer degrades to the text path with a warning.
    const textual = input.kind === "text" || sniff.text !== undefined;
    if (engineId === "prompt-optimizer" || !textual) throw err;
    warnings.push({
      code: "engine-error",
      message: `${engineId} unavailable (${errorMessage(err)}) — fell back to the text path`,
    });
    engineId = "prompt-optimizer";
    result = await deps.engines["prompt-optimizer"].convert(input, sniff, options);
  }
  let escalated = false;

  if (decision.postChecks.length > 0 && engineId === decision.engine) {
    const verdict = shouldEscalate(decision, sniff, result.markdown);
    if (verdict.escalate) {
      try {
        const escalatedResult = await deps.engines.docling.convert(input, sniff, {
          ...options,
          ocr: verdict.ocr || decision.ocr,
        });
        escalated = true;
        engineId = "docling";
        result = escalatedResult;
        warnings.push({
          code: "engine-fallback",
          message: `fast path failed checks [${verdict.failedChecks.join(", ")}] — escalated to docling`,
        });
      } catch (err) {
        // Escalation is best-effort: a degraded fast-path result beats no result.
        warnings.push({
          code: "engine-error",
          message: `docling escalation failed (${errorMessage(err)}) — keeping fast-path output despite failed checks [${verdict.failedChecks.join(", ")}]`,
        });
      }
    }
  }

  let doc = parseMarkdown(result.markdown, counter);
  let markdown = result.markdown;
  // OPTIMIZE stage for document paths: deterministic boilerplate strip (nav,
  // cookie banners, ad figures, footers). The text path already cleans via
  // the optimizer; email/prompt content is never engine output.
  if (sniff.kind !== "prompt" && sniff.kind !== "email" && engineId !== "prompt-optimizer") {
    const stripped = stripBoilerplate(doc, counter);
    if (stripped.removedSections > 0) {
      doc = stripped.doc;
      markdown = renderMarkdown(doc);
    }
  }
  const docWithWarnings: MarkdownDoc = {
    ...doc,
    warnings: [...doc.warnings, ...result.warnings, ...warnings],
  };

  const inputTokens = counter.count(
    input.kind === "text" ? input.text : sniffedTextOr(sniff, result.markdown, input),
  );
  const report = buildTokenReport(docWithWarnings, {
    counter,
    inputTokens,
    engine: engineId,
    escalated,
    ...(options.tokenBudget !== undefined ? { budget: options.tokenBudget } : {}),
  });

  return { doc: docWithWarnings, markdown, report, decision, sniff, escalated };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Input-token baseline for non-text inputs: textual files (html/csv/json)
 * measure the raw file text — what a user would otherwise paste; binary
 * formats measure the raw engine extraction (see TokenReport docs).
 */
function sniffedTextOr(sniff: SniffReport, engineMarkdown: string, input: SourceInput): string {
  if (input.kind === "buffer" && (sniff.kind === "html" || sniff.kind === "csv" || sniff.kind === "json")) {
    return Buffer.from(input.data).toString("utf8");
  }
  return engineMarkdown;
}
