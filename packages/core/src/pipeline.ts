import { readFile } from "node:fs/promises";
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
        `${sniff.kind} input could not be converted by the ${engineId} engine ` +
          `(${errorMessage(err)}). HTML, CSV, JSON, PDF, DOCX, XLSX and PPTX convert ` +
          `in-process with no sidecar; legacy .doc/.xls/.ppt, OpenDocument and EPUB need ` +
          `MarkItDown (\`pip install "markitdown[all]"\`), and scans need OCR via ` +
          `P2MD_DOCLING_URL.`,
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
  const inputTokens = counter.count(await baselineText(sniff, result.markdown, input));

  // Structure is not free, and for the formats where the raw source is an
  // honest baseline it can cost more than it saves — a small CSV becomes a
  // pipe table that is legitimately larger than the file it came from.
  //
  // Declining that result would be the wrong fix: the table is more useful
  // than the CSV, which is why it is produced at all. Saying so is the right
  // one. Silence here would let the tool present a 69% expansion as a
  // conversion win, which is the exact failure the token report exists to
  // prevent.
  const outputTokens = doc.sections.reduce((n, s) => n + s.tokens, 0);
  const baselineIsRawSource = sniff.kind === "html" || sniff.kind === "csv" || sniff.kind === "json";
  if (baselineIsRawSource && inputTokens > 0 && outputTokens > inputTokens) {
    warnings.push({
      code: "layout-skipped",
      message:
        `Markdown structure cost more than it saved here: ${inputTokens} → ${outputTokens} tokens ` +
        `(${Math.round((outputTokens / inputTokens) * 100)}% of input). The raw source was already ` +
        `compact; structure buys parseability, not size.`,
    });
  }

  const docWithWarnings: MarkdownDoc = {
    ...doc,
    warnings: [...doc.warnings, ...result.warnings, ...warnings],
  };
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
 * Input-token baseline: textual formats (html/csv/json) measure the raw source
 * — what a user would otherwise have pasted — while binary formats measure the
 * engine's own extraction, since the tokens of a PDF's bytes are not a number
 * anyone can act on (see TokenReport docs).
 *
 * The `file` case used to fall through to the engine's output, so a converted
 * HTML *file* was measured against itself and always reported 100% of input.
 * That is the path the CLI takes for every file argument, so the headline
 * number was pinned at "saved nothing" precisely where the saving is largest:
 * this fixture drops 56 tokens of markup to 19, and reported no change.
 */
async function baselineText(
  sniff: SniffReport,
  engineMarkdown: string,
  input: SourceInput,
): Promise<string> {
  if (input.kind === "text") return input.text;
  const textual = sniff.kind === "html" || sniff.kind === "csv" || sniff.kind === "json";
  if (!textual) return engineMarkdown;
  if (input.kind === "buffer") return Buffer.from(input.data).toString("utf8");
  // Decoding failure here should cost the report, not the conversion.
  return readFile(input.path, "utf8").catch(() => engineMarkdown);
}
