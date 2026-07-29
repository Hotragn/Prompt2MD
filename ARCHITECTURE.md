# prompt2md — System Architecture

> Status: Phases 1–4 implemented and approved (Checkpoints 1–4). Web app + daily
> digest are next (docs/ROADMAP.md, Epics 5–6). See `docs/adr/` for decision
> records and `docs/research/` for the underlying research.

## 1. What prompt2md is

prompt2md is the **token-optimization layer above document engines**, not another
parser. It converts unstructured text, messy prompts, and complex documents into
**token-optimized, layout-aware Markdown** for LLM consumption, and it reports the
cost impact of every conversion.

Positioning (from the competitive analysis in `docs/research/COMPETITIVE-LANDSCAPE.md`):

| USP | Who else does it |
|---|---|
| Token cost as a first-class output (`--token-budget`, per-section counts, compression ratio) | Nobody |
| Prompt-cache-aware output layout (stable prefixes, provider-specific breakpoint profiles) | Nobody |
| Automatic dual-engine routing (fast path vs. high-fidelity path by document complexity) | LlamaParse has *manual* cloud tiers only |
| Messy-prompt cleanup (raw rambling prompt → structured Markdown spec) | Unowned category |
| Agent-native: MCP server + `/prompt2md` skill + `retrieve_original` fallback | markitdown-mcp is a dumb converter only |

## 2. Monorepo layout (Turborepo + pnpm workspaces)

```
prompt2md/
├── apps/
│   └── web/                  # Next.js conversion studio, token dashboard, daily digest
├── packages/
│   ├── core/                 # Engine router, LiteLLM gateway factory, token primitives
│   ├── cli/                  # Commander.js CLI (single + batch)
│   ├── hermes-mcp/           # MCP server: 4-phase compression, cache alignment,
│   │                         #   retrieve_original fallback
│   └── skill/                # /prompt2md agent skill (YAML/Markdown definition)
├── fixtures/                 # Data-first golden corpus (see fixtures/README.md)
│   ├── cases/                # input.* + expected.md + case.json per case
│   └── scripts/              # Binary fixture generators (PDFs)
├── docs/
│   ├── adr/                  # Architectural Decision Records
│   ├── research/             # Engine + competitor research (cited)
│   └── ROADMAP.md            # Agile epics: product, growth, testing, legal
├── turbo.json                # Turborepo 2.x task graph
└── pnpm-workspace.yaml
```

## 3. Processing pipeline

```
                         ┌────────────────────────────────────────────┐
 input (text/file/URL) → │ 1. SNIFF: mime + text-layer + table/scan   │
                         │    probes (cheap, no model load)           │
                         └───────────────┬────────────────────────────┘
                                         │
              ┌──────────────────────────┼───────────────────────────┐
              ▼                          ▼                           ▼
   ┌──────────────────┐      ┌──────────────────┐        ┌───────────────────┐
   │ prompt-optimizer  │      │ markitdown        │        │ docling           │
   │ (plain text,      │      │ (HTML, Office,    │        │ (complex PDFs,    │
   │ prompts, emails)  │      │ CSV, simple PDFs) │        │ tables, scans/OCR)│
   │ via LiteLLM       │      │ ~0.6s/doc, no GPU │        │ TableFormer, VLM  │
   └────────┬─────────┘      └────────┬─────────┘        └─────────┬─────────┘
            │                          │        escalation on       │
            │                          │  empty text-layer/tables ──┘
            ▼                          ▼                           ▼
                         ┌────────────────────────────────────────────┐
                         │ 2. NORMALIZE → canonical MarkdownDoc IR    │
                         │ 3. OPTIMIZE: boilerplate strip, dedupe,    │
                         │    heading repair, token budget enforcement│
                         │ 4. LAYOUT: cache-aligned section ordering  │
                         │    (stable prefix first, volatile last)    │
                         └───────────────┬────────────────────────────┘
                                         ▼
                     token-optimized .md + TokenReport (before/after,
                     per-section counts, compression ratio, warnings)
```

**Routing policy** (full justification: `docs/adr/ADR-001-dual-engine.md`):

1. Plain text / prompt / email → **prompt-optimizer** (LLM path; never a document engine).
2. HTML, Office, CSV/JSON, PDFs with a healthy text layer and no complex tables → **markitdown** (fast path: ~0.6 s vs ~9–41 s per doc, ~80 MB vs ~2.4 GB footprint).
3. Escalate to **docling** when the sniffer detects: empty/sparse text layer (scan → OCR), table regions, multi-column layout, or when the fast path returns suspiciously low yield. Docling runs behind **docling-serve** (REST) so Node never embeds Python, with `pypdfium2` backend + 100-page chunking to avoid its known large-PDF OOM (docling#3345, #1654).

**Engine integration from TypeScript:** both engines are Python. MarkItDown runs as a
managed subprocess (stdin/stdout, JSON-framed); Docling via docling-serve HTTP with
model prefetch (`docling-tools models download`) for cold-start control. Both sit
behind an `Engine` interface in `packages/core` so either can be swapped for a
future WASM/native port.

## 4. LLM gateway

`packages/core/gateway` wraps **LiteLLM** (proxy mode or SDK sidecar) for the
prompt-optimizer and enrichment passes: unified API across Claude / OpenAI /
Gemini / Kimi, provider fallback chains, cost tracking per conversion, and
provider-specific **prompt-cache profiles** (Anthropic explicit breakpoints,
OpenAI/Gemini automatic-prefix rules) that the LAYOUT stage consumes.

## 5. Hermes MCP server (`packages/hermes-mcp`)

Tools exposed to agents:

| Tool | Purpose |
|---|---|
| `convert` | File/text/URL → optimized Markdown + TokenReport |
| `compress_context` | 4-phase compression of an oversized context block |
| `retrieve_original` | Fetch the verbatim source span behind any compressed section (lossless fallback — compression is never destructive) |

4-phase compression: (1) structural conversion to Markdown, (2) boilerplate/dedupe
strip, (3) middle-context summarization (head/tail preserved verbatim — mitigates
lost-in-the-middle), (4) cache-aligned reassembly. Every compressed section carries
a `p2md:src` anchor so `retrieve_original` can restore it. Details land in ADR-003
(Phase 3).

## 6. Web app (`apps/web`) — Phase 4+

Drag-and-drop conversion studio with before/after token meter, TokenReport
dashboard, docs, and a **Daily Digest** demo tab: pulls from free public APIs
(curated from `public-apis/public-apis` — news/HN/wiki-current-events endpoints,
each checked for license & ToS compliance) and republishes them as token-optimized
Markdown daily — a living demo that doubles as content marketing. Full growth,
testing (Selenium/Playwright), UI/UX, and legal workstreams: `docs/ROADMAP.md`.

## 7. Quality gates

- **Golden fixtures** (`fixtures/`) drive every core feature; conformance tests diff
  output vs `expected.md` and assert token ratios from `case.json`.
- Unit tests: Vitest per package. E2E: browser automation against `apps/web`.
- CI: GitHub Actions matrix (Node 20/22 × Win/Linux/macOS), turbo-cached.
- Compression is validated by **round-trip QA**: an LLM judge answers questions
  from the compressed doc that were generated from the original; regression gate on
  answer accuracy.
