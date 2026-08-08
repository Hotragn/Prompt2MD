import { NextResponse } from "next/server";
import { enforceRateLimit } from "../../../lib/guard";
import { RATE_LIMIT_CHEAP } from "../../../lib/rate-limit";
import { getRuntime } from "../../../lib/runtime";
import { getDailyDigest } from "../../../lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, RATE_LIMIT_CHEAP);
  if (limited !== null) return limited;

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const digest = await getDailyDigest({ store: getRuntime().store, refresh });
    return NextResponse.json(digest);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "digest generation failed" },
      { status: 502 },
    );
  }
}
