import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  approxCounter,
  buildTokenReport,
  parseMarkdown,
  type ConversionOutcome,
  type ConvertOptions,
  type SourceInput,
} from "@prompt2md/core";
import { compressContext, createFileStore, type HermesRuntime, type OriginalStore } from "@prompt2md/hermes-mcp";
import { buildProgram, deriveOutPath, mapPool, watchFiles, type CliIo } from "../src/index.js";

function captureIo(): { io: CliIo; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t) => out.push(t), err: (t) => err.push(t) }, out, err };
}

const FAKE_MARKDOWN = "# Converted\n\nBody content produced by the fake engine for testing purposes.";

function fakeRuntime(store: OriginalStore): HermesRuntime {
  return {
    store,
    gateway: undefined,
    dispose: () => {},
    compress: (text, options) => compressContext(text, store, options),
    convert: (input: SourceInput, options: ConvertOptions): Promise<ConversionOutcome> => {
      const doc = parseMarkdown(FAKE_MARKDOWN, approxCounter);
      const report = buildTokenReport(doc, {
        counter: approxCounter,
        inputTokens: 100,
        engine: "markitdown",
        escalated: false,
        ...(options.tokenBudget !== undefined ? { budget: options.tokenBudget } : {}),
      });
      void input;
      return Promise.resolve({
        doc,
        markdown: FAKE_MARKDOWN,
        report,
        decision: { engine: "markitdown", ocr: false, reason: "test", postChecks: [] },
        sniff: { kind: "html", mime: "text/html", bytes: 100 },
        escalated: false,
      });
    },
  };
}

async function run(runtime: HermesRuntime, args: string[]): Promise<{ out: string[]; err: string[] }> {
  const { io, out, err } = captureIo();
  const program = buildProgram(runtime, io);
  program.exitOverride().configureOutput({ writeErr: () => {}, writeOut: () => {} });
  await program.parseAsync(args, { from: "user" });
  return { out, err };
}

describe("helpers", () => {
  it("deriveOutPath swaps the extension and directory", () => {
    expect(deriveOutPath(join("docs", "Q2 report.docx"), "out")).toBe(join("out", "Q2 report.md"));
  });

  it("watchFiles fires debounced for matched files only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "p2md-watch-"));
    const watched = join(dir, "watched.txt");
    const ignored = join(dir, "ignored.txt");
    await writeFile(watched, "v1", "utf8");
    await writeFile(ignored, "v1", "utf8");

    const changes: string[] = [];
    const dispose = watchFiles([watched], (f) => changes.push(f));
    try {
      await new Promise((r) => setTimeout(r, 300)); // let watchers settle
      await writeFile(ignored, "v2", "utf8");
      await writeFile(watched, "v2", "utf8");

      const deadline = Date.now() + 8000;
      while (changes.length === 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.every((f) => f === watched)).toBe(true);
    } finally {
      dispose();
    }
  });

  it("mapPool preserves order under bounded concurrency", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapPool([30, 10, 20, 5, 15], 2, async (ms) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return ms;
    });
    expect(results).toEqual([30, 10, 20, 5, 15]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});

describe("prompt2md CLI", () => {
  let store: OriginalStore;
  let runtime: HermesRuntime;

  beforeAll(async () => {
    store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-cli-")));
    runtime = fakeRuntime(store);
  });

  it("convert --text prints markdown to stdout and a report line to stderr", async () => {
    const { out, err } = await run(runtime, ["convert", "--text", "messy input"]);
    expect(out.join("\n")).toContain("# Converted");
    expect(err[0]).toContain("engine=markitdown");
    expect(err[0]).toContain("tokens 100→");
  });

  it("convert --json emits a single parseable object", async () => {
    const { out } = await run(runtime, ["convert", "--text", "messy input", "--json"]);
    const parsed = JSON.parse(out.join("\n")) as { markdown: string; report: { engine: string } };
    expect(parsed.markdown).toContain("# Converted");
    expect(parsed.report.engine).toBe("markitdown");
  });

  it("convert rejects when given both a file and --text", async () => {
    await expect(run(runtime, ["convert", "some.txt", "--text", "x"])).rejects.toThrow();
  });

  it("convert compresses automatically when the budget is exceeded", async () => {
    const { err } = await run(runtime, ["convert", "--text", "messy input", "--token-budget", "5"]);
    expect(err.some((l) => l.includes("repeat-call cost"))).toBe(true);
    expect(err.some((l) => l.includes("sourceId="))).toBe(true);
  });

  it("batch converts matching files into the out dir with a summary", async () => {
    const inDir = await mkdtemp(join(tmpdir(), "p2md-batch-in-"));
    const outDir = await mkdtemp(join(tmpdir(), "p2md-batch-out-"));
    await writeFile(join(inDir, "a.txt"), "alpha", "utf8");
    await writeFile(join(inDir, "b.txt"), "beta", "utf8");
    const pattern = `${inDir.replace(/\\/g, "/")}/*.txt`;

    const { out } = await run(runtime, ["batch", pattern, "--out-dir", outDir, "--report"]);

    expect(existsSync(join(outDir, "a.md"))).toBe(true);
    expect(existsSync(join(outDir, "b.md"))).toBe(true);
    expect(existsSync(join(outDir, "a.report.json"))).toBe(true);
    expect(await readFile(join(outDir, "a.md"), "utf8")).toContain("# Converted");
    expect(out.at(-1)).toContain("2 converted, 0 failed");
  });

  it("compress respects the budget and reports savings", async () => {
    const body = Array.from({ length: 12 }, (_, i) =>
      `Paragraph ${i}. ${"Detail sentence about operations and metrics. ".repeat(5)}Fact f-${i}.`,
    ).join("\n\n");
    const { out, err } = await run(runtime, ["compress", "--text", `# Doc\n\n${body}`, "--token-budget", "300", "--json"]);
    void err;
    const parsed = JSON.parse(out.join("\n")) as {
      savings: { compressedTokens: number; rawTokens: number };
      sourceId: string;
    };
    expect(parsed.savings.compressedTokens).toBeLessThan(parsed.savings.rawTokens);
    expect(parsed.sourceId).toMatch(/^[0-9a-f]{16}$/);
  });

  it("retrieve returns full originals by sourceId and spans by anchor", async () => {
    const id = await store.put("hello world, verbatim and intact");

    const full = await run(runtime, ["retrieve", id]);
    expect(full.out.join("\n")).toBe("hello world, verbatim and intact");

    const span = await run(runtime, ["retrieve", `p2md:src=${id}#0-5`]);
    expect(span.out.join("\n")).toBe("hello");
  });

  it("retrieve rejects malformed references", async () => {
    await expect(run(runtime, ["retrieve", "not-a-ref"])).rejects.toThrow();
  });
});
