# @prompt2md/skill

The standalone `/prompt2md` agent skill: instructions that teach an agent when
and how to use prompt2md's MCP tools and CLI, including the
`retrieve_original` etiquette (never answer from a summary when the verbatim
source is one call away).

## Install

Copy the skill directory into an agent skills location:

```bash
# Claude Code — project scope
cp -r packages/skill/prompt2md .claude/skills/prompt2md

# Claude Code — user scope
cp -r packages/skill/prompt2md ~/.claude/skills/prompt2md
```

Then invoke with `/prompt2md` or let it trigger automatically on conversion /
token-budget / document-to-markdown requests.

## Validate

```bash
pnpm --filter @prompt2md/skill lint
```
