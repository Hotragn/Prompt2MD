# ADR-001: Dual-Engine Document Processing (MarkItDown fast path + Docling high-fidelity path)

- **Status:** Accepted (Checkpoint 1 approved 2026-07-29)
- **Date:** 2026-07-29
- **Deciders:** Lead AI Engineer (architecture), Product Owner (approval)

## Problem

prompt2md must convert everything from a pasted messy prompt to a 300-page scanned
contract into token-optimized Markdown. No single open-source engine is good at both
ends of that spectrum:

- Fidelity-first engines are slow and heavy. Docling on CPU runs seconds-per-page
  (~41 s for a 14-page PDF; ~9 s with MLX acceleration) with a ~2.4 GB model
  footprint, and has documented OOM failures on very large PDFs
  (docling#3345, #1654, #2786).
- Speed-first converters are lossy exactly where enterprises care. MarkItDown
  (~0.6 s for the same document, ~80 MB, no GPU) produces near-empty output on
  scanned PDFs, interleaves multi-column text, and historically flattens complex
  tables to run-on text.

Forcing every input through either engine alone fails: all-Docling makes a CSV or
HTML page cost 15–70× more latency for zero fidelity gain; all-MarkItDown silently
destroys tables and scans — the highest-value enterprise content.

## Alternatives evaluated

| Option | Verdict |
|---|---|
| **A. MarkItDown only** | Rejected: benchmark cell-accuracy gap on complex tables (Docling ~97.9% on complex-table benchmarks; aggregate quality ~88% vs ~82% F1 in published comparisons); no OCR path at all without Azure services. |
| **B. Docling only** | Rejected: 15–70× latency and ~30× install footprint on the ~80% of real workloads that are HTML/Office/simple text; CPU-only deployments become unusable for batch; large-PDF OOM risk on every job instead of a minority. |
| **C. Marker / MinerU as the fidelity engine** | Rejected for v1: Marker's model weights are OpenRail-M (revenue-capped commercial use — license friction for an Apache-2.0 platform); MinerU needs a heavy GPU stack. Docling is MIT/Apache, LF AI & Data-governed, and ships TableFormer + OCR + VLM (granite-docling) under one roof. Both remain candidates as pluggable engines later. |
| **D. Single VLM pipeline (granite-docling/olmOCR for everything)** | Rejected: highest per-page cost of all options; overkill for born-digital text; still maturing on dense tables. Reserved as an escalation tier inside the Docling path. |
| **E. Dual-engine with content-based router (chosen)** | Fast path handles the cheap 80%; fidelity path handles the hard 20%; router escalates on evidence, not file extension alone. |

## Decision

Route by **content probes, not just mime type**:

1. Plain text / prompts / emails → LLM prompt-optimizer path (no document engine).
2. HTML, Office, CSV/JSON, and PDFs with a healthy text layer and no detected
   table/multi-column regions → **MarkItDown** subprocess (fast path).
3. Escalate to **Docling** (via docling-serve REST) when probes find: empty/sparse
   text layer (scan → OCR), table regions, multi-column layout — or when the fast
   path's output yield is suspiciously low relative to input size (self-healing
   fallback).

Operational guardrails baked into the decision:

- Docling behind **docling-serve** containers (CPU and CUDA variants), models
  prefetched via `docling-tools models download`; Node.js never embeds Python.
- `pypdfium2` backend + ≤100-page chunking as default Docling options, directly
  addressing the community-documented OOM failure mode.
- Both engines sit behind one `Engine` TypeScript interface; the router is a pure
  function `(SniffReport) → EngineChoice` so it is unit-testable against
  `fixtures/cases/*/case.json` routing assertions.

## Consequences

- (+) Latency/cost proportional to document difficulty; CSVs stay sub-second while
  scanned contracts still come out structured.
- (+) Fixture corpus can assert routing decisions (`expectedEngine`) independently
  of conversion quality.
- (−) Two Python runtimes to operate; mitigated by containerized docling-serve and
  a vendored, version-pinned MarkItDown environment.
- (−) Router misroutes are a new failure class; mitigated by the low-yield
  self-healing escalation and per-case routing tests.
- (→) ADR-002 (Phase 2) will specify probe thresholds and the exact escalation
  heuristics.

## References

- Engine research: `docs/research/ENGINES.md` (Docling 2.116.0, MarkItDown 0.1.7, July 2026, with sources)
- Competitive analysis: `docs/research/COMPETITIVE-LANDSCAPE.md`
- Benchmarks cited: danilchenko.dev MarkItDown/Docling/Marker comparison; Procycons PDF extraction benchmark
