#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { realpathSync, watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command, InvalidArgumentError, Option } from "commander";
import { glob } from "tinyglobby";
import type { ConvertOptions, Fidelity, TokenReport } from "@prompt2md/core";
import {
  createRuntimeFromEnv,
  parseAnchor,
  type CompressResult,
  type HermesRuntime,
} from "@prompt2md/hermes-mcp";

/** Injectable output sink so tests can capture stdout/stderr streams. */
export interface CliIo {
  out(text: string): void;
  err(text: string): void;
}

const defaultIo: CliIo = {
  out: (t) => process.stdout.write(`${t}\n`),
  err: (t) => process.stderr.write(`${t}\n`),
};

const PROVIDERS = ["anthropic", "openai", "gemini", "kimi"] as const;
type Provider = (typeof PROVIDERS)[number];

function parsePositiveInt(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new InvalidArgumentError("must be a positive integer");
  return n;
}

function parseNonNegativeInt(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) throw new InvalidArgumentError("must be a non-negative integer");
  return n;
}

export function summarizeReport(report: TokenReport, escalated: boolean): string {
  const pct = Math.round(report.ratio * 100);
  const budget =
    report.budget !== undefined
      ? ` budget=${report.budget} ${report.withinBudget === true ? "OK" : "EXCEEDED"}`
      : "";
  return `engine=${report.engine}${escalated ? " (escalated)" : ""} tokens ${report.inputTokens}→${report.outputTokens} (${pct}% of input)${budget}`;
}

export function summarizeSavings(result: CompressResult): string {
  const { savings } = result;
  return `compressed ${savings.rawTokens}→${savings.compressedTokens} tokens (${Math.round(savings.ratio * 100)}%), repeat-call cost ${savings.cache.effectiveTokensPerSubsequentCall} effective tokens (${savings.subsequentSavingsVsRawPct}% cheaper than raw), sourceId=${result.sourceId}`;
}

export function deriveOutPath(inputPath: string, outDir: string): string {
  return join(outDir, `${basename(inputPath, extname(inputPath))}.md`);
}

/**
 * Output paths for a batch, disambiguated so files that share a basename
 * across directories never overwrite each other (`report.md`,
 * `report-2.md`, ...). Silent overwrites would be data loss.
 */
export function deriveBatchOutPaths(files: readonly string[], outDir: string): Map<string, string> {
  const taken = new Set<string>();
  const paths = new Map<string, string>();
  for (const file of files) {
    const base = basename(file, extname(file));
    let candidate = `${base}.md`;
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
      candidate = `${base}-${n}.md`;
    }
    taken.add(candidate.toLowerCase());
    paths.set(file, join(outDir, candidate));
  }
  return paths;
}

/**
 * Watches the parent directories of `files` and fires onChange (debounced
 * 200ms per file) for events on exactly those files. Returns a disposer.
 */
export function watchFiles(files: readonly string[], onChange: (file: string) => void): () => void {
  const fileSet = new Set(files.map((f) => resolve(f)));
  const dirs = [...new Set([...fileSet].map((f) => dirname(f)))];
  const timers = new Map<string, NodeJS.Timeout>();
  const watchers = dirs.map((dir) =>
    watch(dir, (_event, filename) => {
      if (filename === null) return;
      const full = resolve(dir, filename.toString());
      if (!fileSet.has(full)) return;
      clearTimeout(timers.get(full));
      timers.set(full, setTimeout(() => onChange(full), 200));
    }),
  );
  return () => {
    for (const watcher of watchers) watcher.close();
    for (const timer of timers.values()) clearTimeout(timer);
  };
}

/** Bounded-concurrency map that preserves input order in its results. */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

interface ConvertFlags {
  readonly text?: string;
  readonly out?: string;
  readonly tokenBudget?: number;
  readonly fidelity: Fidelity;
  readonly provider?: Provider;
  readonly json?: boolean;
}

