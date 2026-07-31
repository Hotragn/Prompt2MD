# Integrating prompt2md

prompt2md plugs into your stack three ways: as an **MCP connector** (any MCP
client), as an **agent skill**, or **programmatically**. All surfaces share one
runtime and one set of env vars.

## 0. One-command setup (recommended)

```bash
pnpm install && pnpm build && pnpm setup
```

## Running the studio as a public service

The CLI and MCP server run on your machine with your own files and have no
limits. The **web studio is different**: if you deploy it where strangers can
reach it, the input is adversarial by default. These guards are on, and every
one is tunable by environment variable.

| Setting | Default | What it protects |
|---|---|---|
| `P2MD_MAX_INPUT_CHARS` | 1,000,000 (~250k tokens) | Pasted text; returns **413** with a message pointing at the CLI |
| `P2MD_MAX_UPLOAD_BYTES` | 25 MB | Uploads are read into memory before conversion |
| `P2MD_REQUEST_TIMEOUT_MS` | 45,000 | Fails with an explanation before the platform kills the function and returns an opaque 504 |
| `P2MD_STORE_DIR` | `~/.prompt2md/originals` | Where originals are kept — see below |

Error messages returned over HTTP are stripped of absolute paths and host/port
details; the full error, including those, goes to the server log.

### Retrieval durability

`retrieve_original` is only as durable as the store behind it. There are three
configurations, and the product tells you which one you are in.

| Where | Store | Survives a restart? |
|---|---|---|
| Your machine | `~/.prompt2md/originals` (or `P2MD_STORE_DIR`) | Yes |
| Serverless, no blob store | instance temp directory | **No** |
| Serverless + `BLOB_READ_WRITE_TOKEN` | Vercel Blob, private access | Yes |

Without a durable store on serverless, a `sourceId` handed out now can
legitimately 404 after a cold start. The API reports `ephemeralStore: true`
alongside any `sourceId`, the studio says so in plain words, and the 404
explains it rather than implying data loss.

**To make retrieval durable on Vercel:** create a Blob store in the project
(Storage → Create → Blob). Vercel injects `BLOB_READ_WRITE_TOKEN`
automatically; prompt2md detects it and switches over. Nothing else to
configure, and `ephemeralStore` becomes `false`.

Two deliberate choices worth knowing:

- **Blob, not KV.** Originals are whole documents — uploads up to 25 MB — which
  is far past what Redis-backed KV is sized or priced for. Object storage is
  also the natural fit for immutable, content-addressed reads.
- **`access: "private"`.** Originals are reachable only with the store token,
  never from a public URL. These are documents people pasted or uploaded;
  storage that anyone with a link could read would be a *worse* privacy
  position than the ephemeral store it replaces.

Self-hosting elsewhere? `createRuntimeFromEnv(env, { store })` accepts any
implementation of the `OriginalStore` interface (`put` / `get` / `getSpan`), so
S3, R2, or a database is a small adapter — see `apps/web/lib/blob-store.ts` as
the worked example.

### Not included

There is no rate limiting or authentication. A public deployment should sit
behind whatever your platform provides — Vercel's firewall, a reverse proxy, or
an API gateway. Adding a per-instance limiter would give the appearance of
protection without the substance, since serverless instances do not share state.

---

`pnpm setup` detects every supported tool on the machine — **Claude Code**
(MCP + `/prompt2md` skill), **Claude Desktop**, **Cursor**, **Windsurf**,
**Gemini CLI**, **Codex CLI** — and registers the MCP server in each, backing
up every config it touches. Idempotent; `--dry-run` previews without writing.
Tools it can't detect (Kimi/Grok clients, VS Code, anything MCP-capable) get a
copy-paste snippet at the end of the output.

**Nervous about your existing setup?** Two safety nets, both enforced in CI:

```bash
node scripts/install.mjs --dry-run   # prints every change it would make, writes nothing
pnpm test:install                    # runs the installer against a throwaway HOME and
                                     # asserts your real configs are byte-identical after
pnpm test:fresh                      # full new-user simulation: clones into a temp dir,
                                     # installs/builds/tests there, exercises CLI + MCP +
                                     # skill + installer + digest, all sandboxed
```

