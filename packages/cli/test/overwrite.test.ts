import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  approxCounter,
  buildTokenReport,
  compressContext,
  createFileStore,
  parseMarkdown,
  type ConversionOutcome,
  type ConvertOptions,
  type HermesRuntime,
  type OriginalStore,
  type SourceInput,
} from "@prompt2md/core";
import { buildProgram, type CliIo } from "../src/index.js";

/**
 * `-o` used to overwrite anything, including its own input.
 *
 * `batch` has guarded against this since it shipped (deriveBatchOutPaths
 * disambiguates colliding basenames), but the single-file path did not, so
 * `convert notes.md -o notes.md` read the source, converted it, and replaced
 * the source with the result. Unrecoverable, from a plausible typo.
 */

const CONVERTED = "# Converted\n\nBody content produced by the fake engine for testing purposes.";

function captureIo(): { io: CliIo; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t) => out.push(t), err: (t) => err.push(t) }, out, err };
}

function fakeRuntime(store: OriginalStore): HermesRuntime {
  return {
    store,
    gateway: undefined,
    dispose: () => {},
    compress: (text, options) => compressContext(text, store, options),
    convert: (_input: SourceInput, options: ConvertOptions): Promise<ConversionOutcome> => {
      const doc = parseMarkdown(CONVERTED, approxCounter);
      return Promise.resolve({
        doc,
        markdown: CONVERTED,
        report: buildTokenReport(doc, {
          counter: approxCounter,
          inputTokens: 100,
          engine: "markitdown",
          escalated: false,
          ...(options.tokenBudget !== undefined ? { budget: options.tokenBudget } : {}),
        }),
        decision: { engine: "markitdown", ocr: false, reason: "test", postChecks: [] },
        sniff: { kind: "html", mime: "text/html", bytes: 100 },
        escalated: false,
      });
    },
  };
}

let dir: string;
let runtime: HermesRuntime;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "p2md-overwrite-"));
  runtime = fakeRuntime(createFileStore(join(dir, "store")));
});

/** Commander throws on program.error; run() surfaces whichever failure came. */
async function run(args: string[]): Promise<{ error?: string; out: string[]; err: string[] }> {
  const { io, out, err } = captureIo();
  const program = buildProgram(runtime, io);
  program.exitOverride();
  try {
    await program.parseAsync(["node", "prompt2md", ...args]);
    return { out, err };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), out, err };
  }
}

describe("convert -o refuses to destroy data", () => {
  it("refuses when --out is the input file, and leaves the source intact", async () => {
    const source = join(dir, "notes.md");
    const original = "# My notes\n\nText I would very much like to keep.";
    await writeFile(source, original, "utf8");

    const { error } = await run(["convert", source, "-o", source]);

    expect(error).toMatch(/refusing to overwrite the input file/);
    expect(await readFile(source, "utf8")).toBe(original);
  });

  it("refuses even with --force when --out is the input file", async () => {
    // --force means "yes, replace that other file". It does not mean "destroy
    // the thing I asked you to read", which is never intentional.
    const source = join(dir, "notes.md");
    const original = "# My notes\n\nStill here.";
    await writeFile(source, original, "utf8");

    const { error } = await run(["convert", source, "-o", source, "--force"]);

    expect(error).toMatch(/refusing to overwrite the input file/);
    expect(await readFile(source, "utf8")).toBe(original);
  });

  it("refuses an existing unrelated --out without --force", async () => {
    const source = join(dir, "in.html");
    const target = join(dir, "out.md");
    await writeFile(source, "<h1>hi</h1>", "utf8");
    await writeFile(target, "PRECIOUS", "utf8");

    const { error } = await run(["convert", source, "-o", target]);

    expect(error).toMatch(/already exists — pass --force/);
    expect(await readFile(target, "utf8")).toBe("PRECIOUS");
  });

  it("overwrites an existing --out when --force is given", async () => {
    const source = join(dir, "in.html");
    const target = join(dir, "out.md");
    await writeFile(source, "<h1>hi</h1>", "utf8");
    await writeFile(target, "PRECIOUS", "utf8");

    const { error } = await run(["convert", source, "-o", target, "--force"]);

    expect(error).toBeUndefined();
    expect(await readFile(target, "utf8")).toBe(CONVERTED);
  });

  it("writes a fresh --out with no flag needed", async () => {
    const source = join(dir, "in.html");
    const target = join(dir, "new.md");
    await writeFile(source, "<h1>hi</h1>", "utf8");

    const { error } = await run(["convert", source, "-o", target]);

    expect(error).toBeUndefined();
    expect(await readFile(target, "utf8")).toBe(CONVERTED);
  });

  it("still writes to stdout when no -o is given", async () => {
    const source = join(dir, "in.html");
    await writeFile(source, "<h1>hi</h1>", "utf8");

    const { error, out } = await run(["convert", source]);

    expect(error).toBeUndefined();
    expect(out.join("\n")).toContain("# Converted");
  });
});

describe("compress -o refuses to destroy data", () => {
  it("refuses when --out is the input file", async () => {
    const source = join(dir, "doc.md");
    const original = `# Doc\n\n${"Sentence that makes this long enough to compress. ".repeat(40)}`;
    await writeFile(source, original, "utf8");

    const { error } = await run(["compress", source, "-b", "100", "-o", source]);

    expect(error).toMatch(/refusing to overwrite the input file/);
    expect(await readFile(source, "utf8")).toBe(original);
  });

  it("refuses an existing unrelated --out without --force", async () => {
    const source = join(dir, "doc.md");
    const target = join(dir, "small.md");
    await writeFile(source, `# Doc\n\n${"Long enough to compress. ".repeat(40)}`, "utf8");
    await writeFile(target, "PRECIOUS", "utf8");

    const { error } = await run(["compress", source, "-b", "100", "-o", target]);

    expect(error).toMatch(/already exists — pass --force/);
    expect(await readFile(target, "utf8")).toBe("PRECIOUS");
  });
});
