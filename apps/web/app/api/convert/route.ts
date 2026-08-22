import { NextResponse } from "next/server";
import type { Fidelity, SourceInput } from "@prompt2md/core";
import type { CompressResult } from "@prompt2md/core";
import {
  MAX_UPLOAD_BYTES,
  checkText,
  enforceRateLimit,
  errorResponse,
  readJsonBody,
  withDeadline,
} from "../../../lib/guard";
import { RATE_LIMIT_EXPENSIVE } from "../../../lib/rate-limit";
import { getRuntime, storeIsEphemeral } from "../../../lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


type Provider = "anthropic" | "openai" | "gemini" | "kimi";

interface ConvertParams {
  readonly input: SourceInput;
  readonly tokenBudget?: number;
  readonly fidelity?: Fidelity;
  readonly provider?: Provider;
}

const FIDELITIES = new Set(["auto", "fast", "high"]);
const PROVIDERS = new Set(["anthropic", "openai", "gemini", "kimi"]);

async function parseRequest(req: Request): Promise<ConvertParams | { error: string; status: number }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return { error: "multipart requests need a `file` field", status: 400 };
    if (file.size > MAX_UPLOAD_BYTES) return { error: `file exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB upload limit`, status: 413 };
    const budgetRaw = form.get("tokenBudget");
    const fidelityRaw = String(form.get("fidelity") ?? "");
    const providerRaw = String(form.get("provider") ?? "");
    const budget = budgetRaw !== null ? Number.parseInt(String(budgetRaw), 10) : Number.NaN;
    return {
      input: { kind: "buffer", data: new Uint8Array(await file.arrayBuffer()), filename: file.name },
      ...(Number.isFinite(budget) && budget > 0 ? { tokenBudget: budget } : {}),
      ...(FIDELITIES.has(fidelityRaw) ? { fidelity: fidelityRaw as Fidelity } : {}),
      ...(PROVIDERS.has(providerRaw) ? { provider: providerRaw as Provider } : {}),
    };
  }

  type Body = { text?: string; tokenBudget?: number; fidelity?: Fidelity; provider?: Provider };
  const parsed = await readJsonBody<Body>(req);
  if ("error" in parsed) return { error: parsed.error, status: parsed.status };

  const text = checkText(parsed.body.text);
  if ("error" in text) return { error: text.error, status: text.status };

  return {
    input: { kind: "text", text: text.text },
    ...(parsed.body.tokenBudget !== undefined ? { tokenBudget: parsed.body.tokenBudget } : {}),
    ...(parsed.body.fidelity !== undefined ? { fidelity: parsed.body.fidelity } : {}),
    ...(parsed.body.provider !== undefined ? { provider: parsed.body.provider } : {}),
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  // First, before the body is read. This is the most expensive route in the
  // app — 25MB uploads, the full pipeline, a 45s deadline — and it was the only
  // one not counting requests, while /api/capabilities advertised a limit for
  // it. Parsing a 25MB body to then reject it does the work anyway.
  const limited = enforceRateLimit(req, RATE_LIMIT_EXPENSIVE);
  if (limited !== null) return limited;

  const params = await parseRequest(req);
  if ("error" in params) return NextResponse.json({ error: params.error }, { status: params.status });

  try {
    const outcome = await withDeadline(
      getRuntime().convert(params.input, {
        fidelity: params.fidelity ?? "auto",
        ...(params.tokenBudget !== undefined ? { tokenBudget: params.tokenBudget } : {}),
      }),
      "conversion",
    );

    let markdown = outcome.markdown;
    let compressed: CompressResult | undefined;
    if (params.tokenBudget !== undefined && outcome.report.outputTokens > params.tokenBudget) {
      const attempt = await getRuntime().compress(markdown, {
        tokenBudget: params.tokenBudget,
        ...(params.provider !== undefined ? { provider: params.provider } : {}),
      });
      // Compression exists to shrink output — never adopt it if, on this
      // input, it didn't (e.g. a prompt already too small for the anchor/
      // cache-layout overhead to pay for itself).
      if (attempt.savings.compressedTokens < outcome.report.outputTokens) {
        compressed = attempt;
        markdown = attempt.markdown;
      }
    }

    return NextResponse.json({
      markdown,
      report: outcome.report,
      decision: outcome.decision,
      warnings: [...outcome.doc.warnings, ...(compressed?.doc.warnings ?? [])],
      ...(compressed !== undefined
        ? {
            savings: compressed.savings,
            sourceId: compressed.sourceId,
            ephemeralStore: storeIsEphemeral(),
          }
        : {}),
    });
  } catch (err) {
    return errorResponse(err, "conversion failed");
  }
}