`pnpm test:install` also proves the generated config actually launches a working
MCP server, that pre-existing servers survive the merge, and that re-running is
idempotent. Every config the installer modifies is copied to
`<config>.bak-p2md-<timestamp>` first.

## 1. MCP connector — "type in the chat box" (manual per-client setup)

Build once:

```bash
pnpm install && pnpm build
```

**Claude Code**

```bash
claude mcp add prompt2md -- node <repo>/packages/hermes-mcp/dist/bin.js
```

**Claude Desktop** (`claude_desktop_config.json`) — same shape works for
Cursor (`.cursor/mcp.json`) and Windsurf:

```json
{
  "mcpServers": {
    "prompt2md": {
      "command": "node",
      "args": ["<repo>/packages/hermes-mcp/dist/bin.js"],
      "env": {
        "P2MD_LITELLM_BASE_URL": "http://localhost:4000/v1",
        "P2MD_MODEL": "claude-sonnet-5"
      }
    }
  }
}
```

What you get in the chat box:

- **`optimize` prompt** — pick it from the client's prompt menu, paste raw
  text; the model receives token-optimized Markdown instead of the paste.
- **Tools** — `convert`, `compress_context` (with savings reports), and
  `retrieve_original` (lossless recovery behind any `p2md:src` anchor).

## 2. Agent skill

```bash
cp -r packages/skill/prompt2md ~/.claude/skills/prompt2md   # or .claude/skills in a project
```

Triggers on conversion / token-budget / document-to-Markdown requests and
teaches the agent the reporting + retrieve-before-answering etiquette.

## 3. Bring your own provider

The gateway speaks to **any OpenAI-compatible endpoint** via LiteLLM — hosted
providers (Anthropic, OpenAI, Gemini, Kimi) or self-hosted (vLLM, Ollama):

| Env var | Meaning |
|---|---|
| `P2MD_LITELLM_BASE_URL` | Your LiteLLM proxy (or any OpenAI-compatible base URL) |
| `P2MD_LITELLM_API_KEY` | Key for that endpoint |
| `P2MD_MODEL` | e.g. `claude-sonnet-5`, `gpt-4.1`, `gemini/gemini-2.5-pro`, `moonshot/kimi-k2`, `ollama/llama3` |
| `P2MD_FALLBACK_MODELS` | Comma-separated fallback chain |

No gateway configured? Everything still works — deterministic cleanup and
extractive summarization take over, with an `engine-fallback` warning so you
know.

## 4. Pairing with Ponytail (recommended for coding agents)

[Ponytail](https://github.com/DietrichGebert/ponytail) (MIT) makes agents write
minimal code via a decision ladder: *skip > reuse > stdlib > dependency >
minimal custom code*. The two tools compose end-to-end:

- **prompt2md governs what goes IN** — your rambling coding request becomes a
  structured Task/Goal/Requirements/Constraints spec, deduplicated and
  token-optimized. When prompt2md detects a coding request, the optimized spec
  already ends with a ponytail-style `## Approach` directive.
- **Ponytail governs what comes OUT** — the agent implements against that spec
  with minimal-code discipline, and `/ponytail-review` audits the diff.

Install both:

```bash
# prompt2md skill
cp -r packages/skill/prompt2md ~/.claude/skills/prompt2md
# ponytail plugin (Claude Code)
# /plugin marketplace add DietrichGebert/ponytail && /plugin install ponytail
```

## 5. Programmatic

```ts
import { createRuntimeFromEnv } from "@prompt2md/hermes-mcp";

const rt = createRuntimeFromEnv();
const { markdown, report } = await rt.convert({ kind: "text", text: raw }, {});
const { markdown: small, savings } = await rt.compress(big, { tokenBudget: 4000 });
```

Or over HTTP via the studio (`apps/web`): `POST /api/convert`,
`POST /api/compress`, `GET /api/retrieve?ref=...`.
