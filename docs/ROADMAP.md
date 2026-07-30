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
graceful-degradation UX, file upload + drag-drop for text formats, rendered
markdown preview (sanitized), voice (Web Speech dictation + TTS readback).
Remaining: design-system pass (claudedesignskills, impeccable), Blender 3D
brand artifacts, PDF/Office upload via server (currently CLI/MCP only).

## Epic 6 — Daily Digest (live-data demo) ✅ v1 shipped
✅ Shipped: digest engine (apps/web/lib/digest.ts) pulling vetted keyless APIs
(Hacker News/Algolia + Wikipedia featured feed), per-source failure isolation,
once-per-day cache, honest raw-vs-digest token report (measured live:
~52k raw tokens → ~0.9k digest, 2%), lossless raw-payload storage with
retrievable sourceId, attribution footer, studio tab + /api/digest, source
vetting checklist + API map (docs/DIGEST-SOURCES.md), 5 unit tests + live E2E.
Remaining: more vetted sources (GDELT, Spaceflight News, Open-Meteo),
scheduled workflow + dated archive page once the repo is on GitHub.

## Epic 7 — Quality & release engineering 🔨 in progress
✅ Shipped: Vitest unit + golden tests (90+), Selenium WebDriver E2E (studio
flows incl. lossless retrieve, headless Chrome/Edge), GitHub Actions CI
(Linux/Windows × Node 20/22 + e2e job), SECURITY/CODE_OF_CONDUCT/CONTRIBUTING,
VitePress docs site (apps/docs, built from /docs).
Remaining: round-trip QA eval harness (LLM judge), release automation
(changesets, npm publish), CLI watch mode, issue/PR templates.

## Epic 8 — Growth & community (operations/marketing/outreach)
Launch checklist: GitHub repo polish (topics, social preview, README badges),
Show HN + r/LocalLLaMA + dev.to/Hashnode posts, MCP registry + skill directory
listings, comparison benchmark blog post (our fixtures vs competitors —
reproducible), docs site, Discord/GitHub Discussions. All claims must be
reproducible from the repo (no dark patterns, no scraped/spam outreach; comply
with API ToS, attribution, GDPR/CCPA for any site analytics — privacy-respecting
analytics only, e.g. Plausible).

## Legal & compliance guardrails (cross-cutting)
- Apache-2.0 for our code; verify license compatibility of every dependency
  (no AGPL in distributed packages; Marker weights excluded due to OpenRail-M).
- Daily Digest: only APIs whose ToS permit republishing with attribution; store
  nothing personal; respect rate limits; takedown contact published.
- No training on user documents; local-first processing by default.
