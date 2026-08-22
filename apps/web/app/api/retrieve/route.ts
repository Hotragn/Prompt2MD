import { NextResponse } from "next/server";
import { parseAnchor } from "@prompt2md/core";
import { enforceRateLimit, errorResponse, withDeadline } from "../../../lib/guard";
import { RATE_LIMIT_CHEAP, RATE_LIMIT_EXPENSIVE } from "../../../lib/rate-limit";
import { RETENTION_DAYS, getRuntime, storeIsEphemeral } from "../../../lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve `?ref=` to a sourceId. Accepts a full `p2md:src` anchor or a bare
 * 16-hex id; anything else is rejected before it reaches the store.
 */
function resolveRef(req: Request):
  | { sourceId: string; anchor: ReturnType<typeof parseAnchor> }
  | { error: string } {
  const ref = new URL(req.url).searchParams.get("ref");
  if (ref === null || ref === "") {
    return { error: "ref query param is required (anchor or sourceId)" };
  }
  const anchor = parseAnchor(ref);
  const sourceId = anchor?.sourceId ?? (/^[0-9a-f]{16}$/.test(ref) ? ref : undefined);
  if (sourceId === undefined) {
    return { error: "ref must be a p2md:src anchor or a 16-hex sourceId" };
  }
  return { sourceId, anchor };
}

export async function GET(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, RATE_LIMIT_CHEAP);
  if (limited !== null) return limited;

  const ref = resolveRef(req);
  if ("error" in ref) return NextResponse.json({ error: ref.error }, { status: 400 });

  try {
    const text = await withDeadline(
      ref.anchor !== undefined
        ? getRuntime().store.getSpan(ref.sourceId, ref.anchor.start, ref.anchor.end)
        : getRuntime()
            .store.get(ref.sourceId)
            .then((r) => r?.text),
      "retrieval",
    );

    if (text === undefined) {
      // Three different reasons a valid id resolves to nothing, and the user
      // can act on a different thing in each case. Saying only "not found"
      // would read as data loss for the first two.
      return NextResponse.json(
        {
          error: storeIsEphemeral()
            ? `no original stored for ${ref.sourceId} on this instance. This deployment keeps originals ` +
              `in temporary per-instance storage, so they do not survive a restart. Run prompt2md ` +
              `locally, or set P2MD_STORE_DIR to durable storage, for retrieval you can rely on.`
            : RETENTION_DAYS > 0
              ? `no original stored for ${ref.sourceId}. This deployment keeps submitted documents for ` +
                `${RETENTION_DAYS} days, so an older anchor will have expired. Run prompt2md locally, ` +
                `where nothing expires, for retrieval you can rely on.`
              : `no original stored for ${ref.sourceId}`,
          ephemeralStore: storeIsEphemeral(),
          retentionDays: RETENTION_DAYS,
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ text, retentionDays: RETENTION_DAYS });
  } catch (err) {
    return errorResponse(err, "retrieval failed");
  }
}

/**
 * Delete a stored original on request.
 *
 * Retention alone bounds how long a document is exposed; it does not let
 * someone who pasted the wrong thing take it back. A store that holds whole
 * documents people submitted needs both, and the delete is the half a user can
 * actually reach for.
 *
 * Priced as EXPENSIVE rather than CHEAP: this one writes. Deleting is
 * deliberately not authenticated, for the same reason retrieval is not — the id
 * IS the capability here. That cuts both ways and is worth stating plainly: a
 * leaked id lets a stranger delete the record as well as read it. Between a
 * stranger destroying one recoverable-by-re-upload cached conversion and a user
 * having no way to withdraw a document they pasted by mistake, the second is
 * the worse failure.
 */
export async function DELETE(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, RATE_LIMIT_EXPENSIVE);
  if (limited !== null) return limited;

  const ref = resolveRef(req);
  if ("error" in ref) return NextResponse.json({ error: ref.error }, { status: 400 });

  try {
    const removed = await withDeadline(getRuntime().store.delete(ref.sourceId), "deletion");
    // 200 either way: idempotent by design, so a second delete is a success
    // with nothing to do rather than an error. `deleted` reports which it was.
    return NextResponse.json({ deleted: removed, sourceId: ref.sourceId });
  } catch (err) {
    return errorResponse(err, "deletion failed");
  }
}
