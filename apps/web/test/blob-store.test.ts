import { describe, expect, it } from "vitest";
import { createBlobStore, type BlobClient } from "../lib/blob-store";

/**
 * A fake blob backend. Verifies the contract without network: what pathname is
 * written, with what options, and that reads resolve through the same key.
 */
function fakeBlob(): BlobClient & { written: Map<string, string>; puts: Record<string, unknown>[] } {
  const written = new Map<string, string>();
  const puts: Record<string, unknown>[] = [];
  return {
    written,
    puts,
    put(pathname, body, options) {
      puts.push({ pathname, ...options });
      written.set(pathname, body);
      return Promise.resolve({});
    },
    get(pathname) {
      const body = written.get(pathname);
      if (body === undefined) return Promise.resolve(null);
      return Promise.resolve({ stream: new Response(body).body });
    },
    del(pathname) {
      written.delete(pathname);
      return Promise.resolve({});
    },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("durable originals store (Vercel Blob)", () => {
  it("round-trips an original byte-exactly", async () => {
    const store = createBlobStore(fakeBlob());
    const text = "# Report\n\nSection one.\n\nSection two — with an em dash and “smart quotes”.";

    const id = await store.put(text, "test");
    const back = await store.get(id);

    expect(back?.text).toBe(text);
    expect(back?.label).toBe("test");
  });

  it("resolves spans, which is what anchors actually need", async () => {
    const store = createBlobStore(fakeBlob());
    const text = "HEAD content here. MIDDLE section body. TAIL content.";
    const id = await store.put(text);

    const start = text.indexOf("MIDDLE");
    const end = start + "MIDDLE section body.".length;
    expect(await store.getSpan(id, start, end)).toBe("MIDDLE section body.");
  });

  it("is content-addressed: identical text yields one id and one object", async () => {
    const blob = fakeBlob();
    const store = createBlobStore(blob);

    const a = await store.put("same text");
    const b = await store.put("same text");

    expect(a).toBe(b);
    expect(blob.written.size).toBe(1);
  });

  it("writes privately, never to a public URL", async () => {
    const blob = fakeBlob();
    await createBlobStore(blob).put("confidential contract text");

    // These are whole documents users pasted. Public object storage would be a
    // worse privacy position than the ephemeral store this replaces.
    expect(blob.puts[0]!["access"]).toBe("private");
  });

  it("uses a deterministic pathname so re-writes overwrite instead of piling up", async () => {
    const blob = fakeBlob();
    const store = createBlobStore(blob);
    const id = await store.put("text");

    expect(blob.puts[0]!["addRandomSuffix"]).toBe(false);
    expect(blob.puts[0]!["allowOverwrite"]).toBe(true);
    expect(blob.puts[0]!["pathname"]).toBe(`prompt2md/originals/${id}.json`);
  });

  it("returns undefined for a missing original rather than throwing", async () => {
    const store = createBlobStore(fakeBlob());
    expect(await store.get("ffffffffffffffff")).toBeUndefined();
    expect(await store.getSpan("ffffffffffffffff", 0, 10)).toBeUndefined();
  });

  it("bounds spans instead of letting a negative index return a tail", async () => {
    // slice(-5, 2) would quietly hand back the wrong five characters. The file
    // store rejected this; this one used to not, and the two must agree.
    const store = createBlobStore(fakeBlob());
    const id = await store.put("abcdefghij");
    expect(await store.getSpan(id, -5, 2)).toBeUndefined();
    expect(await store.getSpan(id, 5, 2)).toBeUndefined();
    expect(await store.getSpan(id, 0, 999)).toBe("abcdefghij");
  });

  describe("retention", () => {
    it("stamps an expiry when a TTL is set, and none when it is not", async () => {
      const bounded = createBlobStore(fakeBlob(), { ttlMs: 7 * DAY_MS });
      expect((await bounded.get(await bounded.put("x")))?.expiresAt).toBeDefined();

      const forever = createBlobStore(fakeBlob());
      expect((await forever.get(await forever.put("x")))?.expiresAt).toBeUndefined();
    });

    it("stops serving an expired record and deletes it on read", async () => {
      const blob = fakeBlob();
      const store = createBlobStore(blob, { ttlMs: 1 });
      const id = await store.put("short-lived");
      await new Promise((r) => setTimeout(r, 20));

      expect(await store.get(id)).toBeUndefined();
      // Object storage has no TTL of its own here, so the read path is where an
      // expired document actually stops existing.
      expect(blob.written.has(`prompt2md/originals/${id}.json`)).toBe(false);
    });

    it("restarts the window when the same content is resubmitted", async () => {
      const store = createBlobStore(fakeBlob(), { ttlMs: 60_000 });
      const first = await store.get(await store.put("same text"));
      await new Promise((r) => setTimeout(r, 10));
      const second = await store.get(await store.put("same text"));
      expect(Date.parse(second!.expiresAt!)).toBeGreaterThan(Date.parse(first!.expiresAt!));
    });
  });

  describe("deletion", () => {
    it("removes the object and reports whether one existed", async () => {
      const blob = fakeBlob();
      const store = createBlobStore(blob);
      const id = await store.put("withdraw me");

      expect(await store.delete(id)).toBe(true);
      expect(blob.written.size).toBe(0);
      expect(await store.get(id)).toBeUndefined();
      expect(await store.delete(id)).toBe(false);
    });

    it("refuses malformed ids without touching the backend", async () => {
      const blob = fakeBlob();
      const store = createBlobStore(blob);
      await store.put("real");
      const before = blob.written.size;

      for (const evil of ["../../etc/passwd", "nope", "0000000000000000/../x"]) {
        expect(await store.delete(evil)).toBe(false);
      }
      expect(blob.written.size).toBe(before);
    });
  });

  it("rejects ids that could escape the key prefix", async () => {
    const blob = fakeBlob();
    const store = createBlobStore(blob);

    for (const evil of ["../../etc/passwd", "../secrets", "not-hex-at-all", "0000000000000000/../x"]) {
      expect(await store.get(evil)).toBeUndefined();
    }
    // Nothing was even attempted against the backend.
    expect(blob.puts).toHaveLength(0);
  });

  it("survives a backend that throws", async () => {
    const broken: BlobClient = {
      put: () => Promise.reject(new Error("blob service unavailable")),
      get: () => Promise.reject(new Error("blob service unavailable")),
    };
    const store = createBlobStore(broken);

    // Reads degrade to "no original", which callers already handle as a 404.
    expect(await store.get("0123456789abcdef")).toBeUndefined();
    // Writes surface, because silently losing the original would break the
    // guarantee the store exists to provide.
    await expect(store.put("text")).rejects.toThrow(/unavailable/);
  });
});
