import { NextResponse } from "next/server";
import { createRuntimeFromEnv, parseAnchor } from "@prompt2md/hermes-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rt = createRuntimeFromEnv();

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  if (ref === null || ref === "") {
    return NextResponse.json({ error: "ref query param is required (anchor or sourceId)" }, { status: 400 });
  }

  const anchor = parseAnchor(ref);
  const sourceId = anchor?.sourceId ?? (/^[0-9a-f]{16}$/.test(ref) ? ref : undefined);
  if (sourceId === undefined) {
    return NextResponse.json({ error: "ref must be a p2md:src anchor or a 16-hex sourceId" }, { status: 400 });
  }

  const text =
    anchor !== undefined
      ? await rt.store.getSpan(sourceId, anchor.start, anchor.end)
      : (await rt.store.get(sourceId))?.text;

  if (text === undefined) {
    return NextResponse.json({ error: `no original stored for ${sourceId}` }, { status: 404 });
  }
  return NextResponse.json({ text });
}