export function buildProgram(runtime?: HermesRuntime, io: CliIo = defaultIo): Command {
  let cached: HermesRuntime | undefined = runtime;
  // Lazy: --help and argument errors must not boot engine workers.
  const rt = (): HermesRuntime => (cached ??= createRuntimeFromEnv());

  const program = new Command("prompt2md")
    .description("Convert anything into token-optimized, layout-aware Markdown — and know what it saved you.")
    .version("0.1.0");

  const fidelityOption = new Option("-f, --fidelity <mode>", "engine routing override")
    .choices(["auto", "fast", "high"])
    .default("auto");
  const providerOption = new Option("--provider <provider>", "cache-layout profile").choices([...PROVIDERS]);

  program
    .command("convert [input]")
    .description("convert a file (or --text) to Markdown; compresses when --token-budget is exceeded")
    .option("--text <text>", "convert raw text instead of a file")
    .option("-o, --out <file>", "write Markdown to a file instead of stdout")
    .option("-b, --token-budget <n>", "compress the result to fit this many tokens", parsePositiveInt)
    .addOption(fidelityOption)
    .addOption(providerOption)
    .option("--json", "emit one JSON object: { markdown, report, savings?, sourceId? }")
    .action(async (input: string | undefined, flags: ConvertFlags) => {
      if ((input === undefined) === (flags.text === undefined)) {
        program.error("provide a file path or --text (exactly one)");
      }
      const source =
        input !== undefined
          ? ({ kind: "file", path: resolve(input) } as const)
          : ({ kind: "text", text: flags.text! } as const);
      const options: ConvertOptions = {
        fidelity: flags.fidelity,
        ...(flags.tokenBudget !== undefined ? { tokenBudget: flags.tokenBudget } : {}),
      };

      const outcome = await rt().convert(source, options);
      let markdown = outcome.markdown;
      let compressed: CompressResult | undefined;
      if (flags.tokenBudget !== undefined && outcome.report.outputTokens > flags.tokenBudget) {
        compressed = await rt().compress(markdown, {
          tokenBudget: flags.tokenBudget,
          ...(flags.provider !== undefined ? { provider: flags.provider } : {}),
        });
        markdown = compressed.markdown;
      }

      if (flags.json === true) {
        io.out(
          JSON.stringify(
            {
              markdown,
              report: outcome.report,
              warnings: [...outcome.doc.warnings, ...(compressed?.doc.warnings ?? [])],
              ...(compressed !== undefined
                ? { savings: compressed.savings, sourceId: compressed.sourceId }
                : {}),
            },
            null,
            2,
          ),
        );
      } else if (flags.out !== undefined) {
        await writeFile(resolve(flags.out), markdown, "utf8");
        io.err(`wrote ${flags.out}`);
        io.err(summarizeReport(outcome.report, outcome.escalated));
        if (compressed !== undefined) io.err(summarizeSavings(compressed));
      } else {
        io.out(markdown);
        io.err(summarizeReport(outcome.report, outcome.escalated));
        if (compressed !== undefined) io.err(summarizeSavings(compressed));
      }
      for (const warning of outcome.doc.warnings) io.err(`warning[${warning.code}]: ${warning.message}`);
    });

  program
    .command("batch <patterns...>")
    .description("convert many files (glob patterns) into an output directory")
    .requiredOption("-d, --out-dir <dir>", "directory for .md outputs")
    .option("-c, --concurrency <n>", "parallel conversions", parsePositiveInt, 4)
    .option("-b, --token-budget <n>", "per-file token budget", parsePositiveInt)
    .addOption(fidelityOption)
    .addOption(providerOption)
    .option("--report", "write a .report.json beside each output")
    .option("--continue-on-error", "convert remaining files when one fails")
    .option("--watch", "keep watching matched files and re-convert on change")
    .action(
      async (
        patterns: string[],
        flags: {
          outDir: string;
          concurrency: number;
          tokenBudget?: number;
          fidelity: Fidelity;
          provider?: Provider;
          report?: boolean;
          continueOnError?: boolean;
          watch?: boolean;
        },
      ) => {
        const files = await glob(patterns, { absolute: true, onlyFiles: true });
        if (files.length === 0) program.error(`no files match: ${patterns.join(" ")}`);
        const outDir = resolve(flags.outDir);
        await mkdir(outDir, { recursive: true });
        const outPaths = deriveBatchOutPaths(files, outDir);

        interface BatchRow {
          file: string;
          ok: boolean;
          detail: string;
          inTokens: number;
          outTokens: number;
        }

        const convertOne = async (file: string): Promise<BatchRow> => {
          try {
            const outcome = await rt().convert(
              { kind: "file", path: file },
              {
                fidelity: flags.fidelity,
                ...(flags.tokenBudget !== undefined ? { tokenBudget: flags.tokenBudget } : {}),
              },
            );
            let markdown = outcome.markdown;
            let compressed: CompressResult | undefined;
            if (flags.tokenBudget !== undefined && outcome.report.outputTokens > flags.tokenBudget) {
              compressed = await rt().compress(markdown, {
                tokenBudget: flags.tokenBudget,
                ...(flags.provider !== undefined ? { provider: flags.provider } : {}),
              });
              markdown = compressed.markdown;
            }
            const outPath = outPaths.get(file) ?? deriveOutPath(file, outDir);
            await writeFile(outPath, markdown, "utf8");
            if (flags.report === true) {
              await writeFile(
                `${outPath.slice(0, -3)}.report.json`,
                JSON.stringify(
                  { report: outcome.report, ...(compressed !== undefined ? { savings: compressed.savings } : {}) },
                  null,
                  2,
                ),
                "utf8",
              );
            }
            return {
              file,
              ok: true,
              detail: summarizeReport(outcome.report, outcome.escalated),
              inTokens: outcome.report.inputTokens,
              outTokens: compressed?.savings.compressedTokens ?? outcome.report.outputTokens,
            };
          } catch (err) {
            if (flags.continueOnError !== true && flags.watch !== true) throw err;
            return {
              file,
              ok: false,
              detail: err instanceof Error ? err.message : String(err),
              inTokens: 0,
              outTokens: 0,
            };
          }
        };

        const rows = await mapPool(files, flags.concurrency, convertOne);

        for (const row of rows) {
          io.out(`${row.ok ? "ok  " : "FAIL"} ${basename(row.file)} — ${row.detail}`);
        }
        const converted = rows.filter((r) => r.ok);
        const failed = rows.length - converted.length;
        const totalIn = converted.reduce((n, r) => n + r.inTokens, 0);
        const totalOut = converted.reduce((n, r) => n + r.outTokens, 0);
        io.out(
          `${converted.length} converted, ${failed} failed — tokens ${totalIn}→${totalOut}${totalIn > 0 ? ` (${Math.round((totalOut / totalIn) * 100)}%)` : ""}`,
        );
        if (failed > 0) process.exitCode = 1;

        if (flags.watch === true) {
          io.err(`watching ${files.length} file(s) for changes — Ctrl+C to stop`);
          watchFiles(files, (file) => {
            void convertOne(file).then((row) =>
              io.out(`${row.ok ? "ok  " : "FAIL"} ${basename(row.file)} — ${row.detail} (watch)`),
            );
          });
          await new Promise(() => {}); // runs until interrupted
        }
      },
    );

  program
    .command("compress [file]")
    .description("compress a text/markdown file (or --text) to a token budget via the 4-phase pipeline")
    .option("--text <text>", "compress raw text instead of a file")
    .requiredOption("-b, --token-budget <n>", "target maximum tokens", parsePositiveInt)
    .addOption(providerOption)
    .option("-o, --out <file>", "write compressed Markdown to a file instead of stdout")
    .option("--json", "emit one JSON object: { markdown, savings, sourceId }")
    .action(
      async (
        file: string | undefined,
        flags: { text?: string; tokenBudget: number; provider?: Provider; out?: string; json?: boolean },
      ) => {
        if ((file === undefined) === (flags.text === undefined)) {
          program.error("provide a file path or --text (exactly one)");
        }
        const text = flags.text ?? (await readFile(resolve(file!), "utf8"));
        const result = await rt().compress(text, {
          tokenBudget: flags.tokenBudget,
          ...(flags.provider !== undefined ? { provider: flags.provider } : {}),
        });

        if (flags.json === true) {
          io.out(
            JSON.stringify(
              { markdown: result.markdown, savings: result.savings, sourceId: result.sourceId, warnings: result.doc.warnings },
              null,
              2,
            ),
          );
        } else if (flags.out !== undefined) {
          await writeFile(resolve(flags.out), result.markdown, "utf8");
          io.err(`wrote ${flags.out}`);
          io.err(summarizeSavings(result));
        } else {
          io.out(result.markdown);
          io.err(summarizeSavings(result));
        }
        for (const warning of result.doc.warnings) io.err(`warning[${warning.code}]: ${warning.message}`);
      },
    );

  program
    .command("retrieve <ref>")
    .description("fetch the verbatim original behind a p2md:src anchor or a 16-hex sourceId")
    .option("--start <n>", "span start offset (with a bare sourceId)", parseNonNegativeInt)
    .option("--end <n>", "span end offset (with a bare sourceId)", parseNonNegativeInt)
    .action(async (ref: string, flags: { start?: number; end?: number }) => {
      const anchor = parseAnchor(ref);
      const sourceId = anchor?.sourceId ?? (/^[0-9a-f]{16}$/.test(ref) ? ref : undefined);
      if (sourceId === undefined) {
        program.error("ref must be a p2md:src anchor or a 16-hex sourceId");
      }
      const start = anchor?.start ?? flags.start;
      const end = anchor?.end ?? flags.end;

      const text =
        start !== undefined && end !== undefined
          ? await rt().store.getSpan(sourceId!, start, end)
          : (await rt().store.get(sourceId!))?.text;
      if (text === undefined) program.error(`no original stored for ${sourceId}`);
      io.out(text!);
    });

  program
    .command("doctor")
    .description("check engine sidecars and configuration")
    .action(async () => {
      const env = process.env;
      const results: string[] = [];
      const check = (ok: boolean, name: string, detail: string): void => {
        results.push(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
      };

      check(true, "node", process.version);

      const pythonBin = env["P2MD_PYTHON_BIN"] ?? "python";
      const py = spawnSync(pythonBin, ["-c", "import markitdown, sys; sys.stdout.write(getattr(markitdown, '__version__', 'installed'))"], {
        encoding: "utf8",
        timeout: 15_000,
      });
      check(
        py.status === 0,
        "markitdown (fast path)",
        py.status === 0 ? `${pythonBin}: markitdown ${py.stdout.trim()}` : `not usable via '${pythonBin}' — pip install "markitdown[all]"`,
      );

      const doclingUrl = env["P2MD_DOCLING_URL"];
      if (doclingUrl === undefined || doclingUrl === "") {
        check(false, "docling (high fidelity)", "P2MD_DOCLING_URL not set — scans/complex tables unavailable");
      } else {
        check(await reachable(`${doclingUrl.replace(/\/+$/, "")}/health`), "docling (high fidelity)", doclingUrl);
      }

      const litellm = env["P2MD_LITELLM_BASE_URL"];
      if (litellm === undefined || litellm === "") {
        check(false, "LiteLLM gateway (LLM optimizer)", "P2MD_LITELLM_BASE_URL not set — deterministic/extractive fallbacks in use");
      } else {
        check(await reachable(`${litellm.replace(/\/+$/, "")}/models`), "LiteLLM gateway (LLM optimizer)", litellm);
      }

      for (const line of results) io.out(line);
    });

  return program;
}

async function reachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  const runtime = createRuntimeFromEnv();
  buildProgram(runtime)
    .parseAsync(process.argv)
    .catch((err: unknown) => {
      process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    })
    .finally(() => {
      // Release the persistent markitdown worker — it would otherwise keep
      // the event loop (and this process) alive forever.
      runtime.dispose();
    });
}
