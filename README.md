<p align="center">
  <img src="apps/web/public/logo.svg" alt="prompt2md — A Markdown Magic" width="440">
</p>


<p align="center">
  <strong>Turn anything into token-optimized, layout-aware Markdown — and know exactly what it saved you.</strong>
</p>

<p align="center">
  <a href="https://github.com/Hotragn/Prompt2MD/actions/workflows/ci.yml"><img src="https://github.com/Hotragn/Prompt2MD/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node >= 20">
  <img src="https://img.shields.io/badge/tests-175%20unit%20%2B%2013%20e2e-success.svg" alt="Tests">
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-server%20%2B%20skill-7C5CFF.svg" alt="MCP server and skill"></a>
</p>

<p align="center">
  <a href="https://prompt2md.vercel.app"><strong>Website</strong></a> ·
  <a href="https://prompt2md.vercel.app/studio"><strong>Live studio</strong></a> ·
  <a href="https://prompt2md-docs.vercel.app"><strong>Docs site</strong></a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="docs/INTEGRATIONS.md">Integrations</a> ·
  <a href="ARCHITECTURE.md">Architecture</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## Why prompt2md

Feeding documents to an LLM usually means choosing between tools that are
**fast but lossy** (tables flattened, scanned pages returning nothing) and
tools that are **faithful but heavy** (seconds per page, gigabytes of models).
Neither tells you what the conversion costs you in tokens.

prompt2md is the **optimization layer above** those engines. It routes each
input to the cheapest engine that can handle it, cleans the result, and returns
the Markdown **plus a report you can audit**: tokens in, tokens out, compression
ratio, per-section costs, and the effective cost of every repeat call.

```console
$ prompt2md compress ARCHITECTURE.md --token-budget 500
compressed 1856→1504 tokens (81%), repeat-call cost 167 effective tokens
(91% cheaper than raw), sourceId=a473fa37ccf5b4b5
```

That run is reproducible from this repository — every number in this README
comes from a real command, not an estimate.

Nothing is discarded to get there: the original is stored before compression
runs, and every summarized passage carries an anchor that returns the
**byte-exact** source on demand.

## Features

|  | |
|---|---|
| **Dual-engine routing** | Fast path (~0.6 s) for HTML, Office, CSV, and text-layer PDFs; high-fidelity path (TableFormer + OCR) for scans, complex tables, and multi-column layouts. Routed on content evidence, never on file extension — and it self-heals, escalating when the fast path's output shows damage. |
| **Token cost as a first-class output** | Every conversion returns a `TokenReport`. Set `--token-budget` and it is enforced, not suggested. |
| **Prompt-cache-aware layout** | Stable content first, volatile content last, provider-specific breakpoints. Repeat calls cost up to ~90% less on cache-enabled providers. |
| **Lossless compression** | Originals stored content-addressed before any transformation; `retrieve_original` returns the exact source bytes behind any anchor. |
| **Agent-native** | MCP server (`convert`, `compress_context`, `retrieve_original`, plus an `optimize` chat-box prompt) and a `/prompt2md` skill. |
| **Any provider** | One OpenAI-compatible endpoint covers Claude, GPT, Gemini, Grok, Kimi, or local models via Ollama/vLLM. |
| **Degrades gracefully** | With zero sidecars installed, deterministic cleanup takes over and says so. Textual input never hard-fails. |

## Quick start

Install the agent skill, no clone required:

```bash
npx prompt2md-skill
```

Then start a new agent session and run `/prompt2md`. That is enough for prompt
cleanup. For document conversion, budgets, and byte-exact retrieval, install
the engine too:

```bash
git clone https://github.com/Hotragn/Prompt2MD.git prompt2md && cd prompt2md
pnpm install && pnpm build      # Node >= 20, pnpm >= 9
pnpm setup                      # wire every AI tool on this machine (see below)
```

<details>
<summary><strong>Command line</strong></summary>

```bash
prompt2md convert --text "your messy prompt here"     # clean up a rambling prompt
prompt2md convert ./contract.pdf -b 6000              # document with a token budget
prompt2md batch "docs/**/*.html" -d out/ --report     # bulk convert, with reports
prompt2md batch "notes/**/*.md" -d out/ --watch       # re-convert on change
prompt2md compress big-context.md -b 4000             # fit an oversized context
prompt2md retrieve "p2md:src=<id>#<start>-<end>"      # recover the verbatim source
prompt2md doctor                                      # what's wired up here?
```
</details>

<details>
<summary><strong>MCP server (Claude Code, Claude Desktop, Cursor, Windsurf, Codex, Gemini CLI…)</strong></summary>

`pnpm setup` detects installed tools and registers the server in each, backing
up every file it touches. Any other MCP client uses the same shape:

```json
{
  "mcpServers": {
    "prompt2md": { "command": "node", "args": ["<repo>/packages/hermes-mcp/dist/bin.js"] }
  }
}
```

Users then pick the **`optimize`** prompt in their chat box and paste raw text —
the model receives optimized Markdown instead of the paste. Preview changes with
`node scripts/install.mjs --dry-run`.
</details>

<details>
<summary><strong>Agent skill</strong></summary>

