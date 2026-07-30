# Getting started

prompt2md converts unstructured text, messy prompts, and documents (PDF,
Office, HTML, CSV, scans) into token-optimized Markdown — and reports exactly
what it saved. Everything below works **offline with zero configuration**;
optional sidecars unlock more capability without ever being required.

## Install & build

```bash
git clone <your-repo-url> prompt2md && cd prompt2md
pnpm install && pnpm build        # Node >= 20, pnpm >= 9
pnpm test                         # 90+ tests: golden corpus, MCP integration, CLI
```

## CLI in 60 seconds

```bash
# messy prompt -> structured spec (works with zero setup)
node packages/cli/dist/index.js convert --text "your messy prompt here"

# document with a token budget (auto-compresses when exceeded)
node packages/cli/dist/index.js convert ./contract.pdf -b 6000

# batch a folder
node packages/cli/dist/index.js batch "docs/**/*.html" -d out/ --report

# compress oversized context, then recover any detail verbatim
node packages/cli/dist/index.js compress big-context.md -b 4000
node packages/cli/dist/index.js retrieve "p2md:src=<id>#<start>-<end>"

# what's wired up on this machine?
node packages/cli/dist/index.js doctor
```

## Web studio

```bash
pnpm --filter @prompt2md/web dev   # http://localhost:3100
```

Paste, pick a budget and cache profile, and watch the before/after token meter.

## MCP connector & skill

```bash
claude mcp add prompt2md -- node <repo>/packages/hermes-mcp/dist/bin.js
cp -r packages/skill/prompt2md ~/.claude/skills/prompt2md
```

In any MCP client, the **`optimize` prompt** turns a chat-box paste into
optimized Markdown before the model sees it. Full client configs (Claude
Desktop, Cursor, Windsurf) and bring-your-own-provider setup:
[Integrations](/INTEGRATIONS).

## Optional sidecars

| Sidecar | Unlocks | Setup |
|---|---|---|
| MarkItDown | Fast path for Office/HTML/CSV/simple PDFs | `pip install "markitdown[all]"` |
| docling-serve | Scans (OCR), complex tables, multi-column PDFs | `docker run -p 5001:5001 quay.io/docling-project/docling-serve` then `P2MD_DOCLING_URL=http://localhost:5001` |
| LiteLLM | LLM optimizer + summarizer (any provider) | `litellm --port 4000` then `P2MD_LITELLM_BASE_URL=http://localhost:4000/v1` |

Without them, conversion **never hard-fails on textual input** — the pipeline
degrades to deterministic cleanup with an explicit warning in the report.

## The reliability contract

1. **Fast** — content probes route each input to the cheapest engine that can
   handle it; misroutes self-heal by evidence, costing ~0.6s, not minutes.
2. **Easy** — one runtime, configured by env vars, exposed as CLI, MCP, skill,
   and web app. `doctor` tells you what's missing and how to add it.
3. **Reliable** — 90+ tests pin every routing decision to a golden corpus;
   CI runs Linux + Windows × Node 20/22 plus browser E2E.
4. **Nothing is lost** — originals are stored content-addressed *before* any
   compression; every summarized section carries a `p2md:src` anchor whose
   span returns the byte-exact source text.
