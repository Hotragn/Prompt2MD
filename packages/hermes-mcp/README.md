# @prompt2md/hermes-mcp

Model Context Protocol server exposing prompt2md to agents: 4-phase token
compression with prompt-cache alignment and a lossless `retrieve_original`
fallback. Savings math: [ADR-003](../../docs/adr/ADR-003-token-savings.md).

## Tools

| Tool | Purpose |
|---|---|
| `convert` | File/text → token-optimized Markdown + TokenReport (auto-compresses when `tokenBudget` is exceeded) |
| `compress_context` | Oversized context block → budgeted Markdown + savings report (phase ledger + cache-adjusted effective tokens) |
| `retrieve_original` | Verbatim source behind any `p2md:src=<id>#<start>-<end>` anchor — compression is never destructive |

## Run

```bash
pnpm --filter @prompt2md/hermes-mcp build
node packages/hermes-mcp/dist/bin.js   # stdio transport
```

Claude Code registration:

```bash
claude mcp add prompt2md -- node <repo>/packages/hermes-mcp/dist/bin.js
```

## Configuration (environment)

| Variable | Effect | Default |
|---|---|---|
| `P2MD_LITELLM_BASE_URL` | Enables LLM optimizer + LLM summarizer | unset → deterministic/extractive fallbacks |
| `P2MD_LITELLM_API_KEY` | Proxy key | unset |
| `P2MD_MODEL` | Default model | `claude-sonnet-5` |
| `P2MD_FALLBACK_MODELS` | Comma-separated fallback chain | unset |
| `P2MD_DOCLING_URL` | Enables the high-fidelity engine | unset → docling routes error clearly |
| `P2MD_PYTHON_BIN` | Python for the markitdown worker | `python` |
| `P2MD_STORE_DIR` | Originals store | `~/.prompt2md/originals` |

The server degrades gracefully: with zero configuration, `compress_context`
and `retrieve_original` are fully functional (deterministic strip + extractive
summarization); `convert` works for text and fast-path formats via the local
Python markitdown install.

## Tests

```bash
pnpm --filter @prompt2md/hermes-mcp test   # 27 tests incl. in-memory MCP client integration
```
