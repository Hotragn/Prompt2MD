# Integrating prompt2md

prompt2md plugs into your stack three ways: as an **MCP connector** (any MCP
client), as an **agent skill**, or **programmatically**. All surfaces share one
runtime and one set of env vars.

## 1. MCP connector — "type in the chat box"

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

## 4. Programmatic

```ts
import { createRuntimeFromEnv } from "@prompt2md/hermes-mcp";

const rt = createRuntimeFromEnv();
const { markdown, report } = await rt.convert({ kind: "text", text: raw }, {});
const { markdown: small, savings } = await rt.compress(big, { tokenBudget: 4000 });
```

Or over HTTP via the studio (`apps/web`): `POST /api/convert`,
`POST /api/compress`, `GET /api/retrieve?ref=...`.
