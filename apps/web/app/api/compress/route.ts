import { NextResponse } from "next/server";
import { getRuntime } from "../../../lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


interface CompressBody {
  readonly text?: string;
  readonly tokenBudget?: number;
  readonly provider?: "anthropic" | "openai" | "gemini" | "kimi";
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: CompressBody;
  try {
    body = (await req.json()) as CompressBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.text === undefined || body.text.trim() === "") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (body.tokenBudget === undefined || body.tokenBudget <= 0) {
    return NextResponse.json({ error: "tokenBudget must be a positive integer" }, { status: 400 });
  }

  try {
    const result = await getRuntime().compress(body.text, {
      tokenBudget: Math.floor(body.tokenBudget),
      ...(body.provider !== undefined ? { provider: body.provider } : {}),
    });
    return NextResponse.json({
      markdown: result.markdown,
      savings: result.savings,
      sourceId: result.sourceId,
      warnings: result.doc.warnings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "compression failed" },
      { status: 500 },
    );
  }
}
