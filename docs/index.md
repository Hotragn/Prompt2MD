---
layout: home

hero:
  name: prompt2md
  text: A Markdown Magic
  tagline: Turn anything into token-optimized, layout-aware Markdown — and know exactly what it saved you. Fast, easy, reliable, and nothing is ever lost.
  image:
    src: /brand-icon.svg
    alt: prompt2md
  actions:
    - theme: brand
      text: Try the studio
      link: https://prompt2md.vercel.app/studio
    - theme: alt
      text: Get started
      link: /getting-started
    - theme: alt
      text: Integrations
      link: /INTEGRATIONS
    - theme: alt
      text: Architecture
      link: /architecture

features:
  - icon: 🧭
    title: Dual-engine routing
    details: Fast path (~0.6s) for HTML/Office/CSV/simple PDFs; high-fidelity TableFormer + OCR for scans and complex tables. Routed by content evidence, never by file extension.
  - icon: 🎯
    title: Token cost as a first-class output
    details: Every conversion returns a report — input/output tokens, compression ratio, per-section counts, and budget verdicts. Numbers you can reproduce, not marketing math.
  - icon: 🗂️
    title: Prompt-cache-aware layout
    details: Stable prefix first, provider-specific breakpoints, volatile content last. Repeat calls cost up to ~90% less on cache-enabled providers.
  - icon: 🔎
    title: Lossless by construction
    details: Originals are stored before compression touches them. Every summarized section carries a p2md:src anchor — retrieve_original returns the byte-exact source.
  - icon: 🤖
    title: Agent-native
    details: MCP server (convert, compress_context, retrieve_original, and an optimize chat-box prompt), a /prompt2md skill, and a batch CLI — all over one shared runtime.
  - icon: 🪶
    title: Degrades gracefully
    details: Zero sidecars configured? Deterministic cleanup and extractive summarization take over, with honest warnings. Nothing hard-fails on textual input.
---
