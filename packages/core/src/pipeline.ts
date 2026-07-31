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
  // A mistyped path is the most ordinary mistake there is; surfacing a raw
  // ENOENT stack from somewhere inside the sniffer helps nobody.
  const sniff = await sniffInput(input).catch((err: unknown) => {
    if (input.kind === "file" && err instanceof Error && "code" in err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") throw new Error(`file not found: ${input.path}`);
      if (code === "EACCES" || code === "EPERM") throw new Error(`cannot read (permission denied): ${input.path}`);
      if (code === "EISDIR") throw new Error(`that is a directory, not a file: ${input.path}`);
    }
    throw err;
  });
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
    if (engineId === "prompt-optimizer") throw err;
    if (!textual) {
      // Binary input with no usable engine. Refusing is correct — decoding a
      // PDF as UTF-8 would produce confident nonsense — but the raw spawn
      // error ("spawn python ENOENT") tells a user nothing about what to do,
      // and this is the first thing anyone hits on a deployment without the
      // sidecars. Say what is missing and how to get it.
      throw new Error(
        `${sniff.kind} input needs a document engine, and ${engineId} is unavailable ` +
          `(${errorMessage(err)}). Install the MarkItDown sidecar with ` +
          `\`pip install "markitdown[all]"\`, or set P2MD_DOCLING_URL to a docling-serve ` +
          `instance for scans and complex tables. Text, Markdown, HTML, CSV and JSON ` +
          `convert with no sidecar at all.`,
      );
    }
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
      const beforeTokens = doc.sections.reduce((n, s) => n + s.tokens, 0);
      doc = stripped.doc;
      markdown = renderMarkdown(doc);
      // Deduplication can collapse a great deal of content — repeated
      // paragraphs go down to one copy — and unlike compression this path
      // stores no original to recover them from. A large silent drop would
      // make the savings figure look impressive for the wrong reason, so
      // disclose it whenever it is material.
      const removedShare = beforeTokens > 0 ? stripped.removedTokens / beforeTokens : 0;
      if (removedShare >= 0.25) {
        warnings.push({
          code: "content-removed",
          message:
            `boilerplate and duplicate removal dropped ${stripped.removedSections} sections ` +
            `(${stripped.removedTokens} tokens, ${Math.round(removedShare * 100)}% of the parsed document) — ` +
            `mostly repeated or navigational content; convert with the original kept if you need it back`,
        });
      }
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
