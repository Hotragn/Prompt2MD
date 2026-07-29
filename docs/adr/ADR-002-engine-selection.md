# ADR-002: Engine Selection — Cheap Byte Probes + Evidence-Based Escalation

- **Status:** Accepted (Checkpoint 2 approved 2026-07-29)
- **Date:** 2026-07-29
- **Deciders:** Lead AI Engineer (architecture), Product Owner (approval)
- **Extends:** ADR-001 (dual-engine architecture)

## Problem

ADR-001 committed to routing by content, not file extension. The open question:
*how much analysis do we spend before choosing an engine?* PDF content streams
are usually FlateDecode-compressed, so "does this PDF contain complex tables?"
cannot be answered from raw bytes — and answering it properly means running a
layout model, i.e. paying the Docling cost we are trying to avoid.

## Alternatives evaluated

| Option | Verdict |
|---|---|
| **A. Extension/mime map only** | Rejected: cannot distinguish a scanned PDF from a born-digital one — exactly the failure that makes MarkItDown silently return nothing. |
| **B. Full upfront parse (pdfjs-dist / docling first pass)** | Rejected: adds a heavyweight dependency or a model load to *every* input; the analysis cost approaches the conversion cost it's meant to save. |
| **C. ML router (train a classifier on document features)** | Rejected for v1: training data, drift, and explainability burden with no evidence the heuristics are insufficient. Revisit if misroute telemetry justifies it. |
| **D. Always-docling for PDFs** | Rejected: re-introduces the ADR-001 Option-B latency profile for the majority of born-digital PDFs. |
| **E. Cheap byte probes + evidence-based escalation (chosen)** | Probe what is reliably visible in raw bytes; for everything else, let the fast path run and judge its *output*. |

## Decision

Two-stage selection, both stages pure functions (`route()` and `shouldEscalate()`
in `packages/core/src/router/`), unit-tested against every fixture's
`expectedEngine` assertion.

**Stage 1 — byte-level probes (no model, no I/O beyond the bytes):**

| Evidence | Basis | Consequence |
|---|---|---|
| Email headers ≥ 2 (`From:`/`Subject:`/…) | plain text | prompt-optimizer |
| Uniform comma field counts (≥3 fields, ≥2 rows) | plain text | markitdown (csv) |
| Markup ratio > 0.2 or DOCTYPE | plain text | markitdown (html) |
| `%PDF` magic + **0 font objects + ≥1 image XObject** | PDF object dictionaries stay uncompressed even when streams are FlateDecode'd — font counts are trustworthy | docling + OCR (image-only scan) |
| `%PDF` magic + font objects present | same | markitdown, **provisional**, escalation armed |
| ZIP magic + OOXML extension | container | markitdown (office) |
| Undecodable binary | — | docling (safe default) |

**Stage 2 — escalation checks on fast-path output (PDF only):**

| Check | Threshold | Rationale |
|---|---|---|
| `low-yield` | < **200 chars/page** | A text extraction this thin means a missed scan or extraction failure. Retry runs with OCR on. |
| `table-degradation` | ≥ **2 lines** with ≥ **3 numeric clusters** and no pipe syntax | The signature of a text extractor running over a table region (fixture 04's raw extraction trips this; its golden pipe-table output does not). |

`fidelity: "fast"` pins the fast path and disarms escalation; `"high"` pins
docling; `ocr: true` forces the OCR route. Defaults calibrated against the
golden corpus and adjustable in one place (`THRESHOLDS`).

**Misroute cost asymmetry (why provisional-fast is the right default):** a wrong
fast-path pick costs one wasted MarkItDown run (~0.6 s) before Docling runs
anyway; a wrong Docling pick costs 15–70× latency on every such document with no
quality gain. The asymmetry says: guess fast, verify cheap, escalate on evidence.

## Consequences

- (+) Zero model loads and zero heavy dependencies at routing time; the router
  is a synchronous pure function.
- (+) Every routing rule is falsifiable by a fixture; corpus tests pin behavior
  (`router.test.ts`, `escalation.test.ts` — 44/44 passing).
- (−) A text-layer PDF whose *only* problem is multi-column interleave (no
  tables, healthy yield) will not self-escalate; mitigation: `fidelity: "high"`
  and a planned interleave heuristic once a fixture demonstrates it.
- (−) Thresholds are heuristics; they live in one exported `THRESHOLDS` object
  and misroutes surface as `engine-fallback` warnings for telemetry.

## References

- Implementation: `packages/core/src/router/{sniffer,router,escalation}.ts`
- Conformance: `packages/core/test/{router,sniffer,escalation,corpus}.test.ts`
- Engine characteristics: `docs/research/ENGINES.md`
