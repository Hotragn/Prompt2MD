# Roadmap — Agile Epics

Sprint cadence: 1-week sprints; each HITL checkpoint closes an epic. Board columns:
Backlog → In Progress → Review (HITL) → Done.

## Epic 1 — Blueprint & fixtures (Phase 1) ✅ done (Checkpoint 1 approved)
Turborepo scaffold, ARCHITECTURE.md, ADR-001, 6-case golden corpus, engine +
competitor research.

## Epic 2 — Core engine (Phase 2) ✅ done (Checkpoint 2 approved)
Strict TS interfaces (`MarkdownDoc` IR, `Engine`, `SniffReport`, `TokenReport`),
LiteLLM gateway factory, content-probe router, MarkItDown subprocess adapter,
docling-serve adapter, golden-fixture conformance tests (44). ADR-002 (probe
thresholds & escalation heuristics).

## Epic 3 — Hermes MCP (Phase 3) ✅ done (Checkpoint 3 approved)
MCP server: `convert`, `compress_context`, `retrieve_original`; 4-phase
compression; cache-alignment profiles per provider; 27 tests incl. in-memory
MCP client integration. ADR-003 (token-savings math). Still open from this
epic: round-trip QA eval harness (LLM judge) — folded into Epic 7.

## Epic 4 — Interfaces (Phase 4) ✅ done (Checkpoint 4 approved)
Commander.js CLI (convert/batch/compress/retrieve/doctor), `/prompt2md` skill
definition + validator. Still open: `watch` mode, npm publish pipeline —
folded into Epic 7.

## Epic 5 — Web app & UX 🔨 in progress
✅ Shipped: Next.js studio (Convert/Compress/Daily Digest tabs, token stats +
savings meter, warning surfacing, sample loaders, API routes over the shared
runtime), brand identity (logo, icon, "A Markdown Magic" tagline),
graceful-degradation UX, file upload + drag-drop (text formats client-side,
PDF/Office server-side through the engines), rendered markdown preview
(sanitized), voice (Web Speech dictation + TTS readback).
Remaining: design-system pass (claudedesignskills, impeccable), Blender 3D
brand artifacts.

## Epic 6 — Daily Digest (live-data demo) ✅ v1 shipped
✅ Shipped: digest engine (apps/web/lib/digest.ts) pulling vetted keyless APIs
(Hacker News/Algolia + Wikipedia featured feed), per-source failure isolation,
once-per-day cache, honest raw-vs-digest token report (measured live:
~52k raw tokens → ~0.9k digest, 2%), lossless raw-payload storage with
retrievable sourceId, attribution footer, studio tab + /api/digest, source
vetting checklist + API map (docs/DIGEST-SOURCES.md), 5 unit tests + live E2E.
Also shipped: third vetted source (Spaceflight News API), the daily scheduled
workflow (.github/workflows/digest.yml, 13:00 UTC) committing dated entries to
docs/digests/ with an archive index on the docs site, and the document
boilerplate OPTIMIZE pass so every conversion is clean without a budget flag.
Remaining: more vetted sources (GDELT, Open-Meteo).

## Epic 7 — Quality & release engineering 🔨 in progress
✅ Shipped: Vitest unit + golden tests (90+), Selenium WebDriver E2E (studio
flows incl. lossless retrieve, headless Chrome/Edge), GitHub Actions CI
(Linux/Windows × Node 20/22 + e2e job), SECURITY/CODE_OF_CONDUCT/CONTRIBUTING,
VitePress docs site (apps/docs, built from /docs).
Also shipped: CLI `batch --watch` mode, issue/PR templates, real-stdio MCP
smoke script (verify-stdio.mjs).
Remaining: round-trip QA eval harness (LLM judge), release automation
(changesets, npm publish — meaningful once the repo is public).

## Epic 8 — Growth & community (operations/marketing/outreach)
Launch checklist: GitHub repo polish (topics, social preview, README badges),
Show HN + r/LocalLLaMA + dev.to/Hashnode posts, MCP registry + skill directory
listings, comparison benchmark blog post (our fixtures vs competitors —
reproducible), docs site, Discord/GitHub Discussions. All claims must be
reproducible from the repo (no dark patterns, no scraped/spam outreach; comply
with API ToS, attribution, GDPR/CCPA for any site analytics — privacy-respecting
analytics only, e.g. Plausible).

---

# Where this actually stands, and what comes next

Written 2026-07-31 after a reliability and production-readiness pass. This
section is the honest state of the project, not the aspirational one.

## What works, verified

