import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approxCounter } from "@prompt2md/core";
import type { OriginalStore } from "@prompt2md/core";

/**
 * Daily Digest (Epic 6): pulls from vetted, keyless public APIs and republishes
 * them as one token-optimized Markdown digest with an honest savings report.
 * Source vetting checklist + API map: docs/DIGEST-SOURCES.md. Each source is
 * best-effort — one failing feed degrades to a note, never a crash.
 */

export interface DigestSource {
  readonly name: string;
  readonly url: string;
  readonly license: string;
}

export interface DigestResult {
  readonly date: string;
  readonly markdown: string;
  readonly rawTokens: number;
  readonly digestTokens: number;
  readonly ratio: number;
  /** Raw payloads are stored losslessly; retrieve with this id. */
  readonly sourceId?: string;
  readonly generatedAt: string;
  readonly sources: readonly DigestSource[];
  readonly failures: readonly string[];
}

export interface DigestOptions {
  readonly date?: Date;
  readonly fetchImpl?: typeof fetch;
  readonly store?: OriginalStore;
  readonly cacheDir?: string;
  readonly refresh?: boolean;
}

/**
 * The bounds of one UTC day, in the two shapes these APIs ask for: epoch
 * seconds for Algolia's numericFilters, ISO instants for Spaceflight News.
 * Half-open [start, end) so a story timestamped exactly at midnight belongs to
 * one day rather than both.
 */
interface DayWindow {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly startIso: string;
  readonly endIso: string;
}

function utcDayWindow(date: Date): DayWindow {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const end = start + 86_400_000;
  return {
    startSeconds: Math.floor(start / 1000),
    endSeconds: Math.floor(end / 1000),
    startIso: new Date(start).toISOString(),
    endIso: new Date(end).toISOString(),
  };
}

/**
 * `day` undefined means "right now", which is the only thing the live front
 * page can mean: Algolia's front_page tag carries no history, so a run for an
 * earlier day cannot ask for it and get that day back. A backfill asks instead
 * for the stories timestamped inside that UTC day, ranked by Algolia's default
 * popularity ordering. That is the closest honest equivalent, and it is not the
 * same thing -- which is why the rendered heading changes with it.
 */
function hnSource(day: DayWindow | undefined): DigestSource {
  const license = "Public API; links lead to original discussions";
  if (day === undefined) {
    return {
      name: "Hacker News front page (Algolia API)",
      url: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10",
      license,
    };
  }
  const filter = encodeURIComponent(`created_at_i>=${day.startSeconds},created_at_i<${day.endSeconds}`);
  return {
    name: "Hacker News top stories of the day (Algolia API)",
    url: `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=10&numericFilters=${filter}`,
    license,
  };
}

function snapiSource(day: DayWindow | undefined): DigestSource {
  const base = "https://api.spaceflightnewsapi.net/v4/articles/?limit=5&ordering=-published_at";
  return {
    name: "Spaceflight News API",
    url:
      day === undefined
        ? base
        : `${base}&published_at_gte=${day.startIso}&published_at_lte=${day.endIso}`,
    license: "Free API; summaries attributed to their original news sites",
  };
}

function wikiSource(date: Date): DigestSource {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return {
    name: "Wikipedia featured feed",
    url: `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${y}/${m}/${d}`,
    license: "CC BY-SA 4.0 — attribution below",
  };
}

interface HnHit {
  readonly title?: string;
  readonly url?: string | null;
  readonly points?: number;
  readonly num_comments?: number;
  readonly objectID?: string;
}

interface SnapiArticle {
  readonly title?: string;
  readonly url?: string;
  readonly summary?: string;
  readonly news_site?: string;
}

