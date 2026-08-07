# prompt2md-skill

The `/prompt2md` agent skill: teaches your coding agent to turn messy prompts
and documents into token-optimized Markdown, and to report honestly what that
saved.

## Install

```bash
npx prompt2md-skill
```

Start a new agent session, then run `/prompt2md`. The skill also triggers on
its own when you ask to clean up a prompt, convert a document to Markdown, cut
token usage, or fit something into a context window.

Installs to `~/.claude/skills/prompt2md`, and to `~/.codex/skills` when Codex
CLI is present. Re-running is safe: an identical install is a no-op, and a copy
you have edited is backed up beside itself rather than overwritten.

| Flag | Effect |
|---|---|
| `--dry-run` | Print what would change, modify nothing |
| `--project` | Install into `./.claude/skills` for this repo only |
| `--dir <path>` | Install into an explicit skills directory |
| `--force` | Replace an existing skill without backing it up |

## What it does

The skill works on its own for prompt cleanup. Point it at rambling input and
it returns a structured spec with duplicates collapsed and every requirement
preserved, using your own words rather than a paraphrase.

Connect the engine (MCP server or CLI) and it also handles document conversion
(PDF, Office, HTML, CSV, scans), compression to a token budget, and byte-exact
retrieval of anything a summary replaced. The core promise is that compression
is reversible: every compressed section carries a `p2md:src` anchor, and the
skill is instructed to retrieve the verbatim original rather than answer from a
summary.

## Validate

```bash
pnpm --filter prompt2md-skill lint
```

Checks the SKILL.md frontmatter conventions and the packaging contract that
`npx prompt2md-skill` depends on.

Docs: <https://prompt2md.vercel.app> · Apache-2.0
