import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStore } from "@prompt2md/core";
import { generateDigest, getDailyDigest } from "../lib/digest";

const HN_PAYLOAD = {
  hits: [
    { title: "Show HN: A tiny WASM runtime", url: "https://example.com/wasm", points: 312, num_comments: 98, objectID: "101" },
    { title: "Ask HN: Best paper you read this year?", url: null, points: 154, num_comments: 201, objectID: "102" },
  ],
};

const WIKI_PAYLOAD = {
  tfa: {
    titles: { normalized: "Aurora borealis" },
    extract: "An aurora is a natural light display in Earth's sky, predominantly seen in high-latitude regions.",
    content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Aurora" } },
  },
  news: [
    {
      story: "Scientists announce <b>fusion milestone</b> at the lab.",
      links: [{ content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Fusion_power" } } }],
    },
  ],
};

const SNAPI_PAYLOAD = {
  results: [
    {
      title: "New crew launches to the station",
      url: "https://example.com/launch",
      summary: "A four-person crew lifted off successfully this morning.",
      news_site: "SpaceNews",
    },
  ],
};

function fakeFetch(overrides: Partial<Record<"hn" | "wiki" | "snapi", () => Response>> = {}): {
  fetchImpl: typeof fetch;
  calls: string[];
} {
  const calls: string[] = [];
  const fetchImpl = (async (url: RequestInfo | URL) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("hn.algolia.com")) {
      return overrides.hn?.() ?? new Response(JSON.stringify(HN_PAYLOAD), { status: 200 });
    }
    if (u.includes("spaceflightnewsapi")) {
      return overrides.snapi?.() ?? new Response(JSON.stringify(SNAPI_PAYLOAD), { status: 200 });
    }
    return overrides.wiki?.() ?? new Response(JSON.stringify(WIKI_PAYLOAD), { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const FIXED_DATE = new Date("2026-07-29T12:00:00Z");

describe("daily digest generation", () => {
  it("builds a dated digest from all sources with attribution", async () => {
    const { fetchImpl } = fakeFetch();
    const digest = await generateDigest({ fetchImpl, date: FIXED_DATE });

    expect(digest.date).toBe("2026-07-29");
    expect(digest.markdown).toContain("# Daily Digest — 2026-07-29");
    expect(digest.markdown).toContain("[Show HN: A tiny WASM runtime](https://example.com/wasm)");
    // url-less HN posts link to the discussion instead
    expect(digest.markdown).toContain("https://news.ycombinator.com/item?id=102");
    expect(digest.markdown).toContain("**Aurora borealis**");
    expect(digest.markdown).toContain("[New crew launches to the station](https://example.com/launch)");
    expect(digest.markdown).toContain("*(SpaceNews)*");
    // raw HTML in stories is stripped, not rendered
    expect(digest.markdown).toContain("fusion milestone");
    expect(digest.markdown).not.toContain("<b>");
    expect(digest.markdown).toContain("CC BY-SA 4.0");
    expect(digest.failures).toEqual([]);
  });

  it("reports honest token savings vs the raw payloads", async () => {
    const { fetchImpl } = fakeFetch();
    const digest = await generateDigest({ fetchImpl, date: FIXED_DATE });
    expect(digest.rawTokens).toBeGreaterThan(0);
    expect(digest.digestTokens).toBeGreaterThan(0);
    expect(digest.ratio).toBeCloseTo(digest.digestTokens / digest.rawTokens);
  });

  it("stores raw payloads losslessly when given a store", async () => {
    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-digest-")));
    const { fetchImpl } = fakeFetch();
    const digest = await generateDigest({ fetchImpl, date: FIXED_DATE, store });

    expect(digest.sourceId).toMatch(/^[0-9a-f]{16}$/);
    const original = await store.get(digest.sourceId!);
    expect(original?.text).toContain("A tiny WASM runtime");
  });

  it("degrades to a note when one source fails, throws only when all fail", async () => {
    const oneDown = fakeFetch({ wiki: () => new Response("nope", { status: 503 }) });
    const digest = await generateDigest({ fetchImpl: oneDown.fetchImpl, date: FIXED_DATE });
    expect(digest.failures).toHaveLength(1);
    expect(digest.markdown).toContain("Hacker News front page");
    expect(digest.markdown).toContain("source(s) unavailable today");

    const allDown = fakeFetch({
      hn: () => new Response("nope", { status: 503 }),
      wiki: () => new Response("nope", { status: 503 }),
      snapi: () => new Response("nope", { status: 503 }),
    });
    await expect(generateDigest({ fetchImpl: allDown.fetchImpl, date: FIXED_DATE })).rejects.toThrow(
      /all digest sources failed/,
    );
  });

  it("caches one generation per day and refreshes on demand", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "p2md-digest-cache-"));
    const { fetchImpl, calls } = fakeFetch();

    await getDailyDigest({ fetchImpl, date: FIXED_DATE, cacheDir });
    const callsAfterFirst = calls.length;
    await getDailyDigest({ fetchImpl, date: FIXED_DATE, cacheDir });
    expect(calls.length).toBe(callsAfterFirst); // served from cache

    await getDailyDigest({ fetchImpl, date: FIXED_DATE, cacheDir, refresh: true });
    expect(calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
