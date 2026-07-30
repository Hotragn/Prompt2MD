import { NextResponse } from "next/server";
import type { Fidelity, SourceInput } from "@prompt2md/core";
import { createRuntimeFromEnv, type CompressResult } from "@prompt2md/hermes-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rt = createRuntimeFromEnv();

type Provider = "anthropic" | "openai" | "gemini" | "kimi";

interface ConvertParams {
  readonly input: SourceInput;
  readonly tokenBudget?: number;
  readonly fidelity?: Fidelity;
  readonly provider?: Provider;
}

const FIDELITIES = new Set(["auto", "fast", "high"]);
const PROVIDERS = new Set(["anthropic", "openai", "gemini", "kimi"]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function parseRequest(req: Request): Promise<ConvertParams | { error: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return { error: "multipart requests need a `file` field" };
    if (file.size > MAX_UPLOAD_BYTES) return { error: `file exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB upload limit` };
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

  let body: { text?: string; tokenBudget?: number; fidelity?: Fidelity; provider?: Provider };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return { error: "invalid JSON body" };
  }
  if (body.text === undefined || body.text.trim() === "") {
    return { error: "text is required" };
  }
  return {
    input: { kind: "text", text: body.text },
    ...(body.tokenBudget !== undefined ? { tokenBudget: body.tokenBudget } : {}),
    ...(body.fidelity !== undefined ? { fidelity: body.fidelity } : {}),
    ...(body.provider !== undefined ? { provider: body.provider } : {}),
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  const params = await parseRequest(req);
  if ("error" in params) return NextResponse.json({ error: params.error }, { status: 400 });

  try {
    const outcome = await rt.convert(params.input, {
      fidelity: params.fidelity ?? "auto",
      ...(params.tokenBudget !== undefined ? { tokenBudget: params.tokenBudget } : {}),
    });

    let markdown = outcome.markdown;
    let compressed: CompressResult | undefined;
    if (params.tokenBudget !== undefined && outcome.report.outputTokens > params.tokenBudget) {
      compressed = await rt.compress(markdown, {
        tokenBudget: params.tokenBudget,
        ...(params.provider !== undefined ? { provider: params.provider } : {}),
      });
      markdown = compressed.markdown;
    }

    return NextResponse.json({
      markdown,
      report: outcome.report,
      decision: outcome.decision,
      warnings: [...outcome.doc.warnings, ...(compressed?.doc.warnings ?? [])],
      ...(compressed !== undefined ? { savings: compressed.savings, sourceId: compressed.sourceId } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "conversion failed" },
      { status: 500 },
    );
  }
}
