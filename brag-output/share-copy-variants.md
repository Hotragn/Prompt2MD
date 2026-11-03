# Share copy variants

`share-copy.txt` is the canonical caption. These are cut for specific places. Every number here comes from the same real runs listed in `brag-plan.md`.

## HackerNoon (or any article)

- **Featured image:** `hackernoon-featured.png` (1400x600, HackerNoon's recommended size). Featured images show as stills in listings and social cards, so this one is static.
- **In the body:** `prompt2md.gif`. HackerNoon accepts GIFs uploaded the same way as images.
- **Caption:** A rambling prompt folded into structured Markdown by prompt2md's live demo: 150 tokens in, 127 out, no API key.
- **Alt text:** Screen recording of the prompt2md web demo. A messy request for a Python CSV-merging script is on the left. After clicking Fold it, the filler phrases are struck through and a structured Markdown version appears on the right, with Goal, Requirements, Constraints and Notes sections. A ledger reads before 150, after 127, 85% of original.

## X / Threads (with `brag.mp4`)

Everything else cuts. This folds.

prompt2md turns a rambling prompt into structured Markdown (150 → 127 tokens, no API key), and `prompt2md retrieve` hands back the byte-exact original of anything it summarized.

Open source: prompt2md.vercel.app

## LinkedIn (with `brag.mp4`)

Most tools that shrink context for LLMs cut: they truncate, drop the middle, and hope you didn't need it.

prompt2md folds instead. Paste a messy prompt and you get structured Markdown and a token count you can check (the demo prompt goes 150 → 127 with no API key). Compress a long document and every summarized passage keeps an anchor that returns the exact source bytes.

It runs as a CLI, an MCP server, an agent skill and a web studio. Apache-2.0.

prompt2md.vercel.app

## Loop video (`prompt2md-loop.mp4`)

For places that turn GIFs into video anyway (X, LinkedIn, Slack), upload the MP4 loop instead of the GIF. It is sharper, a fraction of the size, and plays the same.
