---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Paste any messy prompt or document: prompt2md folds it into token-optimized Markdown with honest token numbers, and unfolds anything it summarized back to the byte-exact original."
destination: vertical-social
aspect: 1080x1920
language: en
audience: developers and heavy AI users who paste context into Claude, ChatGPT, Cursor or an agent and pay for every token
length: 30s
angle: "Everything else cuts. This folds."
narration: yes
---

## Intent

A launch film for prompt2md, an open-source tool (CLI, MCP server, agent skill, web studio) that turns messy prompts and documents into token-optimized Markdown, reports exactly how many tokens that took, and keeps the original recoverable byte for byte. It must look like a top-company launch film: professional and eye-catching, not a screen recording of the landing demo. The first cut (a faithful replay of the landing UI on paper) was rejected for exactly that reason.

Look, as chosen: **ink to paper**. Open in ink-black on the mess (a rambling prompt, context being cut), and on the fold the world turns into the warm-paper brand, with depth, light, 3D camera moves and the origami-crane reveal. The fold is the signature move, because it is literally the product's architecture: folding makes text smaller without removing anything, and unfolding returns the original exactly.

Voiceover: yes, AI narrator. Length about 30 seconds. Vertical for Reels, Shorts, TikTok, X and LinkedIn. A landscape article GIF for HackerNoon follows from the same film.

## Assets

- https://prompt2md.vercel.app — the live site; capture it for screens, brand tokens and assets.
- apps/web/public/brand-icon.svg — the crane mark (violet badge, paper-white facets, ink beak).
- apps/web/public/logo.svg — horizontal lockup: mark, "prompt2md" wordmark (violet "2md"), serif-italic tagline "A Markdown Magic".
- apps/web/public/crane-turntable.mp4 — the Blender-rendered 3D crane, swinging between three-quarter views, baked on paper #FAF9F6, 720x720, 2.5 s loop.
- apps/web/components/FoldStory.tsx — the site's own fold animation: a text sheet whose facets fly in to form the crane, then unfold back into the sheet with a "retrieve_original: byte-exact" tag.
- brag-output/work/composition/content.js — real on-screen text, copied verbatim from real runs on 2026-09-30 (the landing sample prompt, its exact Markdown output, the CLI compress excerpt and the retrieved span).

## Customizations

- Real numbers only, each from a run recorded in brag-output/brag-plan.md: the landing sample prompt goes 150 → 127 tokens (85% of original) with no API key; the studio's incident log compresses 1,449 → 475 tokens; `prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"` returns the exact 404-character original, including "Key finding f-7.", which the summary had folded away.
- Count-up treatment on the token numbers.
- Captions on, because voiceover plus vertical feeds that autoplay muted means the words must also be readable.

## Notes

- Brand: warm paper #FAF9F6, panels #FFFFFF, ink #17151A, one accent violet #5B3DF5 (identity only), green #15803D reserved for measured savings. Serif italic only for the tagline. Tagline "A Markdown Magic" must not be reworded.
- Honesty rules, binding: never put a savings percentage next to the word "lossless"; always name a percentage's unit ("of original", "of input"); never present the Daily Digest figure as typical; never claim Markdown syntax itself saves tokens.
- No em dashes in on-screen copy. Headlines at most two lines. No competitor names; "Everything else cuts" is the site's own line.
- Tool support list, from the site: Claude Code, Claude Desktop, Cursor, Windsurf, Gemini CLI, Codex CLI, any MCP client. Open source, Apache-2.0. CTA: prompt2md.vercel.app.
- Music and voice run on local engines (MusicGen, Kokoro) unless the user signs in to HeyGen before the audio step.
