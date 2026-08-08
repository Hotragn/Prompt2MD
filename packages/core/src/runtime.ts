import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { compressContext, type CompressOptions, type CompressResult } from "./compress/compressor.js";
import { createLlmSummarizer } from "./compress/summarize.js";
import { createDoclingEngine } from "./engines/docling.js";
import { createMarkitdownEngine } from "./engines/markitdown.js";
import { createNativeEngine } from "./engines/native/index.js";
import { createPromptOptimizerEngine } from "./engines/prompt-optimizer.js";
import { createLiteLlmGateway } from "./gateway/litellm.js";
import { parseMarkdown } from "./markdown/parse.js";
import { stripBoilerplate } from "./optimize/boilerplate.js";
import { stripPromptFiller } from "./optimize/filler.js";
import { structurePrompt } from "./optimize/structure.js";
import { convertDocument, type ConversionOutcome } from "./pipeline.js";
import { createFileStore, type OriginalStore } from "./store.js";
import { approxCounter } from "./tokens/counter.js";
import { renderMarkdown } from "./types/document.js";
import type { ConversionWarning } from "./types/document.js";
import type { ConvertOptions, Engine, SourceInput } from "./types/engine.js";
import type { LlmGateway } from "./types/gateway.js";

/**
 * Shared runtime for every prompt2md surface (MCP server, CLI). Configured
 * entirely from the environment and degrades gracefully:
 *
 *   P2MD_LITELLM_BASE_URL  — LiteLLM proxy (enables LLM optimizer + summarizer)
 *   P2MD_LITELLM_API_KEY   — proxy key (optional)
 *   P2MD_MODEL             — default model (default: claude-sonnet-5)
 *   P2MD_FALLBACK_MODELS   — comma-separated fallback chain
 *   P2MD_DOCLING_URL       — docling-serve base URL (enables high-fidelity engine)
 *   P2MD_PYTHON_BIN        — python for the markitdown worker (default: python)
 *   P2MD_STORE_DIR         — originals store (default: ~/.prompt2md/originals)
 */

export interface HermesRuntime {
  readonly store: OriginalStore;
  readonly gateway: LlmGateway | undefined;
  compress(text: string, options: CompressOptions): Promise<CompressResult>;
  convert(input: SourceInput, options: ConvertOptions): Promise<ConversionOutcome>;
  /** Releases engine sidecars (the persistent markitdown worker keeps the
   * Node event loop alive otherwise). Short-lived consumers (CLI) must call it. */
  dispose(): void;
}

type Env = Record<string, string | undefined>;

function buildGateway(env: Env): LlmGateway | undefined {
  const baseUrl = env["P2MD_LITELLM_BASE_URL"];
  if (baseUrl === undefined || baseUrl === "") return undefined;
  const apiKey = env["P2MD_LITELLM_API_KEY"];
  const fallback = env["P2MD_FALLBACK_MODELS"];
  return createLiteLlmGateway({
    baseUrl,
    defaultModel: env["P2MD_MODEL"] ?? "claude-sonnet-5",
    ...(apiKey !== undefined ? { apiKey } : {}),
    ...(fallback !== undefined && fallback !== ""
      ? { fallbackModels: fallback.split(",").map((m) => m.trim()) }
      : {}),
  });
}

/**
 * Thousands separators without `toLocaleString`, which follows the host
 * locale — on an en-IN machine it renders 1349989 as "13,49,989", so the same
 * warning would read differently depending on where it ran.
 */
