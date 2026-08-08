import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { approxCounter, buildOutline, parseAnchor } from "@prompt2md/core";
import type {
  CacheProvider,
  CompressOptions,
  CompressResult,
  ConversionOutcome,
  ConvertOptions,
  OriginalStore,
  SourceInput,
} from "@prompt2md/core";

export interface HermesDeps {
  readonly store: OriginalStore;
  readonly compress: (text: string, options: CompressOptions) => Promise<CompressResult>;
  /** Optional: full document conversion (requires engine sidecars). */
  readonly convert?: (input: SourceInput, options: ConvertOptions) => Promise<ConversionOutcome>;
}

interface ToolText {
  readonly [key: string]: unknown;
  readonly content: { readonly type: "text"; readonly text: string }[];
  readonly isError?: boolean;
}

const text = (t: string): { type: "text"; text: string } => ({ type: "text", text: t });
const fail = (message: string): ToolText => ({ content: [text(message)], isError: true });

export function createHermesServer(deps: HermesDeps): McpServer {
  const server = new McpServer({ name: "prompt2md-hermes", version: "0.1.0" });

  server.tool(
    "convert",
    "Convert a file or raw text into token-optimized, layout-aware Markdown. Returns the Markdown followed by a JSON TokenReport (input/output tokens, compression ratio, engine used). The pre-compression conversion is stored; compressed sections carry p2md:src anchors resolvable with retrieve_original. Provide exactly one of `text` or `path`.",
    {
      text: z.string().optional().describe("Raw text / messy prompt / pasted document"),
      path: z.string().optional().describe("Absolute path to a local file (pdf, docx, html, csv, ...)"),
      tokenBudget: z.number().int().positive().optional().describe("Compress the result to fit this many tokens"),
      fidelity: z.enum(["auto", "fast", "high"]).optional().describe("Engine routing override (default auto)"),
      provider: z.enum(["anthropic", "openai", "gemini", "kimi"]).optional().describe("Cache-layout profile (default anthropic)"),
    },
    async (args): Promise<ToolText> => {
      if (deps.convert === undefined) {
        return fail("convert is unavailable: engine sidecars are not configured (set P2MD_* env vars — see README)");
      }
      if ((args.text === undefined) === (args.path === undefined)) {
        return fail("provide exactly one of `text` or `path`");
      }
      const input: SourceInput =
        args.text !== undefined ? { kind: "text", text: args.text } : { kind: "file", path: args.path! };
      try {
        const outcome = await deps.convert(input, {
          ...(args.fidelity !== undefined ? { fidelity: args.fidelity } : {}),
          ...(args.tokenBudget !== undefined ? { tokenBudget: args.tokenBudget } : {}),
        });
        const sourceId = await deps.store.put(outcome.markdown, "convert");

        if (args.tokenBudget !== undefined && outcome.report.outputTokens > args.tokenBudget) {
          const compressed = await deps.compress(outcome.markdown, {
            tokenBudget: args.tokenBudget,
            ...(args.provider !== undefined ? { provider: args.provider as CacheProvider } : {}),
          });
          return {
            content: [
              text(compressed.markdown),
              text(JSON.stringify({ sourceId: compressed.sourceId, report: outcome.report, savings: compressed.savings }, null, 2)),
            ],
          };
        }
        return {
          content: [
            text(outcome.markdown),
            text(JSON.stringify({ sourceId, report: outcome.report }, null, 2)),
          ],
        };
      } catch (err) {
        return fail(`conversion failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "compress_context",
    "Compress an oversized context block to a token budget via the 4-phase pipeline (structure, boilerplate strip, middle-context summarization with head/tail preserved verbatim, cache-aligned reassembly). Lossless: the original is stored first and every summarized section embeds a `p2md:src=<id>#<start>-<end>` anchor for retrieve_original. Returns compressed Markdown, then a JSON savings report.",
    {
      text: z.string().min(1).describe("The context block to compress"),
      tokenBudget: z.number().int().positive().describe("Target maximum tokens"),
      provider: z.enum(["anthropic", "openai", "gemini", "kimi"]).optional().describe("Cache profile for layout + savings math (default anthropic)"),
    },
    async (args): Promise<ToolText> => {
      try {
        const result = await deps.compress(args.text, {
          tokenBudget: args.tokenBudget,
          ...(args.provider !== undefined ? { provider: args.provider as CacheProvider } : {}),
        });
        return {
          content: [
            text(result.markdown),
            text(JSON.stringify({ sourceId: result.sourceId, savings: result.savings, warnings: result.doc.warnings }, null, 2)),
          ],
        };
      } catch (err) {
        return fail(`compression failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "outline",
    "Lazy context: return a navigable INDEX of a large document instead of the document. Headings stay verbatim; every other section becomes a one-line stub with its kind, token cost, a short preview, and a `p2md:src` anchor. Read a stub's content by passing its anchor to retrieve_original. Prefer this over `convert` with a tokenBudget whenever the task needs a few sections out of many: nothing is summarized, so nothing is approximated, and only the sections actually needed are ever paid for. Returns the index Markdown, then a JSON report of index vs full token cost.",
    {
      text: z.string().min(1).describe("The document text to index"),
      previewChars: z.number().int().positive().max(240).optional().describe("Preview length per stub (default 72)"),
    },
    async (args): Promise<ToolText> => {
      try {
        // An unbounded budget runs strip + structure only, never
        // summarization — the index must point at verbatim source, so the
        // sections it describes have to still be the original text.
        const prepared = await deps.compress(args.text, { tokenBudget: Number.MAX_SAFE_INTEGER });
        const outline = buildOutline(
          prepared.doc,
          (t) => approxCounter.count(t),
          args.previewChars !== undefined ? { previewChars: args.previewChars } : {},
        );
        return {
          content: [
            text(outline.markdown),
            text(
              JSON.stringify(
                {
                  sourceId: prepared.sourceId,
                  indexTokens: outline.indexTokens,
                  fullTokens: outline.fullTokens,
                  indexShareOfFullPct:
                    outline.fullTokens === 0
                      ? null
                      : Math.round((outline.indexTokens / outline.fullTokens) * 100),
                  stubbed: outline.stubbed,
                  verbatim: outline.verbatim,
                  unanchored: outline.unanchored,
                  worthwhile: outline.worthwhile,
                  ...(outline.worthwhile
                    ? {}
                    : {
                        advice:
                          "This index costs at least as much as the document. Send the document itself instead — it is too short or too table/code-heavy to index.",
                      }),
                  warnings: prepared.doc.warnings,
                },
                null,
                2,
              ),
            ),
          ],
        };
      } catch (err) {
        return fail(`outline failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // Chat-box integration: MCP clients with prompt support (Claude Desktop,
  // Claude Code, Cursor, ...) surface this in their prompt menu — the user
  // pastes raw text and the model receives optimized Markdown instead.
  server.prompt(
    "optimize",
    "Convert pasted raw text into token-optimized Markdown before the model sees it.",
    { text: z.string().describe("The raw text to optimize") },
    async ({ text: raw }) => {
      let markdown: string;
      if (deps.convert !== undefined) {
        markdown = (await deps.convert({ kind: "text", text: raw }, {})).markdown;
      } else {
        // Deterministic 4-phase pipeline with an unbounded budget: strip +
        // structure only, no summarization.
        markdown = (await deps.compress(raw, { tokenBudget: Number.MAX_SAFE_INTEGER })).markdown;
      }
      return {
        messages: [{ role: "user" as const, content: { type: "text" as const, text: markdown } }],
      };
    },
  );

  server.tool(
    "retrieve_original",
    "Fetch the verbatim original text behind a compressed section — compression is never destructive. Pass either the `anchor` string exactly as it appears in the Markdown comment (p2md:src=<id>#<start>-<end>), or an explicit sourceId (with optional start/end character offsets for a span; omit them for the full original).",
    {
      anchor: z.string().optional().describe("Anchor comment from compressed output"),
      sourceId: z.string().regex(/^[0-9a-f]{16}$/).optional(),
      start: z.number().int().nonnegative().optional(),
      end: z.number().int().nonnegative().optional(),
    },
    async (args): Promise<ToolText> => {
      const ref = args.anchor !== undefined ? parseAnchor(args.anchor) : undefined;
      const sourceId = ref?.sourceId ?? args.sourceId;
      if (sourceId === undefined) {
        return fail("provide `anchor` or `sourceId`");
      }
      const start = ref?.start ?? args.start;
      const end = ref?.end ?? args.end;

      if (start !== undefined && end !== undefined) {
        const span = await deps.store.getSpan(sourceId, start, end);
        return span !== undefined ? { content: [text(span)] } : fail(`no original stored for ${sourceId}`);
      }
      const record = await deps.store.get(sourceId);
      return record !== undefined ? { content: [text(record.text)] } : fail(`no original stored for ${sourceId}`);
    },
  );

  return server;
}
