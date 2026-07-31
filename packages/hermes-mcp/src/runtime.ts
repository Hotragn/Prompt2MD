import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  approxCounter,
  convertDocument,
  createDoclingEngine,
  createLiteLlmGateway,
  createMarkitdownEngine,
  createPromptOptimizerEngine,
  parseMarkdown,
  renderMarkdown,
  stripPromptFiller,
  type ConversionOutcome,
  type ConversionWarning,
  type ConvertOptions,
  type Engine,
  type LlmGateway,
  type SourceInput,
} from "@prompt2md/core";
import { compressContext, type CompressOptions, type CompressResult } from "./compress/compressor.js";
import { createLlmSummarizer } from "./compress/summarize.js";
import { stripBoilerplate } from "./compress/boilerplate.js";
import { createFileStore, type OriginalStore } from "./store.js";

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
      // Rambling chat-box prompts are a single free-text blob, not a
      // structured document — sentence-level filler/dedup cleanup applies
      // before markdown parsing, which otherwise has nothing to strip.
      const text = sniff.kind === "prompt" ? stripPromptFiller(raw, approxCounter).text : raw;
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

export function createRuntimeFromEnv(env: Env = process.env): HermesRuntime {
  const gateway = buildGateway(env);
  const doclingUrl = env["P2MD_DOCLING_URL"];
  const pythonBin = env["P2MD_PYTHON_BIN"];
  const store = createFileStore(env["P2MD_STORE_DIR"] ?? resolveDefaultStoreDir());
  const summarizer = gateway !== undefined ? createLlmSummarizer(gateway) : undefined;

  const markitdown = createMarkitdownEngine(pythonBin !== undefined ? { pythonBin } : {});
  const engines = {
    "prompt-optimizer":
      gateway !== undefined ? createPromptOptimizerEngine(gateway) : createDeterministicTextEngine(),
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