function groupDigits(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Optional compiled system prompt for the LLM optimizer.
 *
 * P2MD_OPTIMIZER_SYSTEM_PROMPT_FILE points at instruction text produced by the
 * prompt-optimization harness (eval/convert_eval.py --optimize), which scores
 * candidates against the same metric the test suite enforces. A missing or
 * unreadable file falls back to the built-in rules with a stderr note rather
 * than failing startup — a worse prompt is recoverable, a dead runtime is not.
 */
function buildOptimizerOptions(env: Env): { systemRules?: string } {
  const file = env["P2MD_OPTIMIZER_SYSTEM_PROMPT_FILE"];
  if (file === undefined || file === "") return {};
  try {
    return { systemRules: readFileSync(file, "utf8") };
  } catch (err) {
    console.error(
      `[prompt2md] P2MD_OPTIMIZER_SYSTEM_PROMPT_FILE unreadable (${err instanceof Error ? err.message : String(err)}) — using built-in rules`,
    );
    return {};
  }
}

/**
 * Wrap the LLM optimizer so text input NEVER hard-fails.
 *
 * Real providers return empty content (filters, refusals), truncate at the
 * token limit, rate-limit past the retry budget, or are simply down. The
 * pipeline deliberately rethrows prompt-optimizer errors — for the text path
 * there is no engine below it to degrade to — so this wrapper supplies that
 * missing floor: any LLM failure lands on the deterministic path, which
 * always preserves content, with a warning saying exactly what happened.
 */
export function withDeterministicFallback(llmEngine: Engine): Engine {
  const deterministic = createDeterministicTextEngine();
  return {
    id: "prompt-optimizer",
    async convert(input, sniff, options) {
      try {
        return await llmEngine.convert(input, sniff, options);
      } catch (err) {
        const result = await deterministic.convert(input, sniff, options);
        return {
          ...result,
          warnings: [
            {
              code: "engine-error",
              message: `LLM optimizer failed (${err instanceof Error ? err.message.slice(0, 160) : String(err)}) — deterministic cleanup used instead; your content is intact`,
            },
            // Drop the deterministic engine's own "no gateway configured"
            // notice: a gateway IS configured, it just failed this call.
            ...result.warnings.filter((w) => w.code !== "engine-fallback"),
          ],
        };
      }
    },
  };
}

/** No-LLM text path: structure + deterministic boilerplate strip only. */
export function createDeterministicTextEngine(): Engine {
  return {
    id: "prompt-optimizer",
    async convert(input, sniff, _options) {
      const raw =
        input.kind === "text"
          ? input.text
          : input.kind === "buffer"
            ? Buffer.from(input.data).toString("utf8")
            : await readFile(input.path, "utf8");
      // Rambling chat-box prompts are a single free-text blob: strip the
      // filler, then reorganise into Goal / Requirements / Constraints using
      // the author's own words. Without this the zero-config path returns a
      // shorter wall of prose rather than Markdown, which is what every hosted
      // user gets, since the hosted deployment has no LLM gateway.
      const text =
        sniff.kind === "prompt"
          ? structurePrompt(stripPromptFiller(raw, approxCounter).text, approxCounter).markdown
          : raw;
      const stripped = stripBoilerplate(parseMarkdown(text, approxCounter), approxCounter);
      const markdown = renderMarkdown(stripped.doc);

      const warnings: ConversionWarning[] = [
        {
          code: "engine-fallback",
          message:
            "LLM gateway not configured — deterministic cleanup only (set P2MD_LITELLM_BASE_URL for full optimization)",
        },
      ];

      // Deduplication runs at two stages — sentence level for prompts, section
      // level for documents — and either can collapse an enormous amount of
      // text: repeated content reduces to a single copy. This path stores no
      // original to recover it from, so a large silent drop would make the
      // savings figure look spectacular for a reason the user never agreed to.
      //
      // Measured end to end rather than per stage, so it stays accurate no
      // matter which stage did the removing.
      const before = approxCounter.count(raw);
      const after = approxCounter.count(markdown);
      const removed = before - after;
      const removedShare = before > 0 ? removed / before : 0;
      // Both thresholds matter. A share alone fires on every short prompt —
      // trimming "thanks!!!" off an 18-token message is 30% — and a warning
      // that cries wolf teaches people to ignore the ones that matter.
      if (removedShare >= 0.25 && removed >= 200) {
        warnings.push({
          code: "content-removed",
          message:
            `deterministic cleanup removed ${groupDigits(removed)} of ${groupDigits(before)} tokens ` +
            `(${Math.round(removedShare * 100)}%) — repeated sentences and sections are collapsed to one copy, ` +
            `and boilerplate is dropped. Your source is unchanged; nothing here rewrites it.`,
        });
      }

      return { markdown, warnings };
    },
  };
}

export function createUnavailableEngine(id: Engine["id"], hint: string): Engine {
  return {
    id,
    convert() {
      return Promise.reject(new Error(`${id} engine not configured: ${hint}`));
    },
  };
}

/**
 * ~/.prompt2md/originals persists across CLI/MCP runs on a real machine.
 * On serverless platforms (Vercel, Lambda) HOME often points at a directory
 * that doesn't exist and can't be created, so fall back to the OS temp dir
 * — the only writable path there — rather than crashing on first use.
 */
function resolveDefaultStoreDir(): string {
  const home = homedir();
  const base = existsSync(home) ? home : tmpdir();
  return join(base, ".prompt2md", "originals");
}

export interface RuntimeOverrides {
  /**
   * Replace the originals store. Hosts without a persistent disk (serverless)
   * need a durable backend for `retrieve_original` to mean anything past a
   * cold start; injecting it here keeps this package free of any specific
   * vendor's SDK.
   */
  readonly store?: OriginalStore;
}

export function createRuntimeFromEnv(
  env: Env = process.env,
  overrides: RuntimeOverrides = {},
): HermesRuntime {
  const gateway = buildGateway(env);
  const doclingUrl = env["P2MD_DOCLING_URL"];
  const pythonBin = env["P2MD_PYTHON_BIN"];
  const store = overrides.store ?? createFileStore(env["P2MD_STORE_DIR"] ?? resolveDefaultStoreDir());
  const summarizer = gateway !== undefined ? createLlmSummarizer(gateway) : undefined;

  const markitdown = createMarkitdownEngine(pythonBin !== undefined ? { pythonBin } : {});
  const engines = {
    "prompt-optimizer":
      gateway !== undefined
        ? withDeterministicFallback(createPromptOptimizerEngine(gateway, buildOptimizerOptions(env)))
        : createDeterministicTextEngine(),
    native: createNativeEngine(),
    markitdown,
    docling:
      doclingUrl !== undefined && doclingUrl !== ""
        ? createDoclingEngine({ baseUrl: doclingUrl })
        : createUnavailableEngine("docling", "set P2MD_DOCLING_URL to a docling-serve instance"),
  };

  return {
    store,
    gateway,
    compress: (text, options) =>
      compressContext(text, store, {
        ...options,
        ...(summarizer !== undefined && options.summarizer === undefined ? { summarizer } : {}),
      }),
    convert: (input, options) => convertDocument(input, { engines }, options),
    dispose: () => markitdown.dispose(),
  };
}
