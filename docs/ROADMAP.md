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

## Epic 5 — Web app & UX
Next.js conversion studio: drag-drop, before/after token meter, TokenReport
dashboard, dark mode, WCAG 2.1 AA. Design system pass using open-source design
skill references (claudedesignskills, impeccable). 3D hero/brand artifacts
rendered in Blender. Tabs: Convert · Compress · Daily Digest · Docs · Playground.
Optional voice: Web Speech API input + TTS readback of summaries ("LLM bot with
speech").

## Epic 6 — Daily Digest (live-data demo)
Automated daily job pulls from vetted free public APIs (curated from
public-apis/public-apis — e.g., Hacker News/Algolia, Wikipedia current events,
GDELT; each vetted for ToS/licensing and attribution before inclusion) →
converts to token-optimized Markdown → publishes a dated digest page. Serves as
living proof of reliability and as SEO/content marketing. API map grows over time
with a documented vetting checklist per source (rate limits, attribution, license).

## Epic 7 — Quality & release engineering
Vitest unit + golden tests; browser E2E on the web app (Selenium WebDriver per
requirement, Playwright optional alongside); GitHub Actions CI matrix; release
automation (changesets); SECURITY.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md,
issue/PR templates.

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
