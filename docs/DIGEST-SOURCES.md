# Daily Digest — Source Map & Vetting Checklist

The digest only uses sources that pass **every** item on this checklist. The
map below grows over time (candidates come from
[public-apis/public-apis](https://github.com/public-apis/public-apis)); add a
row only after completing the checklist and a code review of the adapter.

## Vetting checklist (all required)

1. **No key / free tier** with terms that permit automated daily access.
2. **ToS permits republishing** headlines/excerpts with attribution and links
   to originals (we never mirror full content).
3. **Explicit license or API terms on record** — link it in the table.
4. **Rate limits documented** and our usage (1 call/day/source) is far below.
5. **Attribution rendered** in the digest footer, with links to originals.
6. **Failure isolation** — the adapter degrades to a note; it can never take
   the digest down (enforced by `generateDigest`, tested).
7. **No personal data** collected or stored.

## Active source map

| Source | Endpoint | License / terms | Rate limit | Added |
|---|---|---|---|---|
| Hacker News front page | `hn.algolia.com/api/v1/search?tags=front_page` | [Algolia HN API](https://hn.algolia.com/api) — free, attribution appreciated | 10k req/h (we use 1/day) | 2026-07-29 |
| Wikipedia featured feed | `api.wikimedia.org/feed/v1/wikipedia/en/featured/{y}/{m}/{d}` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); [Wikimedia API terms](https://api.wikimedia.org/wiki/Terms_of_Use) | 200 req/h anonymous (we use 1/day) | 2026-07-29 |

## Vetted candidates (next up)

| Source | Endpoint | Notes |
|---|---|---|
| GDELT DOC 2.0 | `api.gdeltproject.org/api/v2/doc/doc` | Free, no key; needs relevance filtering before it earns a section |
| Spaceflight News API | `api.spaceflightnewsapi.net/v4/articles` | Free, no key, CC-licensed summaries |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | Free non-commercial, no key; would add a local-weather line (needs user locale opt-in first) |

## Operating it daily

- **On demand (default):** the studio's Digest tab (or `GET /api/digest`)
  generates at most once per UTC day and caches to `apps/web/data/digests/`.
- **Scheduled locally:** any scheduler hitting the endpoint works, e.g.
  Windows Task Scheduler / cron running
  `curl -s http://localhost:3100/api/digest > NUL`.
- **Scheduled in CI (after the repo is on GitHub):** a workflow on
  `schedule: cron "0 13 * * *"` can hit the deployed endpoint or run the
  generator and commit the dated markdown for an archive page.

## Losslessness

Raw API payloads are stored content-addressed before any transformation —
each digest carries a `sourceId`, and `retrieve_original` (or
`GET /api/retrieve?ref=<sourceId>`) returns the exact bytes the digest was
built from.
