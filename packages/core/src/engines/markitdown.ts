import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { ConvertOptions, Engine, EngineResult, InputKind, SniffReport, SourceInput } from "../types/engine.js";

const DEFAULT_WORKER = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "python", "markitdown_worker.py");

const EXTENSION_BY_KIND: Partial<Record<InputKind, string>> = {
  html: ".html",
  csv: ".csv",
  json: ".json",
  pdf: ".pdf",
};

export interface MarkitdownEngineOptions {
  /** Python executable. Default: "python" (Windows) — point at a venv in production. */
  readonly pythonBin?: string;
  readonly workerPath?: string;
  readonly requestTimeoutMs?: number;
}

interface Pending {
  resolve(markdown: string): void;
  reject(err: Error): void;
  timer: NodeJS.Timeout;
}

/**
 * Fast-path engine: a persistent Python worker running microsoft/markitdown,
 * JSON-lines over stdio. The worker restarts lazily after a crash; a crash
 * rejects in-flight requests rather than hanging them.
 */
export function createMarkitdownEngine(options: MarkitdownEngineOptions = {}): Engine & { dispose(): void } {
  const pythonBin = options.pythonBin ?? "python";
  const workerPath = options.workerPath ?? DEFAULT_WORKER;
  const timeoutMs = options.requestTimeoutMs ?? 120_000;

  let child: ChildProcessWithoutNullStreams | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  let stderrTail = "";

  function ensureWorker(): ChildProcessWithoutNullStreams {
    if (child !== null) return child;
    const proc = spawn(pythonBin, [workerPath], { stdio: ["pipe", "pipe", "pipe"] });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString("utf8")).slice(-2000);
    });
    createInterface({ input: proc.stdout }).on("line", (line) => {
      let parsed: { id?: number; markdown?: string; error?: string };
      try {
        parsed = JSON.parse(line) as typeof parsed;
      } catch {
        return; // non-protocol noise on stdout
      }
      const entry = parsed.id !== undefined ? pending.get(parsed.id) : undefined;
      if (entry === undefined) return;
      pending.delete(parsed.id as number);
      clearTimeout(entry.timer);
      if (parsed.error !== undefined) entry.reject(new Error(`markitdown: ${parsed.error}`));
      else entry.resolve(parsed.markdown ?? "");
    });
    const fail = (why: string): void => {
      child = null;
      for (const [id, entry] of pending) {
        pending.delete(id);
        clearTimeout(entry.timer);
        entry.reject(new Error(`markitdown worker ${why}${stderrTail ? `; stderr: ${stderrTail.trim()}` : ""}`));
      }
    };
    proc.on("error", (err) => fail(`failed to start (${err.message})`));
    proc.on("exit", (code) => fail(`exited (code ${code ?? "signal"})`));
    child = proc;
    return proc;
  }

  function request(payload: Record<string, unknown>): Promise<string> {
    const proc = ensureWorker();
    const id = nextId++;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`markitdown request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      proc.stdin.write(`${JSON.stringify({ id, ...payload })}\n`, (err) => {
        if (err) {
          pending.delete(id);
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  return {
    id: "markitdown",

    async convert(input: SourceInput, sniff: SniffReport, _options: ConvertOptions): Promise<EngineResult> {
      let markdown: string;
      if (input.kind === "file") {
        markdown = await request({ path: input.path });
      } else if (input.kind === "text") {
        markdown = await request({ text: input.text, extension: extensionFor(sniff, input.filename) });
      } else {
        // MarkItDown selects converters by extension, so buffers round-trip through a temp file.
        const dir = await mkdtemp(join(tmpdir(), "p2md-"));
        const path = join(dir, input.filename ?? `input${extensionFor(sniff)}`);
        try {
          await writeFile(path, input.data);
          markdown = await request({ path });
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
      return { markdown, warnings: [] };
    },

    dispose(): void {
      child?.kill();
      child = null;
    },
  };
}

function extensionFor(sniff: SniffReport, filename?: string): string {
  const fromName = filename !== undefined ? extname(filename) : "";
  if (fromName !== "") return fromName;
  if (sniff.filename !== undefined && extname(sniff.filename) !== "") return extname(sniff.filename);
  return EXTENSION_BY_KIND[sniff.kind] ?? ".txt";
}
