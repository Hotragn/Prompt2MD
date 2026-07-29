# Engine Research — Docling & MarkItDown (verified 2026-07-29)

## Docling (docling-project/docling)

- **2.116.0** (2026-07-29), releases every 3–7 days; Python ≥3.10. Hosted by the
  **LF AI & Data Foundation** (donated by IBM Research Zurich, still primary
  maintainers); ~64k stars. Companions: docling-core, docling-serve, docling-jobkit,
  docling-parse (v7 as of docling 2.106.0).
- **Capabilities:** PDF layout analysis, reading-order detection, **TableFormer**
  table structure, formula/code recognition, picture classification, chart-to-table,
  OCR via EasyOCR/RapidOCR/Tesseract/VLM (Nanonets OCR2).
- **Formats:** in — PDF, DOCX, PPTX, XLSX, HTML, EPUB, images, audio (ASR), WebVTT,
  EML/MSG, LaTeX, ODF, XBRL, video, BoxNote. Out — DoclingDocument; Markdown, HTML,
  lossless JSON, **DocTags**, DocLang, WebVTT.
- **Production:** **docling-serve** REST (`POST /v1/convert/source`, async + task
  polling/WebSocket); container images base/-cpu/-cu128/-cu130 (4.4–11.4 GB);
  horizontal scaling via Redis RQ workers or Kubeflow; model prefetch with
  `docling-tools models download` → `artifacts_path` for air-gapped deploys.
  GPU strongly recommended at volume; reuse a loaded `DocumentConverter` for batch.
- **VLM pipeline:** granite-docling-258M (superseded SmolDocling); Transformers,
  MLX (~6 s/page vs ~102 s CPU on Apple silicon), or remote OpenAI-compatible
  endpoints (vLLM/Ollama preset since 2.66.0).
- **Weaknesses:** memory — OOM on very large PDFs (killed ~page 345 on 32 GB,
  docling#3345; 900+ pages, #1654; 3× memory regression, #2786; cross-conversion
  leak, #2788). Workarounds: **pypdfium2 backend**, 50–100-page `page_range`
  chunks, disable OCR when not needed. CPU-only is seconds-per-page.
- **From Node/TS:** REST via docling-serve (recommended); official `docling-ts` /
  `@docling/docling-core` npm packages type the *output* (not conversion);
  community `docling-sdk` wraps API + CLI subprocess.

Sources: <https://pypi.org/project/docling/> · <https://github.com/docling-project/docling/blob/main/CHANGELOG.md> · <https://github.com/docling-project/docling-serve> · <https://docling-project.github.io/docling/usage/advanced_options/> · <https://docling-project.github.io/docling/usage/vision_models/> · <https://github.com/docling-project/docling-ts>

## MarkItDown (microsoft/markitdown)

- **v0.1.7** (2026-07-29; 0.1.6 May 2026); Python ≥3.10; still 0.x (API may move).
  0.1.7 fixed O(n²) PPTX chart conversion and LaTeX/OMML math bugs.
- **Formats:** PDF, DOCX, PPTX, XLSX/XLS, Outlook .msg, images (EXIF+OCR), audio
  (transcription), HTML, CSV/JSON/XML, ZIP (recursive), YouTube URLs, EPub.
  Extras: `[all]`, `[pdf]` (pdfminer-six + pdfplumber), `[docx]`, `[pptx]`,
  `[xlsx]`, `[outlook]`, `[audio-transcription]`, `[az-doc-intel]`, …
- **Philosophy:** Markdown as token-efficient LLM-native output; structure over
  visual fidelity; ~80 MB footprint, no GPU, fast by design (~0.6 s for a 14-page
  PDF in published comparisons).
- **Plugins & MCP:** third-party plugins off by default (`--use-plugins`,
  `#markitdown-plugin` tag); official **markitdown-mcp** (0.0.1a4) — STDIO /
  Streamable HTTP / SSE, single `convert_to_markdown(uri)` tool, **no auth** —
  localhost only.
- **LLM features:** pass `llm_client` + `llm_model` for image descriptions
  (standalone images and PPTX-embedded).
- **Weaknesses:** scanned PDFs → near-empty output (no built-in OCR); multi-column
  PDFs interleave; complex/merged tables still weak (pdfplumber addition helps
  simple ones); font-based formatting cues lost in PDFs.
- **From Node/TS:** no official JS port (discussion #190) — managed subprocess of
  the real Python package is the most faithful; unofficial `markitdown-ts`/`-js`
  are feature-incomplete.

Sources: <https://github.com/microsoft/markitdown> · <https://pypi.org/project/markitdown/> · <https://github.com/microsoft/markitdown/tree/main/packages/markitdown-mcp> · <https://github.com/microsoft/markitdown/discussions/190>

## Head-to-head (published third-party numbers)

| Metric | MarkItDown | Docling |
|---|---|---|
| 14-page PDF | ~0.6 s | ~41 s CPU / ~9 s MLX |
| Install footprint | ~80 MB | ~2.4 GB (with VLM) |
| Complex-table cell accuracy | weak (flattens) | ~97.9% (Procycons) |
| Aggregate quality (one comparison) | ~82% F1 | ~88% F1 (secondhand, treat as directional) |
| Scanned docs | near-empty | auto-OCR |

Sources: <https://www.danilchenko.dev/posts/markitdown-vs-docling-vs-marker/> · <https://procycons.com/en/blogs/pdf-data-extraction-benchmark/>
