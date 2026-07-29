# Fixtures — Data-First Test Corpus

Every feature in `packages/core` is written **against these fixtures first** (golden-file
testing). Each case directory contains:

| File | Purpose |
|---|---|
| `input.*` | Raw, unmodified source (text, HTML, CSV, or extracted text standing in for a binary) |
| `expected.md` | The target token-optimized, layout-aware Markdown the pipeline must emit |
| `case.json` | Routing + assertion metadata (see schema below) |

## `case.json` schema

```json
{
  "id": "01-messy-prompt",
  "title": "Human-readable name",
  "inputKind": "prompt | email | html | pdf-table | csv | scanned-pdf",
  "expectedEngine": "prompt-optimizer | markitdown | docling",
  "routingReason": "Why the router must pick that engine",
  "features": ["list of pipeline features this case exercises"],
  "tokens": {
    "inputApprox": 0,
    "expectedApprox": 0,
    "note": "Approximate GPT/Claude BPE counts (chars/4 heuristic); exact counts asserted in tests via tokenizer"
  },
  "binarySource": "optional — script that regenerates a binary input (PDF/DOCX) for engine integration tests"
}
```

## Conventions

- `expected.md` is **normative**: conformance tests diff pipeline output against it
  (whitespace-insensitive, then strict once engines stabilize).
- Binary inputs (PDF, DOCX, scanned images) are **generated, not committed** — run
  `python fixtures/scripts/make_binary_fixtures.py` to build them into
  `fixtures/_generated/`. This keeps the repo text-only and diffable.
- Token counts in `case.json` are heuristics for humans; tests compute real counts
  with a tokenizer and assert `expected <= input * maxRatio` from the case metadata.

## Case index

| Case | Input kind | Engine | What it proves |
|---|---|---|---|
| `01-messy-prompt` | Rambling pasted prompt | prompt-optimizer | Messy-prompt cleanup, dedupe, structure recovery |
| `02-meeting-email-thread` | Email thread | prompt-optimizer | Quote stripping, decision/action extraction |
| `03-html-article` | Web article with chrome/junk | markitdown | Boilerplate removal, heading hierarchy |
| `04-financial-pdf-table` | Multi-level financial table | docling | Layout-aware table reconstruction |
| `05-csv-inventory` | CSV export | markitdown | Fast-path structured data → MD table |
| `06-scanned-invoice` | Image-only scanned PDF | docling | OCR route detection, key-value extraction |
