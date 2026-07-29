# ADR-003: Token-Savings Accounting — Compression Ledger × Cache-Adjusted Effective Tokens

- **Status:** Accepted (Checkpoint 3 approved 2026-07-29)
- **Date:** 2026-07-29
- **Deciders:** Lead AI Engineer (architecture), Product Owner (approval)
- **Extends:** ADR-001, ADR-002

## Problem

"Token savings" is prompt2md's headline USP, so the number must be *honest and
auditable* — not marketing arithmetic. Two things make naive `raw − compressed`
reporting misleading:

1. Compression is multi-phase; a single number hides *where* savings come from
   (free deterministic stripping vs. paid LLM summarization).
2. Provider prompt caches change the economics entirely: a cached token costs
   10–50% of a fresh one, and Anthropic charges a 25% premium to *write* the
   cache. A layout that maximizes the stable prefix can beat further
   summarization without touching content.

## Alternatives evaluated

| Option | Verdict |
|---|---|
| **A. Report `raw − compressed` only** | Rejected: ignores cache economics — understates real savings by up to ~10× on repeat calls, and can't justify the LAYOUT phase's existence. |
| **B. Bill-based accounting (query provider billing/usage APIs)** | Rejected for core: correct but async, credentialed, and provider-specific; belongs in the web dashboard as a *validation* layer, not in the hot path. |
| **C. Compression ledger × cache-adjusted effective tokens (chosen)** | Deterministic, provider-parameterized, computable offline at conversion time, and every input to the formula is visible in the report. |

## Decision

Every compression result carries a `SavingsReport` with two orthogonal parts:

**1. The phase ledger** — tokens after each of the 4 phases, so the report
shows what each phase contributed:

| Phase | Mechanism | Cost |
|---|---|---|
| 1 STRUCTURE | parse to MarkdownDoc IR (spans anchor the original) | free |
| 2 STRIP | deterministic boilerplate removal + dedupe | free |
| 3 SUMMARIZE | middle-context summarization; head/tail verbatim; tables/code/headings never touched; adaptive shrink factor `(budget − protected) / candidates` | LLM call (or free extractive fallback) |
| 4 LAYOUT | stable-prefix ordering + cache breakpoint + volatile stamp last | free |

**2. Cache-adjusted effective tokens** — with `P` = stable-prefix tokens,
`V` = volatile tokens, and the provider profile `(r, w, m)` = (readCostFactor,
writePremium, minPrefixTokens):

```
eligible        = P >= m
effective_first = eligible ? P·(1 + w) + V : P + V
effective_next  = eligible ? P·r + V       : P + V
amortized(N)    = (effective_first + (N−1)·effective_next) / N
headline        = 1 − effective_next / rawTokens     ("subsequent savings vs raw")
```

Profile constants live in `@prompt2md/core` `CACHE_PROFILES` (anthropic
r=0.1/w=0.25, openai r=0.5/w=0, gemini r=0.25/w=0, kimi r=0.1/w=0 conservative)
so a pricing change is a one-line, test-covered edit.

**Worked example** (unit-tested in `savings.test.ts`): a 10,000-token raw
context compressed to 2,500 (2,000 stable + 500 volatile), Anthropic profile:

- first call: 2,000 × 1.25 + 500 = **3,000 effective tokens**
- repeat calls: 2,000 × 0.1 + 500 = **700 effective tokens**
- amortized over 10 calls: 930
- headline: **93% cheaper per repeat call** than pasting the raw context

**Losslessness invariant:** savings are only claimable because nothing is
destroyed — the original is stored (content-addressed) *before* phase 1 runs,
and every summarized section embeds `<!-- p2md:src=<id>#<start>-<end> -->`,
resolvable via the `retrieve_original` MCP tool. An agent that needs a detail
back pays for that one span, not for having carried the whole document.

## Consequences

- (+) Every number in the report is reproducible from the profile constants
  and the section list; no black-box claims.
- (+) The headline metric argues for prompt2md in the agent's own currency
  (effective tokens per call), which no competitor reports (see
  `docs/research/COMPETITIVE-LANDSCAPE.md`).
- (−) Token counts use the chars/4 heuristic by default (±10%); reports name
  the counter used, and exact tokenizers are injectable via `TokenCounter`.
- (−) `writePremium`/`readCostFactor` values drift with provider pricing;
  they are data, not code, and flagged for re-verification before GA.
- (→) The web dashboard (Epic 5) may add Option-B billing validation as a
  cross-check.

## References

- Implementation: `packages/hermes-mcp/src/compress/{savings,compressor}.ts`
- Tests: `packages/hermes-mcp/test/{savings,compressor,server}.test.ts` (27 passing)
- Cache profiles: `packages/core/src/gateway/cache-profiles.ts`
