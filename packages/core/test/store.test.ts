import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStore, formatAnchor, parseAnchor, sweepExpired } from "../src/store.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "p2md-store-"));
}

async function tempStore() {
  return createFileStore(await tempDir());
}

describe("original store", () => {
  it("round-trips text and spans", async () => {
    const store = await tempStore();
    const text = "The quick brown fox jumps over the lazy dog.";
    const id = await store.put(text, "test");

    expect((await store.get(id))?.text).toBe(text);
    expect(await store.getSpan(id, 4, 19)).toBe("quick brown fox");
  });

  it("is content-addressed and idempotent", async () => {
    const store = await tempStore();
    const a = await store.put("same content");
    const b = await store.put("same content");
    expect(a).toBe(b);
  });

  it("rejects malformed source ids (path traversal guard)", async () => {
    const store = await tempStore();
    expect(await store.get("../../etc/passwd")).toBeUndefined();
    expect(await store.get("unknown")).toBeUndefined();
  });

  it("returns undefined for unknown ids and invalid spans", async () => {
    const store = await tempStore();
    const id = await store.put("abc");
    expect(await store.get("0123456789abcdef")).toBeUndefined();
    expect(await store.getSpan(id, 5, 2)).toBeUndefined();
  });
});

describe("retention", () => {
  it("keeps records forever when no TTL is configured", async () => {
    // The local-CLI default. A store that quietly forgot the operator's own
    // documents would break losslessness for the one person who is not a risk.
    const store = await tempStore();
    const id = await store.put("keep me");
    const record = await store.get(id);
    expect(record?.expiresAt).toBeUndefined();
  });

  it("stamps an expiry when a TTL is configured", async () => {
    const store = createFileStore(await tempDir(), { ttlMs: 7 * 24 * 60 * 60 * 1000 });
    const record = await store.get(await store.put("bounded"));
    expect(record?.expiresAt).toBeDefined();
    const ms = Date.parse(record!.expiresAt!) - Date.parse(record!.createdAt);
    expect(ms).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
  });

  it("treats an expired record as absent, through every read path", async () => {
    // Negative TTL is rejected by the option guard, so expire by writing the
    // stamp directly — which also covers a record left behind by an earlier
    // deployment with a shorter window.
    const dir = await tempDir();
    const store = createFileStore(dir);
    const id = await store.put("expired content");

    const file = join(dir, `${id}.json`);
    const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    await writeFile(file, JSON.stringify({ ...record, expiresAt: "2000-01-01T00:00:00.000Z" }));

    // A fresh store, so nothing is served from the writer's warm cache.
    const reader = createFileStore(dir);
    expect(await reader.get(id)).toBeUndefined();
    expect(await reader.getSpan(id, 0, 5)).toBeUndefined();
  });

  it("does not serve an expired record from the in-memory cache", async () => {
    // The cache is the bug this guards: a TTL enforced on disk and ignored in
    // memory would keep serving an expired document for the process lifetime.
    const store = createFileStore(await tempDir(), { ttlMs: 1 });
    const id = await store.put("short-lived");
    await new Promise((r) => setTimeout(r, 20));
    expect(await store.get(id)).toBeUndefined();
  });

  it("restarts the window when the same content is submitted again", async () => {
    // Content-addressing means a re-submission lands on the same id. It is
    // still new activity, so it must not inherit the first copy's expiry.
    const store = createFileStore(await tempDir(), { ttlMs: 60_000 });
    const first = await store.get(await store.put("same text"));
    await new Promise((r) => setTimeout(r, 10));
    const second = await store.get(await store.put("same text"));
    expect(Date.parse(second!.expiresAt!)).toBeGreaterThan(Date.parse(first!.expiresAt!));
  });

  it("sweepExpired removes expired files and leaves live ones", async () => {
    // A TTL enforced only on read bounds what is *served*, not what is *kept*.
    const dir = await tempDir();
    const store = createFileStore(dir);
    const live = await store.put("still good");
    const dead = await store.put("long gone");

    const file = join(dir, `${dead}.json`);
    const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    await writeFile(file, JSON.stringify({ ...record, expiresAt: "2000-01-01T00:00:00.000Z" }));

    expect(await sweepExpired(dir)).toBe(1);
    const left = await readdir(dir);
    expect(left).toContain(`${live}.json`);
    expect(left).not.toContain(`${dead}.json`);
  });
});

describe("deletion", () => {
  it("removes a record and reports whether one existed", async () => {
    const store = await tempStore();
    const id = await store.put("delete me");

    expect(await store.delete(id)).toBe(true);
    expect(await store.get(id)).toBeUndefined();
    // Idempotent: a second delete is a no-op, not an error.
    expect(await store.delete(id)).toBe(false);
  });

  it("refuses malformed ids rather than building a path from them", async () => {
    const store = await tempStore();
    expect(await store.delete("../../etc/passwd")).toBe(false);
    expect(await store.delete("nope")).toBe(false);
  });
});

describe("source anchors", () => {
  it("format/parse round-trip", () => {
    const anchor = { sourceId: "abcdef0123456789", start: 120, end: 456 };
    expect(parseAnchor(formatAnchor(anchor))).toEqual(anchor);
  });

  it("parses anchors embedded in surrounding markdown", () => {
    const md = "summary text…\n<!-- p2md:src=abcdef0123456789#0-99 -->\nmore";
    expect(parseAnchor(md)).toEqual({ sourceId: "abcdef0123456789", start: 0, end: 99 });
  });

  it("returns undefined for junk", () => {
    expect(parseAnchor("no anchor here")).toBeUndefined();
  });
});
