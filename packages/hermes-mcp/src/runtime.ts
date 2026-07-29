import { homedir } from "node:os";
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
  type ConversionOutcome,
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

/** No-LLM text path: structure + deterministic boilerplate strip only. */
export function createDeterministicTextEngine(): Engine {
  return {
    id: "prompt-optimizer",
    convert(input, _sniff, _options) {
      const raw =
        input.kind === "text"
          ? input.text
          : input.kind === "buffer"
            ? Buffer.from(input.data).toString("utf8")
            : "";
      const stripped = stripBoilerplate(parseMarkdown(raw, approxCounter), approxCounter);
      return Promise.resolve({
        markdown: renderMarkdown(stripped.doc),
        warnings: [
          {
            code: "engine-fallback" as const,
            message:
              "LLM gateway not configured — deterministic cleanup only (set P2MD_LITELLM_BASE_URL for full optimization)",
          },
        ],
      });
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

export function createRuntimeFromEnv(env: Env = process.env): HermesRuntime {
  const gateway = buildGateway(env);
  const doclingUrl = env["P2MD_DOCLING_URL"];
  const pythonBin = env["P2MD_PYTHON_BIN"];
  const store = createFileStore(env["P2MD_STORE_DIR"] ?? join(homedir(), ".prompt2md", "originals"));
  const summarizer = gateway !== undefined ? createLlmSummarizer(gateway) : undefined;

  const engines = {
    "prompt-optimizer":
      gateway !== undefined ? createPromptOptimizerEngine(gateway) : createDeterministicTextEngine(),
    markitdown: createMarkitdownEngine(pythonBin !== undefined ? { pythonBin } : {}),
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
  };
}
