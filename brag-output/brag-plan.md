# Brag Plan: prompt2md

Built with `/brag-slim` (the skill's own dispatch on Opus 5.5). Two deliverables:

1. `brag.mp4`, a vertical 1080x1920 launch video, 20 s, 30 fps, polished tone, with music and sound effects.
2. `prompt2md.gif`, a silent landscape loop for article embeds (HackerNoon and similar), plus an MP4 copy of the same loop and a 1400x600 still for HackerNoon's featured-image slot.

## What is it?

prompt2md folds messy prompts and documents into token-optimized Markdown, reports exactly how many tokens that took, and hands back the byte-exact original on demand.

## Who is it for?

Developers and heavy AI users who paste context into Claude, ChatGPT, Cursor, or an agent, and who pay for every token that goes in.

## The angle

The brand story, which is also the architecture: **everything else cuts, this folds.** Cutting (truncation, dropping the middle, summaries that replace the source) is irreversible. Folding makes the text smaller and leaves the original recoverable. The video shows a fold, then an unfold, then the crane, which is the fold made into an object.

The competitor showcase uses the site's own line ("Everything else cuts. This folds.") and names no competitor. That matches the posture in the internal landscape doc: prompt2md is the optimization layer above the engines, not a rival parser.

## Hook (first 2 to 3 seconds)

The landing page's real "Your prompt" pane fills the screen while the real sample prompt types in: *"ok so what i need is basically a python script..."*. Filler phrases dim as they land. By 1.5 s the "#" cursor clicks the ink **Fold it** pill and the prompt folds like paper. The finished Markdown opens out on the 2.0 s downbeat. That is messy to clean in under three seconds.

## Key moments

- The prompt folds up like an accordion and the real output opens out: `## Goal`, `## Requirements`, `## Constraints`, `## Notes`.
- The real ledger counts up: **before 150, after 127, 85% of original.**
- CLI: `prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"` returns the exact paragraph that the summary folded away, including "Key finding f-7."

## Outro

The Blender crane swings over the lockup, then **prompt2md** and *A Markdown Magic*, then the tool chips. The URL sits in an ink pill. Then silence.

## User flow shown

Entry: paste a prompt in the studio or landing demo. Key action: **Fold it**. Result: structured Markdown plus a token ledger. Second surface: the CLI compresses a long incident log, and `retrieve` unfolds any summarized line back to its source.

## Tone

- Preset: `polished`
- Direction (user): polished, professional, eye-catching. Open with the strongest real feature, use the project's real design and assets, keep on-screen text short, invent nothing.
- Interpretation: three scenes with long holds. Paper folds are the only transitions. One accent colour, used sparingly. The fold is the spectacle, so the type stays calm.

## Format

- Video: vertical 1080x1920, 20.0 s, 30 fps
- GIF: landscape 1200x675, about 9 s loop, 15 fps, target under 5 MB

## Visual identity (from `apps/web/app/globals.css` and `docs/BRAND.md`)

- Background: `#FAF9F6` paper, with the hero's 56 px blueprint grid faded at the edges
- Panels: `#FFFFFF`, inset `#F4F2ED`, hairlines `#E7E4DC` / `#CFCAC0`
- Text: ink `#17151A`, muted `#5F5B66`, faint `#8B8794`
- Accent: violet `#5B3DF5` (identity only)
- Payoff: green `#15803D`, reserved for measured savings and the byte-exact tag
- Display: `ui-serif` stack (Palatino Linotype here), italic, for the tagline only
- UI: system sans (Segoe UI here). Mono: Cascadia Code
- Terminal: the CLI's own palette from `packages/cli/src/brand.ts`: glyph `◣` in `#7C5CFF`, paper `#F2EFEA`, slate `#78748A`, on ink
- Real assets: `brand-icon.svg`, the crane geometry from `FoldStory.tsx`, the Blender turntable `crane-turntable.mp4`, the "#" cursor from `MdCursor.tsx`, the `.pane`, `.btn`, `.ledger`, `.metric`, `.win`, `.tool-list` and `.eyebrow` styles

## Claims used, all from real runs on 2026-09-30

| On screen | Source |
|---|---|
| 150 to 127 tokens, 85% of original | Live `POST prompt2md.vercel.app/api/convert` with the landing sample. Engine `prompt-optimizer`, no LLM key |
| The Goal / Requirements / Constraints / Notes output | Same run, verbatim |
| 1,449 to 475 tokens | `npx prompt2md@0.1.1 compress incident.md -b 300`, and the live `/api/compress`, identical |
| Retrieved paragraph ending "Key finding f-7." | `npx prompt2md@0.1.1 retrieve "p2md:src=c6199e0698ecc214#2874-3278"`, checked byte-for-byte against the source (404 chars) |
| Tool list | The landing page's install section, backed by `SUPPORTED_TOOLS` in `apps/web/lib/facts.ts` |
| "No API key. No account." | The landing's "Works with nothing installed" tile. The run above used no key |

Rules honoured (from `docs/BRAND.md` and the project's standing rules): no percentage next to the word "lossless". Percentages always name their unit. The tagline is not reworded. No em dashes in on-screen copy. No competitor names.

## Share copy (draft)

Everything else cuts. prompt2md folds: paste a rambling prompt, get structured Markdown and an honest token count (150 to 127, no API key), and `retrieve` hands back the byte-exact original of anything it summarized. Open source.

## Audio direction

- Role: a warm, restrained bed that gets out of the way. Synthesized from scratch for this video, so there is no licensing question.
- Music: 120 BPM, half-time feel, D major. Pad intro, soft kick and sub on the fold's downbeat (2.0 s), a plucked arpeggio with ping-pong delay, and a dominant build under the byte-exact moment. It resolves to D when the crane appears (14.0 s), then rings out into silence.
- Sound effects in the same key and the same reverb space: soft key ticks under the typing, a woody click on Fold it, paper swishes on every fold and unfold, quiet rising ticks on the counter, and a bell on the three payoffs (85%, byte-exact, the lockup).
- Restraint: sound effects sit under the music, nothing spiky, no risers louder than the bed, and silence at the end.

## Storyboard (vertical)

### Scene 1: Fold (0.0 to 8.0 s)

Masthead lockup at the top. The hero title settles by 0.4 s: "Fold any text into **token-optimized Markdown**". Below it is the landing's fold-demo card in its phone layout.

- 0.0 to 1.2: the sample prompt types into the Your prompt pane, and filler phrases dim as they land. The token counter in the pane header climbs to 150. Sound: quiet key ticks.
- 1.2 to 1.5: the "#" cursor glides to **Fold it**, grows, and clicks. Sound: woody click.
- 1.5 to 2.0: the prompt folds up like an accordion. Sound: paper swish.
- 2.0 to 2.9: the Token-optimized Markdown pane opens out with the real output. Sound: the beat drops.
- 2.9 to 3.6: the ledger counts before 150 and after 127, then lands on 85% of original in green. Sound: counter ticks, then a bell.
- 4.2 to 8.0: caption "No API key. No account." Hold so the output can be read.
- Transition: the card folds away.

### Scene 2: Unfold (8.0 to 14.0 s)

Title: "Everything else cuts." then "This folds." on the next beat.

- 8.3 to 9.4: a doc card `incident.md` opens out, showing 1,449 to 475 tokens and three summarized updates, each ending `[…]` with its `p2md:src` anchor. The anchor on Update 7 is marked.
- 9.8 to 11.2: a terminal types `prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"` and hits Enter. Sound: ticks, then Enter.
- 11.3 to 12.2: the original paragraph opens out, with "Key finding f-7." lit. Sound: unfold swish.
- 12.3: tag "byte-exact". Caption: "The byte-exact original, back on demand." Sound: bell, then the dominant build.
- Transition: the scene folds away.

### Scene 3: Outro (14.0 to 20.0 s)

- 14.2 to 15.2: the Blender crane rises in, swinging between its three-quarter views. Sound: resolve to D.
- 15.2 to 16.0: lockup, badge plus **prompt2md**. At 15.8, *A Markdown Magic*. Sound: bell.
- 16.4 to 17.3: tool chips arrive one by one: Claude Code, Claude Desktop, Cursor, Windsurf, Gemini CLI, Codex CLI, any MCP client. Sound: quiet pentatonic plucks.
- 17.3: ink pill `prompt2md.vercel.app`, with "Open source, Apache-2.0" under it.
- 18.0 to 20.0: hold. The music rings out into silence.

Durations: 8.0 + 6.0 + 6.0 = 20.0 s.

## Storyboard (GIF, silent loop)

This is the landing's desktop hero demo, doing its job. Two panes sit side by side with the violet arrow between them, under the lockup and hero title.

- 0.0 to 0.9: the "#" cursor travels to **Fold it**.
- 1.0: press. The label changes to "Folding…".
- 1.3 to 2.3: the output opens out, and the filler in the input dims.
- 2.3 to 3.0: the ledger counts 150 to 127, then 85% of original.
- 3.0 to 7.4: hold for reading.
- 7.4 to 9.0: the output folds shut back to the idle state and the dimmed words come back. The loop restarts seamlessly.
