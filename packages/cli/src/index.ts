#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync, watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command, InvalidArgumentError, Option } from "commander";
import { glob } from "tinyglobby";
import { BAD, GLYPH, OK, OPTIONAL, amber, bold, dim, green, lockup, pad, red, slate, violet } from "./brand.js";
import {
  createRuntimeFromEnv,
  parseAnchor,
  workspaceRoots,
  type CompressResult,
  type ConvertOptions,
  type Fidelity,
  type HermesRuntime,
  type TokenReport,
} from "@prompt2md/core";

/** Injectable output sink so tests can capture stdout/stderr streams. */
export interface CliIo {
  out(text: string): void;
  err(text: string): void;
}

const defaultIo: CliIo = {
  out: (t) => process.stdout.write(`${t}\n`),
  err: (t) => process.stderr.write(`${t}\n`),
};

// Kept in step with packages/cli/package.json by hand. `prompt2md --version`
// reads this, so a stale value here makes the CLI lie about itself.
const VERSION = "0.2.0";

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

/**
 * Write to `-o`, refusing to destroy something first.
 *
 * `batch` has been careful about this since it shipped — `deriveBatchOutPaths`
 * disambiguates colliding basenames precisely because silent overwrites are
 * data loss. The single-file path never got the same treatment and would
 * happily flatten anything.
 *
 * Two different refusals, because they are two different mistakes:
 *
 *   - Output equals input. There is no reading of `convert notes.md -o
 *     notes.md` that does what the author wanted: the source is consumed and
 *     replaced by its own conversion, unrecoverably. `--force` does not
 *     override this one, because "yes I meant to destroy my input" is not a
 *     thing anyone means.
 *   - Output exists but is some other file. That may well be intended on a
 *     re-run, so it is a stop rather than a ban: `--force` proceeds.
 */
async function writeOut(
  target: string,
  content: string,
  options: { readonly force?: boolean; readonly input?: string },
): Promise<void> {
  const out = resolve(target);

  if (options.input !== undefined && out === resolve(options.input)) {
    throw new Error(
      `refusing to overwrite the input file (${target}) with its own conversion — ` +
        `choose a different -o path, or drop -o to write to stdout`,
    );
  }

  if (options.force !== true && existsSync(out)) {
    throw new Error(`${target} already exists — pass --force to overwrite it`);
  }

  await writeFile(out, content, "utf8");
}

/**
 * Every coloured span below wraps a whole token, never splits one, so
 * `engine=markitdown` and `tokens 100→90` survive a grep with colour on.
 *
 * "% of input" is spelled out deliberately: a bare percentage here reads as
 * "% saved", which is the opposite figure. 93% of input is a 7% saving.
 */
export function summarizeReport(report: TokenReport, escalated: boolean): string {
  const pct = Math.round(report.ratio * 100);
  const budget =
    report.budget !== undefined
      ? `  ${report.withinBudget === true ? green(`budget=${report.budget} OK`) : amber(`budget=${report.budget} EXCEEDED`)}`
      : "";
  return `  ${violet(GLYPH)}  ${slate(`engine=${report.engine}`)}${escalated ? ` ${amber("(escalated)")}` : ""}  ${bold(`tokens ${report.inputTokens}→${report.outputTokens}`)}  ${slate(`(${pct}% of input)`)}${budget}`;
}

export function summarizeSavings(result: CompressResult): string {
  const { savings } = result;
  const shrink = `compressed ${savings.rawTokens}→${savings.compressedTokens} tokens (${Math.round(savings.ratio * 100)}% of input)`;
  const repeat = `repeat-call cost ${savings.cache.effectiveTokensPerSubsequentCall} effective tokens (${savings.subsequentSavingsVsRawPct}% cheaper than raw)`;
  return `  ${violet(GLYPH)}  ${bold(shrink)}\n     ${slate(repeat)}\n     ${slate(`sourceId=${result.sourceId}`)} ${dim("— retrieve the verbatim original with:")} ${violet(`prompt2md retrieve ${result.sourceId}`)}`;
}

function wroteLine(path: string): string {
  return `  ${green(OK)}  ${bold(`wrote ${path}`)}`;
}

