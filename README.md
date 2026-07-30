<p align="center">
  <img src="apps/web/public/logo.svg" alt="prompt2md — A Markdown Magic" width="440">
</p>

<p align="center">
  <a href="https://github.com/Hotragn/Prompt2MD/actions/workflows/ci.yml"><img src="https://github.com/Hotragn/Prompt2MD/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

# prompt2md

**A Markdown Magic** — turn anything into token-optimized, layout-aware Markdown, and know exactly what it saved you.

prompt2md converts unstructured text, messy prompts, and complex documents
(PDF, Office, HTML, scans) into clean Markdown built for LLM consumption. It is
the *optimization layer above* document engines: every conversion returns the
Markdown **plus a TokenReport** (before/after counts, compression ratio,
per-section costs), honors a token budget, and lays sections out to maximize
provider prompt-cache hits.

> Status: **Phases 1–4 complete** — core engine, Hermes MCP server, CLI, and agent skill are built and tested (81 tests). Web app + daily digest are next (docs/ROADMAP.md, Epics 5–6).

## Why another converter?

Existing tools are either *fast but lossy* (MarkItDown flattens tables, returns
nothing on scans) or *faithful but heavy* (Docling runs seconds-per-page on CPU).
And none of them treat **token cost** as an output. prompt2md routes each input
through the right engine automatically and optimizes the result:

- 🧭 **Dual-engine routing** — MarkItDown fast path for HTML/Office/simple PDFs;
  Docling (TableFormer + OCR) for complex tables, multi-column layouts, and scans.
  Routed by content probes, not file extensions. ([ADR-001](docs/adr/ADR-001-dual-engine.md))
- 🎯 **Token budgets & reports** — `--token-budget 4000` and get per-section
  counts + compression ratio back, every time.
- 🗂️ **Cache-aligned layout** — stable content first, volatile content last, with
  provider-specific profiles (Anthropic breakpoints, OpenAI/Gemini prefix rules).
- 🧹 **Messy-prompt cleanup** — paste a rambling request, get a structured,
  deduplicated Markdown spec with zero requirements dropped.
- 🤖 **Agent-native** — Hermes MCP server (`convert`, `compress_context`,
  `retrieve_original`) and a `/prompt2md` skill. Compression is never destructive:
  every summarized span is retrievable verbatim.
- 🔌 **Any LLM** — LiteLLM gateway: Claude, OpenAI, Gemini, Kimi, or local.

## Monorepo

| Package | Purpose |
|---|---|
| [`packages/core`](packages/core) | Engine router, LiteLLM gateway, token primitives |
| [`packages/cli`](packages/cli) | `prompt2md` CLI — single file & batch |
| [`packages/hermes-mcp`](packages/hermes-mcp) | MCP server with 4-phase token compression |
| [`packages/skill`](packages/skill) | `/prompt2md` agent skill definition |
| [`apps/web`](apps/web) | Conversion studio + token dashboard + daily digest |
| [`fixtures/`](fixtures) | Data-first golden corpus driving all core tests |

## Quick start

```bash
pnpm install && pnpm build            # Node >= 20, pnpm >= 9

# CLI (zero config: text path + deterministic fallbacks work immediately)
node packages/cli/dist/index.js convert --text "your messy prompt here"
node packages/cli/dist/index.js convert ./contract.pdf -b 6000
node packages/cli/dist/index.js batch "docs/**/*.html" -d out/ --report
node packages/cli/dist/index.js compress big-context.md -b 4000 --provider anthropic
node packages/cli/dist/index.js retrieve "p2md:src=<id>#<start>-<end>"
node packages/cli/dist/index.js doctor   # check which sidecars are wired up

# MCP server (Claude Code)
claude mcp add prompt2md -- node <repo>/packages/hermes-mcp/dist/bin.js

# Agent skill
cp -r packages/skill/prompt2md ~/.claude/skills/prompt2md
```

Full capability needs the engine sidecars (all optional, everything degrades
gracefully without them):

```bash
pip install "markitdown[all]"                                  # fast path
docker run -p 5001:5001 quay.io/docling-project/docling-serve  # high fidelity; then P2MD_DOCLING_URL=http://localhost:5001
litellm --port 4000                                            # LLM optimizer; then P2MD_LITELLM_BASE_URL=http://localhost:4000/v1
```

## Development

```bash
pnpm install      # Node >= 20, pnpm >= 9
pnpm build        # turbo build (core -> hermes-mcp -> cli -> web + docs site)
pnpm test         # 95 unit/integration tests: golden corpus, MCP client, CLI
pnpm test:e2e     # Selenium E2E against the built studio (headless Chrome/Edge)
pnpm typecheck    # strict TS across workspaces

pnpm --filter @prompt2md/docs dev   # docs site at http://localhost:3200
pnpm --filter @prompt2md/web dev    # studio at http://localhost:3100
```

Docs: **docs website** (`apps/docs`, VitePress — run it locally with the
command above) · [ARCHITECTURE.md](ARCHITECTURE.md) · [docs/adr/](docs/adr) ·
[docs/research/](docs/research) · [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) ·
[docs/ROADMAP.md](docs/ROADMAP.md) · [fixtures/README.md](fixtures/README.md)

## License

Apache-2.0
