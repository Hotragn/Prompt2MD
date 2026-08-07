# Contributing to prompt2md

## Setup

```bash
pnpm install     # Node >= 20, pnpm >= 9
pnpm build && pnpm test
```

Optional engine sidecars for full-pipeline work: `pip install "markitdown[all]"`,
a docling-serve container (`P2MD_DOCLING_URL`), a LiteLLM proxy
(`P2MD_LITELLM_BASE_URL`). Everything else runs and tests without them.

## The two house rules

1. **Data first.** Every behavior change starts with a fixture: add or update a
   case in `fixtures/cases/<id>/` (raw input, normative `expected.md`,
   `case.json` routing/token assertions) *before* touching pipeline code. The
   conformance suites in `packages/core/test` enforce the corpus.
2. **Decisions get ADRs.** Anything that changes architecture (engine choice,
   routing thresholds, savings math) needs a short ADR in `docs/adr/` — problem,
   alternatives evaluated, justification. Threshold tweaks update ADR-002's table.

## Quality gates (all must pass; CI runs them on Linux + Windows, Node 20/22)

```bash
pnpm build && pnpm typecheck && pnpm test
pnpm --filter prompt2md-skill lint
```

- Strict TypeScript (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) — no `any`, no assertions to silence errors.
- Token-savings numbers must be reproducible from reports; never hard-code marketing math.
- Compression must stay lossless: anything summarized needs a working `p2md:src` anchor.

## Commits / PRs

Conventional commits (`feat(core): ...`, `fix(cli): ...`). One logical change
per PR, tests included, ADR updated when applicable.
