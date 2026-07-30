import { NextResponse } from "next/server";
import { createRuntimeFromEnv } from "@prompt2md/hermes-mcp";
import { getDailyDigest } from "../../../lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rt = createRuntimeFromEnv();

export async function GET(req: Request): Promise<NextResponse> {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const digest = await getDailyDigest({ store: rt.store, refresh });
    return NextResponse.json(digest);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "digest generation failed" },
      { status: 502 },
    );
  }
}
