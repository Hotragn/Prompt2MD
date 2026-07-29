# Competitive Landscape (verified 2026-07-29)

## Document-to-Markdown engines (open source)

| Tool | What / license | Strength | Gap prompt2md exploits |
|---|---|---|---|
| **Docling** (LF AI & Data / IBM) | PDF/Office/HTML → MD+JSON+DocTags; MIT | Best layout fidelity, enterprise governance | Fidelity-first: no token budgeting, no compression reporting |
| **MarkItDown** (Microsoft) | Any-file → MD lib/CLI/MCP; MIT; ~139k stars | Ubiquity, official MCP server | Fast-but-lossy; a 60-page PDF dumps 40k+ uncurated tokens into context |
| **Marker** (Datalab) | PDF → MD/JSON; code Apache-2.0, weights OpenRail-M (<$5M revenue) | Speed/accuracy balance | Commercial license friction; docs only |
| **MinerU** (OpenDataLab) | Science-PDF pipeline + MinerU2.5-Pro VLM | Formulas, multi-column | Heavy GPU stack; no token features |
| **Pandoc / pdfplumber / Nougat** | Format converter / extraction primitives / academic VLM (maintenance mode) | Mature | No LLM-consumption awareness at all |

## Commercial parsing APIs

| Tool | Pricing | Gap |
|---|---|---|
| **Unstructured.io** | ~$1–10/1k pages (free tier trains on your docs) | RAG-chunking focus, not token-cost focus |
| **LlamaParse** | credits, 1–90/page by mode | Manual cost tiers, cloud-only — closest thing to our routing, but not automatic |
| **Reducto / Chunkr** | enterprise credits / AGPL+cloud | Proprietary or AGPL; no client-side optimization |
| **Mistral OCR 4 / olmOCR** | $4/1k pages ($2 batch) / open Apache VLM | OCR only — no pipeline, no compression |

## Web-to-Markdown

- **Jina Reader** (r.jina.ai) — acquired by Elastic Oct 2025, roadmap uncertain. URL-only.
- **Firecrawl** — "LLM-ready markdown," ~67% fewer tokens than raw HTML, native MCP,
  free–$599/mo. URL-only; no local files, no compression beyond HTML stripping.

## Prompt optimization

- **LLMLingua / LLMLingua-2** (Microsoft, MIT) — up to 20× compression, <2% loss;
  research-grade, needs a local SLM, not wired into any document pipeline or MCP.
- **Provider prompt caching** — Anthropic 90% read discount (explicit breakpoints),
  OpenAI 25–50% automatic, Gemini 90%. **Nobody structures converted documents to
  maximize cache hits** — left entirely to the developer today.

## USPs prompt2md will own

1. **Token cost as first-class output** — compression ratio, per-section token
   counts, `--token-budget` enforcement. Completely unclaimed.
2. **Agent-native conversion** — MCP + skill that converts-then-distills instead of
   dumping 40k tokens, with `retrieve_original` lossless fallback. The 2026
   "skills over MCP token bloat" trend validates this.
3. **Automatic dual-engine routing** — no OSS tool auto-routes fast vs. fidelity by
   content. Defensible.
4. **Prompt-cache-aware layout** — stable prefixes, provider breakpoint profiles.
   Zero competitors; compounds with #1.
5. **Messy-prompt cleanup** — nobody accepts a rambling prompt and returns a
   structured, deduplicated Markdown spec. Hardest to benchmark → ship with evals.

## Threats

- Docling absorbing token features post-Linux-Foundation donation.
- Firecrawl expanding from URLs to local files.
- **Posture:** position as the *optimization layer above engines*, never as a
  competing parser — engine improvements make us better, not obsolete.

Key sources: <https://github.com/docling-project/docling> · <https://pypi.org/project/markitdown/> · <https://github.com/datalab-to/marker> · <https://github.com/opendatalab/mineru> · <https://docs.unstructured.io> · <https://www.llamaindex.ai/pricing> · <https://reducto.ai/pricing> · <https://github.com/lumina-ai-inc/chunkr> · <https://mistral.ai/news/mistral-ocr-3/> · <https://www.firecrawl.dev/> · <https://www.prompthub.us/blog/compressing-prompts-with-llmlingua-reduce-costs-retain-performance>
