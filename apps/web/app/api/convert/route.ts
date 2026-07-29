import { NextResponse } from "next/server";
import type { Fidelity } from "@prompt2md/core";
import { createRuntimeFromEnv, type CompressResult } from "@prompt2md/hermes-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rt = createRuntimeFromEnv();

interface ConvertBody {
  readonly text?: string;
  readonly tokenBudget?: number;
  readonly fidelity?: Fidelity;
  readonly provider?: "anthropic" | "openai" | "gemini" | "kimi";
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: ConvertBody;
  try {
    body = (await req.json()) as ConvertBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.text === undefined || body.text.trim() === "") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const outcome = await rt.convert(
      { kind: "text", text: body.text },
      {
        fidelity: body.fidelity ?? "auto",
        ...(body.tokenBudget !== undefined ? { tokenBudget: body.tokenBudget } : {}),
      },
    );

    let markdown = outcome.markdown;
    let compressed: CompressResult | undefined;
    if (body.tokenBudget !== undefined && outcome.report.outputTokens > body.tokenBudget) {
      compressed = await rt.compress(markdown, {
        tokenBudget: body.tokenBudget,
        ...(body.provider !== undefined ? { provider: body.provider } : {}),
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
