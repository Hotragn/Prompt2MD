import { NextResponse } from "next/server";
import { parseAnchor } from "@prompt2md/core";
import { enforceRateLimit, errorResponse, withDeadline } from "../../../lib/guard";
import { RATE_LIMIT_CHEAP } from "../../../lib/rate-limit";
import { getRuntime, storeIsEphemeral } from "../../../lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, RATE_LIMIT_CHEAP);
  if (limited !== null) return limited;

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

  try {
    const text = await withDeadline(
      anchor !== undefined
        ? getRuntime().store.getSpan(sourceId, anchor.start, anchor.end)
        : getRuntime()
            .store.get(sourceId)
            .then((r) => r?.text),
      "retrieval",
    );

    if (text === undefined) {
      // On a serverless deployment the store lives in the instance's temp
      // directory, so a perfectly valid id stops resolving once that instance
      // goes away. Saying "not found" alone would look like data loss.
      return NextResponse.json(
        {
          error: storeIsEphemeral()
            ? `no original stored for ${sourceId} on this instance. This deployment keeps originals ` +
              `in temporary per-instance storage, so they do not survive a restart. Run prompt2md ` +
              `locally, or set P2MD_STORE_DIR to durable storage, for retrieval you can rely on.`
            : `no original stored for ${sourceId}`,
          ephemeralStore: storeIsEphemeral(),
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ text });
  } catch (err) {
    return errorResponse(err, "retrieval failed");
  }
}
