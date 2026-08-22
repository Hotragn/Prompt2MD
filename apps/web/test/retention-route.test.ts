import { beforeEach, describe, expect, it } from "vitest";
import { POST as compressPOST } from "../app/api/compress/route";
import { DELETE as retrieveDELETE, GET as retrieveGET } from "../app/api/retrieve/route";
import { GET as capabilitiesGET } from "../app/api/capabilities/route";
import { resetRateLimits } from "../lib/rate-limit";

/**
 * Retention and withdrawal, end to end through the real routes.
 *
 * The store-level tests prove expiry and deletion work. These prove the studio
 * actually exposes them — a TTL nothing calls and a delete no route reaches are
 * both just comments.
 */

let seq = 0;
/** A distinct caller per case, so one test's requests never spend another's budget. */
const ip = (): string => `10.0.0.${(seq++ % 200) + 1}`;

async function storeSomething(text: string): Promise<string> {
  const res = (await compressPOST(
    new Request("http://test/api/compress", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": ip() },
      body: JSON.stringify({ text, tokenBudget: 50 }),
    }),
  )) as unknown as Response;
  const body = (await res.json()) as { sourceId?: string };
  expect(body.sourceId, "compress must return a sourceId to retrieve by").toBeDefined();
  return body.sourceId!;
}

const retrieve = (ref: string): Promise<Response> =>
  retrieveGET(
    new Request(`http://test/api/retrieve?ref=${encodeURIComponent(ref)}`, {
      headers: { "x-real-ip": ip() },
    }),
  ) as unknown as Promise<Response>;

const remove = (ref: string): Promise<Response> =>
  retrieveDELETE(
    new Request(`http://test/api/retrieve?ref=${encodeURIComponent(ref)}`, {
      method: "DELETE",
      headers: { "x-real-ip": ip() },
    }),
  ) as unknown as Promise<Response>;

beforeEach(() => {
  resetRateLimits();
});

describe("DELETE /api/retrieve", () => {
  it("withdraws a stored original so it no longer resolves", async () => {
    const sourceId = await storeSomething("A document someone pasted by mistake, with detail.");
    expect((await retrieve(sourceId)).status).toBe(200);

    const deleted = await remove(sourceId);
    expect(deleted.status).toBe(200);
    expect(((await deleted.json()) as { deleted: boolean }).deleted).toBe(true);

    expect((await retrieve(sourceId)).status).toBe(404);
  });

  it("is idempotent: deleting twice succeeds and reports nothing was there", async () => {
    const sourceId = await storeSomething("Another document, long enough to store properly.");
    await remove(sourceId);

    const again = await remove(sourceId);
    expect(again.status).toBe(200);
    expect(((await again.json()) as { deleted: boolean }).deleted).toBe(false);
  });

  it("rejects a malformed ref before reaching the store", async () => {
    for (const evil of ["../../etc/passwd", "nope", ""]) {
      expect((await remove(evil)).status).toBe(400);
    }
  });

  it("accepts a full p2md:src anchor, not just a bare id", async () => {
    // Anchors are what appear in compressed Markdown, so they are what a user
    // copies. Requiring them to extract the id by hand would not be a feature.
    const sourceId = await storeSomething("Yet another stored document with enough body text.");
    const res = await remove(`<!-- p2md:src=${sourceId}#0-10 -->`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { sourceId: string }).sourceId).toBe(sourceId);
  });
});

describe("retention is disclosed, not just enforced", () => {
  it("capabilities states the window and that an id is a bearer token", async () => {
    const res = (await capabilitiesGET(
      new Request("http://test/api/capabilities", { headers: { "x-real-ip": ip() } }),
    )) as unknown as Response;
    const caps = (await res.json()) as {
      retention?: { days: number; idIsBearerToken: boolean; deletable: boolean };
    };

    expect(caps.retention).toBeDefined();
    expect(caps.retention!.days).toBeGreaterThan(0);
    // Both of these are promises the UI makes to the user on the strength of
    // this payload. If either stops being true, the UI starts lying.
    expect(caps.retention!.idIsBearerToken).toBe(true);
    expect(caps.retention!.deletable).toBe(true);
  }, 15_000);

  it("a 404 explains expiry rather than implying data loss", async () => {
    const res = await retrieve("0123456789abcdef");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; retentionDays: number };
    expect(body.retentionDays).toBeGreaterThan(0);
    expect(body.error).toMatch(/days|temporar/i);
  });
});
