import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import {
  MAX_INPUT_CHARS,
  MAX_UPLOAD_BYTES,
  REQUEST_TIMEOUT_MS,
  enforceRateLimit,
} from "../../../lib/guard";
import {
  RATE_LIMIT_CHEAP,
  RATE_LIMIT_EXPENSIVE,
  RATE_LIMIT_WINDOW_MS,
  rateLimitIsPerInstance,
} from "../../../lib/rate-limit";
import { storeIsEphemeral } from "../../../lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What this particular deployment can actually do.
 *
 * The pipeline degrades gracefully, but a user should not have to discover the
 * degradation by uploading a PDF and getting an error back. The studio reads
 * this on load and says up front which formats will work here.
 */

let documentEngine: Promise<boolean> | undefined;

/**
 * Is MarkItDown actually importable, not merely configured?
 *
 * Checking the env var alone would be wrong in both directions: the hosted
 * deployment sets nothing yet has no Python at all, and a machine with Python
 * may still lack the package. Probed once per instance and cached — the answer
 * cannot change while the process lives.
 */
function probeDocumentEngine(): Promise<boolean> {
  documentEngine ??= new Promise<boolean>((resolve) => {
    const bin = process.env["P2MD_PYTHON_BIN"] ?? "python";
    let settled = false;
    const done = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    try {
      // find_spec locates the module without executing it. A real
      // `import markitdown` pulls in its whole dependency tree and takes
      // several seconds cold, which made an earlier version of this probe time
      // out and report "no document engine" on a machine that had one.
      const child = spawn(
        bin,
        ["-c", "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('markitdown') else 1)"],
        { stdio: "ignore" },
      );
      const timer = setTimeout(() => {
        child.kill();
        done(false);
      }, 10_000);
      child.on("error", () => {
        clearTimeout(timer);
        done(false);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        done(code === 0);
      });
    } catch {
      done(false);
    }
  });
  return documentEngine;
}

export async function GET(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, RATE_LIMIT_CHEAP);
  if (limited !== null) return limited;

  const [hasDocumentEngine] = await Promise.all([probeDocumentEngine()]);

  return NextResponse.json({
    // What changes the output a user gets.
    llmOptimizer: process.env["P2MD_LITELLM_BASE_URL"] !== undefined,
    documentEngine: hasDocumentEngine,
    highFidelityEngine: process.env["P2MD_DOCLING_URL"] !== undefined,
    durableStore: !storeIsEphemeral(),
    // What will be refused, so the studio can say so before a request is sent.
    limits: {
      maxInputChars: MAX_INPUT_CHARS,
      maxUploadBytes: MAX_UPLOAD_BYTES,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      rateLimit: {
        windowMs: RATE_LIMIT_WINDOW_MS,
        convertOrCompressPerWindow: RATE_LIMIT_EXPENSIVE,
        readsPerWindow: RATE_LIMIT_CHEAP,
        // Counters are per instance, so this is a floor, not a global ceiling.
        perInstanceOnly: rateLimitIsPerInstance(),
      },
    },
  });
}
