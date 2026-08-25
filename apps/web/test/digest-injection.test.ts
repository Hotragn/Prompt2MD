import { describe, expect, it } from "vitest";
import { generateDigest } from "../lib/digest";

/**
 * The digest renders text and URLs chosen by third parties (Hacker News,
 * Wikipedia, Spaceflight News) into a Markdown document that a scheduled job
 * commits to docs/digests/ and the site serves. That makes remote content an
 * untrusted input to a published artifact, so these cases feed the renderers
 * exactly what a hostile or compromised feed would.
 *
 * The browser preview sanitizes with DOMPurify, but the committed .md files and
 * every other consumer of them do not — which is why escaping has to happen
 * here, at the point the Markdown is built.
 */

const FIXED_DATE = new Date("2026-07-29T12:00:00Z");

/** A title that tries to close the link early and point somewhere else. */
const BREAKOUT_TITLE = "Cool story](javascript:alert(1)) [gotcha";

const HOSTILE_HN = {
  hits: [
    {
      title: BREAKOUT_TITLE,
      url: "javascript:alert(document.domain)",
      points: 1,
      num_comments: 0,
      objectID: "1&evil=2",
    },
    {
      // Newlines are the other half of the problem: this injects a heading and
      // a list item into the digest's structure, which bracket escaping alone
      // would not stop.
      title: "Innocent\n\n## Injected heading\n\n- injected item",
      url: "https://example.com/ok",
      points: 2,
      num_comments: 1,
      objectID: "2",
    },
  ],
};

const HOSTILE_WIKI = {
  tfa: {
    titles: { normalized: "Title](javascript:alert(2)) x" },
    extract: "Extract with ](javascript:alert(3)) inside it.",
    content_urls: { desktop: { page: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" } },
  },
  news: [
    {
      story: "Story <b>bold</b> with ](javascript:alert(4)) inside.",
      links: [{ content_urls: { desktop: { page: "vbscript:msgbox(1)" } } }],
    },
  ],
};

const HOSTILE_SNAPI = {
  results: [
    {
      title: "Launch](javascript:alert(5)) news",
      url: "javascript:alert(6)",
      summary: "Summary with ](javascript:alert(7)) and (parens).",
      news_site: "Site](x) Name",
    },
  ],
};

function hostileFetch(): typeof fetch {
  return (async (url: RequestInfo | URL) => {
    const u = String(url);
    const body = u.includes("hn.algolia.com")
      ? HOSTILE_HN
      : u.includes("spaceflightnewsapi")
        ? HOSTILE_SNAPI
        : HOSTILE_WIKI;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

describe("digest treats remote content as untrusted", () => {
  // The assertion is deliberately about link TARGETS, not about the string
  // "javascript:" appearing anywhere. A hostile title that mentions a scheme in
  // its text is harmless once escaped, and it still renders as prose — so a
  // blanket search would fail on correctly-escaped output and teach us nothing.
  // What must never exist is `](javascript:…)`: a scheme in target position.
  const linkTargets = (markdown: string): string[] =>
    [...markdown.matchAll(/\]\(([^)]*)\)/g)].map((m) => m[1] ?? "");

  it("never emits a dangerous scheme in link-target position", async () => {
    const { markdown } = await generateDigest({ fetchImpl: hostileFetch(), date: FIXED_DATE });
    const targets = linkTargets(markdown);

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target).toMatch(/^https?:\/\//);
      expect(target).not.toMatch(/^(?:javascript|data|vbscript|file):/i);
    }
  });

  it("neutralises a title that tries to close its own link", async () => {
    const { markdown } = await generateDigest({ fetchImpl: hostileFetch(), date: FIXED_DATE });

    // The brackets survive as escaped literal text, not as syntax...
    expect(markdown).toContain("\\]");
    // ...so the payload reads as prose and never as a target.
    expect(markdown).not.toContain("](javascript");
    // The headline text itself is preserved — escaping, not censoring.
    expect(markdown).toContain("Cool story");
  });

  it("does not let a title inject document structure", async () => {
    const { markdown } = await generateDigest({ fetchImpl: hostileFetch(), date: FIXED_DATE });

    // The only headings are the ones the digest itself writes.
    const headings = markdown.match(/^#{1,6} .*/gm) ?? [];
    expect(headings.some((h) => h.includes("Injected heading"))).toBe(false);
    // The text is still present -- escaped and flattened, not dropped.
    expect(markdown).toContain("Injected heading");
  });

  it("falls back to a safe link target rather than dropping the item", async () => {
    const { markdown } = await generateDigest({ fetchImpl: hostileFetch(), date: FIXED_DATE });

    // The HN item keeps its discussion link as the fallback, so a hostile `url`
    // costs the reader nothing.
    expect(markdown).toMatch(/news\.ycombinator\.com\/item\?id=/);
    // objectID is interpolated into a URL we build, so it must be encoded.
    expect(markdown).not.toContain("id=1&evil=2");
  });

  it("still renders ordinary content unescaped where it is safe to", async () => {
    const benign = {
      hits: [
        {
          title: "A perfectly normal headline",
          url: "https://example.com/a",
          points: 10,
          num_comments: 3,
          objectID: "9",
        },
      ],
    };
    const fetchImpl = (async (url: RequestInfo | URL) =>
      String(url).includes("hn.algolia.com")
        ? new Response(JSON.stringify(benign), { status: 200 })
        : new Response("{}", { status: 500 })) as typeof fetch;

    const { markdown } = await generateDigest({ fetchImpl, date: FIXED_DATE });

    // No stray backslashes in a headline that never needed escaping -- the
    // escape is narrow on purpose, so ordinary hyphens and asterisks survive.
    expect(markdown).toContain("[A perfectly normal headline](https://example.com/a)");
  });
});