function warningLine(warning: { readonly code: string; readonly message: string }): string {
  return `  ${amber("!")}  ${amber(`warning[${warning.code}]`)}  ${slate(warning.message)}`;
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

interface DoctorRow {
  /** ok = working. missing = a real fault. optional = a capability not switched on. */
  readonly status: "ok" | "missing" | "optional";
  readonly name: string;
  readonly detail: string;
  readonly fix?: string;
}

interface ConvertFlags {
  readonly text?: string;
  readonly out?: string;
  readonly force?: boolean;
  readonly tokenBudget?: number;
  readonly fidelity: Fidelity;
  readonly provider?: Provider;
  readonly json?: boolean;
}

/**
 * What a bare `prompt2md` prints. Commander's default for a missing subcommand
 * is an error and a usage dump, which greets a first-time user with a failure
 * for doing the most natural thing there is. This answers the two questions
 * they actually have: what is it, and what do I type next.
 */
export function welcome(): string {
  const example = (cmd: string, note: string): string => `    ${violet(pad(cmd, 42))}${slate(note)}`;
  return [
    ...lockup(VERSION),
    `  ${slate("Convert anything into token-optimized, layout-aware Markdown —")}`,
    `  ${slate("and know what it saved you.")}`,
    "",
    `  ${dim("START")}`,
    example("prompt2md convert README.md", "a file to Markdown"),
    example("prompt2md convert report.pdf -o out.md", "PDF, Office, scans"),
    example("prompt2md compress notes.md -b 2000", "fit a token budget"),
    example('prompt2md batch "docs/**/*.pdf" -d out/', "many files at once"),
    example("prompt2md doctor", "what this machine can do"),
    "",
    `  ${dim("MORE")}`,
    `    ${violet(pad("prompt2md --help", 42))}${slate("every command and flag")}`,
    `    ${slate(pad("prompt2md.vercel.app", 42))}${slate("docs and live studio")}`,
    "",
  ].join("\n");
}

export function buildProgram(runtime?: HermesRuntime, io: CliIo = defaultIo): Command {
  let cached: HermesRuntime | undefined = runtime;
  // Lazy: --help and argument errors must not boot engine workers.
  const rt = (): HermesRuntime => (cached ??= createRuntimeFromEnv());

  const program = new Command("prompt2md")
    .description("Convert anything into token-optimized, layout-aware Markdown — and know what it saved you.")
    .version(VERSION)
    .addHelpText("beforeAll", lockup().join("\n"))
    .addHelpText(
      "after",
      [
        "",
        `${bold("Examples")}`,
        `  ${violet(pad("prompt2md convert report.pdf -o report.md", 46))}${slate("a PDF to Markdown")}`,
        `  ${violet(pad("prompt2md compress notes.md -b 2000", 46))}${slate("fit a token budget")}`,
        `  ${violet(pad('prompt2md batch "docs/**/*" -d out/', 46))}${slate("a whole directory")}`,
        `  ${violet(pad("prompt2md retrieve p2md:src=<id>#0-120", 46))}${slate("the verbatim original")}`,
        "",
        `${slate("Markdown and JSON go to stdout; every report goes to stderr, so")}`,
        `${slate("`prompt2md convert x.pdf > out.md` writes only the document.")}`,
        "",
      ].join("\n"),
    );

  const fidelityOption = new Option("-f, --fidelity <mode>", "engine routing override")
    .choices(["auto", "fast", "high"])
    .default("auto");
  const providerOption = new Option("--provider <provider>", "cache-layout profile").choices([...PROVIDERS]);

  program
    .command("convert [input]")
    .description("convert a file (or --text) to Markdown; compresses when --token-budget is exceeded")
    .option("--text <text>", "convert raw text instead of a file")
    .option("-o, --out <file>", "write Markdown to a file instead of stdout")
    .option("--force", "overwrite --out if it already exists")
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
        await writeOut(flags.out, markdown, {
          ...(flags.force === true ? { force: true } : {}),
          ...(input !== undefined ? { input } : {}),
        });
        io.err(wroteLine(flags.out));
        io.err(summarizeReport(outcome.report, outcome.escalated));
        if (compressed !== undefined) io.err(summarizeSavings(compressed));
      } else {
        io.out(markdown);
        io.err(summarizeReport(outcome.report, outcome.escalated));
        if (compressed !== undefined) io.err(summarizeSavings(compressed));
      }
      for (const warning of outcome.doc.warnings) io.err(warningLine(warning));
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
              // Compact here on purpose: summarizeReport is a standalone line
              // with its own glyph and indent, which misreads inside a table.
              detail: `engine=${outcome.report.engine}${outcome.escalated ? " (escalated)" : ""}`,
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

        const nameWidth = Math.max(...rows.map((r) => basename(r.file).length)) + 2;
        const renderRow = (row: BatchRow, suffix = ""): string => {
          const mark = row.ok ? green(OK) : red(BAD);
          const name = bold(pad(basename(row.file), nameWidth));
          if (!row.ok) return `  ${mark}  ${name}${amber(row.detail)}${suffix}`;
          const share = row.inTokens > 0 ? ` ${slate(`(${Math.round((row.outTokens / row.inTokens) * 100)}% of input)`)}` : "";
          return `  ${mark}  ${name}${slate(row.detail)}  ${bold(`tokens ${row.inTokens}→${row.outTokens}`)}${share}${suffix}`;
        };

        io.out("");
        for (const row of rows) io.out(renderRow(row));

        const converted = rows.filter((r) => r.ok);
        const failed = rows.length - converted.length;
        const totalIn = converted.reduce((n, r) => n + r.inTokens, 0);
        const totalOut = converted.reduce((n, r) => n + r.outTokens, 0);
        const tally = `${converted.length} converted, ${failed} failed`;
        // The tally stays the last line on stdout — scripts tail it.
        io.out("");
        io.out(
          `  ${violet(GLYPH)}  ${bold(tally)}  ${bold(`tokens ${totalIn}→${totalOut}`)}${totalIn > 0 ? `  ${slate(`(${Math.round((totalOut / totalIn) * 100)}% of input)`)}` : ""}`,
        );
        if (failed > 0) process.exitCode = 1;

        if (flags.watch === true) {
          io.err(`  ${violet(GLYPH)}  ${slate(`watching ${files.length} file(s) — ${bold("Ctrl+C")} to stop`)}`);
          watchFiles(files, (file) => {
            void convertOne(file).then((row) => io.out(renderRow(row, dim("  (watch)"))));
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
    .option("--force", "overwrite --out if it already exists")
    .option("--json", "emit one JSON object: { markdown, savings, sourceId }")
    .action(
      async (
        file: string | undefined,
        flags: {
          text?: string;
          tokenBudget: number;
          provider?: Provider;
          out?: string;
          force?: boolean;
          json?: boolean;
        },
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
          await writeOut(flags.out, result.markdown, {
            ...(flags.force === true ? { force: true } : {}),
            ...(file !== undefined ? { input: file } : {}),
          });
          io.err(wroteLine(flags.out));
          io.err(summarizeSavings(result));
        } else {
          io.out(result.markdown);
          io.err(summarizeSavings(result));
        }
        for (const warning of result.doc.warnings) io.err(warningLine(warning));
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
      const rows: DoctorRow[] = [];
      // "missing" is a real fault — something the user expects to work does
      // not. "optional" is a capability they have not switched on. Reporting
      // an unconfigured extra as a red ✗ trains people to ignore the output,
      // so the two never share a glyph.
      const check = (status: DoctorRow["status"], name: string, detail: string, fix?: string): void => {
        rows.push({ status, name, detail, ...(fix !== undefined ? { fix } : {}) });
      };

      check("ok", "node", process.version);

      // The in-process engine ships with the package, so this is a statement
      // of fact rather than a probe. It is listed anyway: the first question
      // doctor exists to answer is "what works right now", and the answer
      // being "most of it, with nothing installed" is the useful headline.
      check("ok", "documents", "HTML, CSV, JSON, PDF, DOCX, XLSX, PPTX — built in, no setup");

      // Scoped to the MCP server on purpose. This CLI reads whatever its
      // operator can read and always has; the roots exist because the MCP
      // caller is a model. Reported here because doctor is where people look
      // when `convert` refuses a path and they want to know why.
      const roots = workspaceRoots(env);
      check(
        "optional",
        "MCP file access",
        roots.length === 0
          ? "off — the MCP `convert` tool takes pasted text but refuses file paths"
          : `${roots.length} workspace root(s): ${roots.join(", ")}`,
        roots.length === 0 ? "set P2MD_WORKSPACE_ROOTS to the dirs a model may read" : undefined,
      );

      // markitdown is an extension, not a prerequisite. It used to be reported
      // as `missing` — a red mark for a machine that converts every common
      // format perfectly well — which is exactly the crying-wolf this command
      // is supposed to avoid.
      const pythonBin = env["P2MD_PYTHON_BIN"] ?? "python";
      const py = spawnSync(pythonBin, ["-c", "import markitdown, sys; sys.stdout.write(getattr(markitdown, '__version__', 'installed'))"], {
        encoding: "utf8",
        timeout: 15_000,
      });
      check(
        py.status === 0 ? "ok" : "optional",
        "markitdown",
        py.status === 0
          ? `markitdown ${py.stdout.trim()} via ${pythonBin}`
          : "not installed — legacy .doc/.xls/.ppt, OpenDocument and EPUB unavailable",
        py.status === 0 ? undefined : 'pip install "markitdown[all]"',
      );

      const doclingUrl = env["P2MD_DOCLING_URL"];
      if (doclingUrl === undefined || doclingUrl === "") {
        check(
          "optional",
          "docling",
          "not configured — scans and complex tables fall back to the fast path",
          "set P2MD_DOCLING_URL",
        );
      } else {
        const up = await reachable(`${doclingUrl.replace(/\/+$/, "")}/health`);
        check(up ? "ok" : "missing", "docling", up ? doclingUrl : `unreachable at ${doclingUrl}`);
      }

      const litellm = env["P2MD_LITELLM_BASE_URL"];
      if (litellm === undefined || litellm === "") {
        check(
          "optional",
          "LLM optimizer",
          "not configured — deterministic cleanup only",
          "set P2MD_LITELLM_BASE_URL",
        );
      } else {
        const up = await reachable(`${litellm.replace(/\/+$/, "")}/models`);
        check(up ? "ok" : "missing", "LLM optimizer", up ? litellm : `unreachable at ${litellm}`);
      }

      io.out("");
      io.out(`  ${violet(GLYPH)}  ${bold("prompt2md doctor")}`);
      io.out("");

      const width = Math.max(...rows.map((r) => r.name.length)) + 2;
      for (const row of rows) {
        const mark =
          row.status === "ok" ? green(OK) : row.status === "missing" ? red(BAD) : slate(OPTIONAL);
        const detail = row.status === "ok" ? slate(row.detail) : row.status === "missing" ? amber(row.detail) : slate(row.detail);
        io.out(`  ${mark}  ${bold(pad(row.name, width))}${detail}`);
        // The fix hangs under its own row, indented to the detail column.
        if (row.fix !== undefined) io.out(`     ${pad("", width)}${violet(row.fix)}`);
      }

      const broken = rows.filter((r) => r.status === "missing").length;
      const optional = rows.filter((r) => r.status === "optional").length;
      io.out("");
      if (broken > 0) {
        io.out(
          `  ${amber(broken === 1 ? "1 thing needs attention" : `${broken} things need attention`)} ${slate("— run the fix above, then re-run doctor")}`,
        );
        process.exitCode = 1;
      } else if (optional > 0) {
        io.out(`  ${green("Ready")} ${slate(`— conversion works. ${optional} optional upgrade${optional === 1 ? "" : "s"} available.`)}`);
      } else {
        io.out(`  ${green("Ready")} ${slate("— everything is configured.")}`);
      }
      io.out("");
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

if (isDirectRun() && process.argv.length <= 2) {
  // Before createRuntimeFromEnv(): greeting a user must not spawn a python
  // worker, and the process would then hang waiting on a runtime nothing uses.
  process.stdout.write(welcome());
} else if (isDirectRun()) {
  const runtime = createRuntimeFromEnv();
  buildProgram(runtime)
    .parseAsync(process.argv)
    .catch((err: unknown) => {
      // "error:" stays lowercase and unprefixed by design — it is the string
      // people grep for, and commander's own errors already use it.
      process.stderr.write(`${red("error:")} ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    })
    .finally(() => {
      // Release the persistent markitdown worker — it would otherwise keep
      // the event loop (and this process) alive forever.
      runtime.dispose();
    });
}