```bash
npx prompt2md-skill              # ~/.claude/skills, and ~/.codex/skills if present
npx prompt2md-skill --project    # this repo only (./.claude/skills)
npx prompt2md-skill --dry-run    # show what would change, touch nothing
```

Re-running is safe: an identical install is a no-op, and a copy you have edited
is backed up rather than overwritten. From a clone, `pnpm setup` installs the
same skill alongside the MCP server.

Triggers on conversion, token-budget, and document-to-Markdown requests, and
teaches the agent to retrieve verbatim sources instead of answering from a
summary.
</details>

<details>
<summary><strong>Web studio</strong></summary>

```bash
pnpm --filter @prompt2md/web dev     # http://localhost:3100
```

Drag-and-drop conversion, live before/after token meter, compression savings,
rendered preview, voice input/readback, and the Daily Digest tab.
</details>

## How it works

```
 input ─► SNIFF ─► ROUTE ──────────────► OPTIMIZE ─► LAYOUT ─► Markdown + TokenReport
          (cheap    ├─ prompt-optimizer   (strip      (cache-
          content   ├─ markitdown  ┐       chrome,     aligned
          probes)   └─ docling  ◄──┘       dedupe,     sections)
                        ▲  escalate on     budget)
                        │  evidence of damage
```

Optional engine sidecars — each unlocks capability, none is required:

| Sidecar | Unlocks | Install |
|---|---|---|
| [MarkItDown](https://github.com/microsoft/markitdown) | Fast path for Office, HTML, CSV, simple PDFs | `pip install "markitdown[all]"` |
| [Docling](https://github.com/docling-project/docling) | Scans (OCR), complex tables, multi-column PDFs | `docker run -p 5001:5001 quay.io/docling-project/docling-serve` |
| [LiteLLM](https://github.com/BerriAI/litellm) | LLM optimizer and summarizer, any provider | `litellm --port 4000` |

Design decisions are recorded as ADRs: [dual-engine architecture](docs/adr/ADR-001-dual-engine.md),
[engine selection](docs/adr/ADR-002-engine-selection.md),
[token-savings math](docs/adr/ADR-003-token-savings.md).

## Design

The interface has its own documented system — the story, the marks, the
palette, and the rules — in **[docs/BRAND.md](docs/BRAND.md)**.

> Folding makes something smaller without removing anything from it.
> Unfold it and you have the original, exactly. Cutting is not reversible.
> Folding is.

That is the product's architecture, not a metaphor: originals are stored before
any transformation, and every summarized section resolves back to byte-exact
source. The icon is an accordion fold whose silhouette reads as **M**.

The visual research behind it — what currently-funded developer-tool companies
do, and which of it survives contact with an open-source project that has no
sales funnel — is in [docs/research/UI-LANDSCAPE.md](docs/research/UI-LANDSCAPE.md).

## Project layout

| Package | Purpose |
|---|---|
| [`packages/core`](packages/core) | Router, engines, LiteLLM gateway, Markdown IR, token reports |
| [`packages/hermes-mcp`](packages/hermes-mcp) | MCP server, 4-phase compression, originals store |
| [`packages/cli`](packages/cli) | `prompt2md` command line |
| [`packages/skill`](packages/skill) | `/prompt2md` agent skill |
| [`apps/web`](apps/web) | Conversion studio + Daily Digest |
| [`apps/docs`](apps/docs) | Documentation site (VitePress) |
| [`fixtures`](fixtures) | Golden corpus driving every core test |

## Development

```bash
pnpm build         # core → hermes-mcp → cli → web + docs
pnpm test          # 175 unit/integration tests
pnpm test:e2e      # 13 Selenium scenarios (landing + studio)
pnpm test:install  # installer against a sandboxed HOME (your configs untouched)
pnpm test:fresh    # full new-user simulation in a throwaway clone
pnpm typecheck     # strict TypeScript across the workspace
```

CI runs build, typecheck, tests, skill validation, the sandboxed installer
check, and an MCP stdio smoke test on Linux and Windows across Node 20 and 22,
plus browser E2E.

## Contributing

Contributions are welcome. Two house rules keep the project honest:

1. **Data first** — behavior changes start with a fixture in
   [`fixtures/cases/`](fixtures), not with code.
2. **Decisions get ADRs** — architectural changes come with a short record of
   the alternatives considered.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow,
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations,
[CHANGELOG.md](CHANGELOG.md) for what has landed, and
[SECURITY.md](SECURITY.md) to report a vulnerability privately.

## Privacy

Processing is local by default. No telemetry, and no document content leaves
your machine unless you configure an LLM gateway — in which case it goes only
to the provider you chose. The [Daily Digest](docs/DIGEST-SOURCES.md) uses
public APIs vetted against a published checklist, with attribution and links to
originals.

## Acknowledgements

Built on [Docling](https://github.com/docling-project/docling) (LF AI & Data),
[MarkItDown](https://github.com/microsoft/markitdown) (Microsoft),
[LiteLLM](https://github.com/BerriAI/litellm), and the
[Model Context Protocol](https://modelcontextprotocol.io). Coding-request
output follows the minimal-code discipline of
[ponytail](https://github.com/DietrichGebert/ponytail).

## License

[Apache-2.0](LICENSE)
