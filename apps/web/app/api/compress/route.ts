import { NextResponse } from "next/server";
import {
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

interface CompressBody {
  readonly text?: string;
  readonly tokenBudget?: number;
  readonly provider?: "anthropic" | "openai" | "gemini" | "kimi";
}

export async function POST(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, RATE_LIMIT_EXPENSIVE);
  if (limited !== null) return limited;

  const parsed = await readJsonBody<CompressBody>(req);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const text = checkText(parsed.body.text);
  if ("error" in text) return NextResponse.json({ error: text.error }, { status: text.status });

  const budget = parsed.body.tokenBudget;
  if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
    return NextResponse.json({ error: "tokenBudget must be a positive integer" }, { status: 400 });
  }

  try {
    const result = await withDeadline(
      getRuntime().compress(text.text, {
        tokenBudget: Math.floor(budget),
        ...(parsed.body.provider !== undefined ? { provider: parsed.body.provider } : {}),
      }),
      "compression",
    );
    return NextResponse.json({
      markdown: result.markdown,
      savings: result.savings,
      sourceId: result.sourceId,
      ephemeralStore: storeIsEphemeral(),
      warnings: result.doc.warnings,
    });
  } catch (err) {
    return errorResponse(err, "compression failed");
  }
}
