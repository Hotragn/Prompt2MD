---
name: prompt2md
description: Convert unstructured text, messy prompts, and documents (PDF, Office, HTML, CSV, scans) into token-optimized, layout-aware Markdown with an honest token report; compress oversized context to a token budget; retrieve the verbatim original behind any compressed section. Use when the user asks to "clean up this prompt", "convert this to markdown", "reduce tokens", "make this cheaper", "fit this in the context window", or asks to restructure a prompt, convert a document or web page, or batch-convert files.
version: 0.1.0
---

# prompt2md — token-optimized Markdown conversion

Convert content into Markdown that is cheap to keep in context, without ever
losing information: every compression is reversible via stored originals.

## Tool selection

Prefer the **MCP tools** when the `prompt2md-hermes` server is connected
(`convert`, `compress_context`, `retrieve_original`). Otherwise use the **CLI**
(`prompt2md`, installable with `npm i -g prompt2md`). Both expose the same pipeline; flags and
arguments map 1:1.

| Goal | MCP | CLI |
|---|---|---|
| Convert file/text | `convert {text\|path, tokenBudget?, fidelity?}` | `prompt2md convert <file> [-b N] [-f mode]` |
| Index a large doc | `outline {text, previewChars?}` | — |
| Compress context | `compress_context {text, tokenBudget, provider?}` | `prompt2md compress <file> -b N [--provider p]` |
| Recover original | `retrieve_original {anchor\|sourceId}` | `prompt2md retrieve <anchor\|sourceId>` |
| Many files | — | `prompt2md batch "docs/**/*.pdf" -d out/ [--report]` |
| Diagnose setup | — | `prompt2md doctor` |

## Workflows

**1. Messy prompt cleanup.** Pass the raw prompt as `text`. The result is a
structured Markdown spec with duplicates collapsed and every requirement
preserved. Present the cleaned version; never re-add removed filler.

**2. Document conversion.** Pass a file path. Routing is automatic
(fast path for HTML/Office/CSV/simple PDFs; high-fidelity engine for scans and
complex tables). Only override with `fidelity: "high"` when the user insists on
maximum table/scan fidelity, or `"fast"` for speed on bulk text.

**3. Fitting a context budget.** Use `tokenBudget`. Head and tail stay
verbatim; middle prose is summarized; tables/code/headings are never
summarized. The output may exceed a very small budget — check the
`budget-exceeded` warning instead of assuming.

**3b. Large document, narrow question — prefer `outline` over a budget.** When
the task needs a few sections out of many (searching a contract, answering one
question about a long report), call `outline` first. It returns headings
verbatim plus a one-line stub per section carrying a preview and an anchor.
Read the stubs, decide which sections matter, then `retrieve_original` on those
anchors only. Nothing is summarized, so nothing is approximated, and unread
sections are never paid for. Quote retrieved text, never a stub preview — the
preview is clipped and exists only to choose by. Reach for `tokenBudget`
instead when the whole document genuinely has to be present at once.

**4. Chat-box optimization.** When the user pastes long raw content (logs,
emails, docs, rambling requirements) intended as context for further work,
convert or compress it FIRST, then work from the optimized Markdown — and tell
the user what it saved. For coding requests, the optimizer emits a
Task/Goal/Requirements/Constraints structure with identifiers and error
messages kept verbatim in backticks, ending with a ponytail-style "## Approach"
minimal-code directive; use that structure as the working spec and honor the
directive (least code that satisfies the requirements). If the ponytail skill
is installed, run its review flow on the resulting diff.

**5. Recovering detail.** Compressed sections end with an anchor comment:
`<!-- p2md:src=<id>#<start>-<end> -->`. When the user asks about anything in a
summarized region, call `retrieve_original` with that anchor BEFORE answering —
never answer from a summary when the verbatim source is one call away. Quote
the retrieved text, not the summary.

## Reporting rules

- Every conversion returns a token report. When the user cares about cost,
  relay: input→output tokens, ratio, and (after compression) the repeat-call
  effective cost and `subsequentSavingsVsRawPct`.
- Numbers come from the report only. Never invent or extrapolate savings.
- Surface warnings (`engine-fallback`, `budget-exceeded`, `low-yield`) to the
  user in one plain sentence each; they signal degraded output, not failure.
- Token counts are heuristic (chars/4) unless an exact tokenizer was injected —
  say "approximately" when quoting them.

## Choosing a cache provider profile

Pass `provider` matching where the output will be used (`anthropic` default,
`openai`, `gemini`, `kimi`). It controls section layout (stable prefix first,
cache breakpoint marker) and the savings math — not the conversion itself.

## Failure modes

- `docling engine not configured` — scans/complex tables need docling-serve;
  suggest `prompt2md doctor` and setting `P2MD_DOCLING_URL`.
- `LLM gateway not configured` warning — output used deterministic cleanup;
  results are correct but less compact. Suggest setting `P2MD_LITELLM_BASE_URL`.
- markitdown worker errors — Python sidecar missing; suggest
  `pip install "markitdown[all]"`.