| Capability | Evidence |
|---|---|
| Rambling prompt → structured Markdown, **no API key** | 150 → 127 tokens, Goal/Requirements/Constraints, every requirement preserved |
| Document conversion (HTML, Office, CSV, text-layer PDF) | Real MarkItDown, golden fixture corpus |
| Compression to a token budget, losslessly | 29/29 anchors byte-exact under stress |
| Retrieval across a cold start | Instance A wrote 17 anchors, instance B resolved 17/17 |
| MCP in six tools | Real stdio, all three tools + the `optimize` prompt |
| Concurrency | 10 concurrent real conversions, zero cross-talk |
| Hostile input | 10 adversarial requests, every one the intended status |
| Cross-platform | CI green, Linux + Windows × Node 20/22 |

152 unit + 13 E2E, plus an 18-case reliability probe and a claims checker that
fails the build if any stated number drifts.

## Known gaps, ranked by how much they matter

**Closed since this list was written:**

- ~~The high-fidelity path has never run against a real `docling-serve`.~~
  **Closed.** A `docling` CI job runs a real docling-serve container against
  generated PDFs: OCR on a scanned invoice, and two-level-header table
  reconstruction on a native PDF. The test skips when no server is reachable
  and *says so in the report*, so a green local run is never mistaken for
  coverage of that path.
- ~~No round-trip quality harness.~~ **Partly closed.** The deterministic half
  exists and is a permanent gate: every load-bearing fact (figure, identifier,
  date) must survive verbatim in the output or sit inside a span an anchor
  resolves. At budget 120, 32 of 38 facts are recoverable only via anchors and
  none are lost. Building it found a compressor bug that had been silently
  disabling compression on any document whose bulk is one long paragraph.
  *Still open: an LLM-judge pass on whether the compressed version answers the
  same questions — that needs a model and live keys.*

- ~~The LLM optimizer has only run against a local stub.~~ **Closed as far as
  it can be without live keys.** Provider contract tests pin the gateway
  against recorded response shapes — OpenAI, Anthropic-via-LiteLLM cost
  headers, vLLM parts-array content, null-content filters, `length`
  truncation, missing usage, error envelopes, 429 retry. Building them found
  three real defects: a parts-array `content` crashed the optimizer, empty
  content silently erased the document, and truncated output was returned as
  complete. All three now fall back to the deterministic path with the user's
  content intact, verified end-to-end over real HTTP.
  *Still open: a smoke run against one live provider before big releases —
  needs a key, deliberately not in CI.*

**Open:**

1. **The hosted studio cannot convert PDFs**, because serverless has no Python.
   Now stated up front by `/api/capabilities` rather than discovered from an
   error, but the demo still cannot show the flagship document path.
   *Next: either a small always-on container for the sidecars, or a WASM
   text-layer extractor for the common case.*
2. **No published packages.** Everything installs by cloning, which is a real
   adoption tax and blocks the true one-liner (`npx prompt2md`).
   *Next: changesets + npm publish, gated on the repository going public.*
3. **`markitdown` alone cannot read PDFs.** The `[pdf]` extra is required, and
   without it every PDF raises `MissingDependencyException`. Documented and
   installed in CI; worth a doctor check so a user finds out before their
   first conversion rather than during it.

## Sequenced plan

**Now (unblocks everything else)**
- Flip the repository public. Every remaining growth item depends on it, and
  the project is in a defensible state: honest numbers, real tests, green CI.
- Upload the social preview (`apps/web/public/og.png`) — public-repo only.
- Create a Vercel Blob store so hosted retrieval is durable rather than
  best-effort.

**Next (credibility)**
- docling-serve in CI (gap 1) — the biggest gap between claim and proof.
- Provider contract tests (gap 2).
- Round-trip quality harness (gap 5), so "lossless" is backed by evidence
  about *answers*, not only about bytes.

**Then (reach)**
- npm publish + `npx prompt2md` one-liner.
- MCP registry and skill directory listings.
- A reproducible benchmark post: our fixtures against competitors, with the
  commands to re-run it. This is the strongest possible marketing for a
  project whose differentiator is auditable numbers.

**Deliberately not doing**
- Rate limiting inside the app — per-instance limits on serverless are
  theatre. Use the platform's firewall.
- Chasing further reduction on the deterministic path at the cost of fidelity.
  Structure and honesty beat a bigger percentage.

## Legal & compliance guardrails (cross-cutting)
- Apache-2.0 for our code; verify license compatibility of every dependency
  (no AGPL in distributed packages; Marker weights excluded due to OpenRail-M).
- Daily Digest: only APIs whose ToS permit republishing with attribution; store
  nothing personal; respect rate limits; takedown contact published.
- No training on user documents; local-first processing by default.
