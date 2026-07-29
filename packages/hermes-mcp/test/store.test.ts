import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStore, formatAnchor, parseAnchor } from "../src/store.js";

async function tempStore() {
  return createFileStore(await mkdtemp(join(tmpdir(), "p2md-store-")));
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