interface WikiFeed {
  readonly tfa?: {
    readonly titles?: { readonly normalized?: string };
    readonly extract?: string;
    readonly content_urls?: { readonly desktop?: { readonly page?: string } };
  };
  readonly news?: readonly {
    readonly story?: string;
    readonly links?: readonly { readonly content_urls?: { readonly desktop?: { readonly page?: string } } }[];
  }[];
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: { "user-agent": "prompt2md-daily-digest (github: prompt2md)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hnSection(payload: unknown, backfilled: boolean): string {
  const hits = ((payload as { hits?: readonly HnHit[] }).hits ?? []).filter((h) => h.title);
  if (hits.length === 0) throw new Error("empty front page");
  const lines = hits.slice(0, 10).map((h) => {
    const link = h.url ?? `https://news.ycombinator.com/item?id=${h.objectID ?? ""}`;
    const discussion = `https://news.ycombinator.com/item?id=${h.objectID ?? ""}`;
    return `- [${h.title}](${link}) — ${h.points ?? 0} points, ${h.num_comments ?? 0} comments ([discussion](${discussion}))`;
  });
  // The heading has to describe what was actually fetched. A backfill never
  // saw a front page, so it must not call itself one.
  const heading = backfilled ? "## Hacker News top stories" : "## Hacker News front page";
  return `${heading}\n\n${lines.join("\n")}`;
}

function snapiSection(payload: unknown): string {
  const articles = ((payload as { results?: readonly SnapiArticle[] }).results ?? []).filter(
    (a) => a.title !== undefined && a.url !== undefined,
  );
  if (articles.length === 0) throw new Error("no articles returned");
  const lines = articles.slice(0, 5).map((a) => {
    const summary =
      a.summary !== undefined && a.summary.length > 0
        ? ` — ${a.summary.length > 180 ? `${a.summary.slice(0, 180).trimEnd()}…` : a.summary}`
        : "";
    const site = a.news_site !== undefined ? ` *(${a.news_site})*` : "";
    return `- [${a.title}](${a.url})${summary}${site}`;
  });
  return `## Space & science\n\n${lines.join("\n")}`;
}

function wikiSections(payload: unknown): string {
  const feed = payload as WikiFeed;
  const parts: string[] = [];

  const tfa = feed.tfa;
  if (tfa?.titles?.normalized !== undefined && tfa.extract !== undefined) {
    const extract = tfa.extract.length > 420 ? `${tfa.extract.slice(0, 420).trimEnd()}…` : tfa.extract;
    const page = tfa.content_urls?.desktop?.page;
    parts.push(
      `## Wikipedia — today's featured article\n\n**${tfa.titles.normalized}** — ${extract}${page !== undefined ? ` ([read more](${page}))` : ""}`,
    );
  }

  const news = (feed.news ?? [])
    .filter((n) => n.story !== undefined)
    .slice(0, 5)
    .map((n) => {
      const text = stripHtml(n.story ?? "");
      const link = n.links?.[0]?.content_urls?.desktop?.page;
      return `- ${text}${link !== undefined ? ` ([context](${link}))` : ""}`;
    });
  if (news.length > 0) {
    parts.push(`## In the news\n\n${news.join("\n")}`);
  }

  if (parts.length === 0) throw new Error("featured feed had no usable content");
  return parts.join("\n\n");
}

export async function generateDigest(options: DigestOptions = {}): Promise<DigestResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = new Date();
  const date = options.date ?? now;
  const dateKey = date.toISOString().slice(0, 10);
  // Only a run for today can ask the live sources for "now"; any earlier day
  // has to be addressed by timestamp window instead. See hnSource.
  const day = dateKey === now.toISOString().slice(0, 10) ? undefined : utcDayWindow(date);
  const hn = hnSource(day);
  const snapi = snapiSource(day);
  const wiki = wikiSource(date);
  const sources: DigestSource[] = [hn, wiki, snapi];

  const sections: string[] = [];
  const failures: string[] = [];
  const rawPayloads: string[] = [];

  const jobs: readonly [DigestSource, (payload: unknown) => string][] = [
    [hn, (p) => hnSection(p, day !== undefined)],
    [wiki, wikiSections],
    [snapi, snapiSection],
  ];
  for (const [source, render] of jobs) {
    try {
      const payload = await fetchJson(source.url, fetchImpl);
      rawPayloads.push(JSON.stringify(payload));
      sections.push(render(payload));
    } catch (err) {
      failures.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (sections.length === 0) {
    throw new Error(`all digest sources failed — ${failures.join("; ")}`);
  }

  const rawText = rawPayloads.join("\n\n");
  const sourceId = options.store !== undefined ? await options.store.put(rawText, `digest-${dateKey}`) : undefined;

  const attribution = [
    "---",
    "",
    `*Sources: [Hacker News](https://news.ycombinator.com) via the [Algolia HN API](https://hn.algolia.com/api) · [Wikipedia](https://en.wikipedia.org) featured content ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) · [Spaceflight News API](https://spaceflightnewsapi.net) (summaries attributed to their original news sites). All content belongs to its original authors — links lead to the originals.*`,
  ].join("\n");

  const notes =
    failures.length > 0 ? `\n\n> Note: ${failures.length} source(s) unavailable today: ${failures.join("; ")}` : "";

  const markdown = [`# Daily Digest — ${dateKey}`, ...sections, attribution].join("\n\n") + notes;

  const rawTokens = approxCounter.count(rawText);
  const digestTokens = approxCounter.count(markdown);

  return {
    date: dateKey,
    markdown,
    rawTokens,
    digestTokens,
    ratio: rawTokens > 0 ? digestTokens / rawTokens : 1,
    ...(sourceId !== undefined ? { sourceId } : {}),
    generatedAt: new Date().toISOString(),
    sources,
    failures,
  };
}

/**
 * Default cache dir. Serverless platforms (Vercel, Lambda) ship the deploy
 * bundle read-only and only allow writes under the OS temp dir, so prefer
 * that when set (P2MD_ON_SERVERLESS / VERCEL are both set by Vercel).
 */
function defaultCacheDir(): string {
  if (process.env["VERCEL"] !== undefined || process.env["P2MD_ON_SERVERLESS"] !== undefined) {
    return join(tmpdir(), "prompt2md", "digests");
  }
  return join(process.cwd(), "data", "digests");
}

/** Cached daily entry point: one generation per UTC day per cache dir. */
export async function getDailyDigest(options: DigestOptions = {}): Promise<DigestResult> {
  const cacheDir = options.cacheDir ?? defaultCacheDir();
  const dateKey = (options.date ?? new Date()).toISOString().slice(0, 10);
  const cachePath = join(cacheDir, `${dateKey}.json`);

  if (options.refresh !== true) {
    try {
      return JSON.parse(await readFile(cachePath, "utf8")) as DigestResult;
    } catch {
      // not cached yet
    }
  }

  const digest = await generateDigest(options);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, JSON.stringify(digest, null, 2), "utf8");
  return digest;
}
