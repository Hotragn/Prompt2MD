import { shouldEscalate } from "./router/escalation.js";
import { route } from "./router/router.js";
import { sniffInput } from "./router/sniffer.js";
import { parseMarkdown } from "./markdown/parse.js";
import { approxCounter } from "./tokens/counter.js";
import { buildTokenReport } from "./tokens/report.js";
import type { ConversionWarning, MarkdownDoc } from "./types/document.js";
import type { ConvertOptions, Engine, EngineId, RoutingDecision, SniffReport, SourceInput } from "./types/engine.js";
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
  let result = await deps.engines[engineId].convert(input, sniff, {
    ...options,
    ocr: decision.ocr,
  });
  let escalated = false;

  if (decision.postChecks.length > 0) {
    const verdict = shouldEscalate(decision, sniff, result.markdown);
    if (verdict.escalate) {
      escalated = true;
      warnings.push({
        code: "engine-fallback",
        message: `fast path failed checks [${verdict.failedChecks.join(", ")}] — escalated to docling`,
      });
      engineId = "docling";
      result = await deps.engines.docling.convert(input, sniff, {
        ...options,
        ocr: verdict.ocr || decision.ocr,
      });
    }
  }

  const doc = parseMarkdown(result.markdown, counter);
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

  return { doc: docWithWarnings, markdown: result.markdown, report, decision, sniff, escalated };
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
