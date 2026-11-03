---
format: 1080x1920
duration: 31s
message: "Paste any messy prompt: prompt2md folds it into token-optimized Markdown with honest token numbers, and unfolds anything it summarized back to the byte-exact original."
arc: Hook (the mess, in ink) → Turn (the fold, into paper) → Proof (live demo, the ledger, long context) → Difference (cut vs fold, the unfold) → Reach → Command
audience: developers and heavy AI users who paste context into Claude, ChatGPT, Cursor or an agent
mode: collaborative
music: warm minimal cinematic electronic underscore, soft pulsing synth bass, glassy plucks, confident and premium, opens up when the fold happens, resolves at the end
captions: on
---

# prompt2md — launch film v1

## Decisions

- **Message:** paste any messy prompt; prompt2md folds it into token-optimized Markdown with honest token numbers, and unfolds anything it summarized back to the byte-exact original.
- **Audience and arc:** developers and heavy AI users. Hook (the mess, in ink) → turn (the fold, into paper) → proof ×3 → the difference (cut vs fold, the unfold) → reach → the command.
- **Format:** 1080×1920, about 31 s, AI voiceover, music, captions on. Captions run, so key content stays in the top ~83% of the frame (above y ≈ 1590 px).
- **The spine:** one sheet of paper. It is the typed prompt in the dark (01), it folds and turns the world into paper (02), it is every output after that, it is sliced in the contrast beat (06), it unfolds in the terminal (07), and it returns as the 3D crane in the last beat (09), which calls back to the fold in 02.
- **Brand, from the capture** (`capture/extracted/tokens.json`, `frame.md`): paper `#FAF9F6` canvas, ink `#17151A` text, deep ink `#0F0E11` for the dark register and the terminal, violet `#5B3DF5` as the single accent, green `#15803D` only on measured numbers, tile `#F4F2ED`. Type: EB Garamond display, Inter sans, JetBrains Mono. Radii 8 and 12 px. Easing: the site's own `cubic-bezier(0.2, 0.7, 0.3, 1)`.
- **Bans:** no glow, lens flare or sparkles; no fake product UI (03 is a real recording; 07 shows real CLI output); no invented numbers; no competitor names; no em dashes on screen; no savings percentage beside the word "lossless"; no static end card. Avoid the slideshow (every beat a fresh card) and the screensaver (motion that says nothing).
- **Held frame:** 07. When "Key finding f-7." lights and the byte-exact stamp lands, everything holds still for about a second and the line lands.
- **Seam direction:** leftward. New content arrives from the right; outgoing content leaves to the left.
- **Truthfulness:** every number and every line of product text is from a real run on 2026-09-30, recorded in `../../brag-output/brag-plan.md`. The prompt is the landing page's own sample; 150 → 127 is the live `/api/convert` result for it; 1,449 → 475 is `npx prompt2md@0.1.1 compress` on the studio's own incident-log sample (the live API agrees); the retrieved paragraph is the CLI's stdout, checked byte-for-byte against the source (404 characters).

## Locked (plan, 2026-10-01)

- The user approved the 9-frame plan as written, chose sketches first, and picked the Kokoro voice `af_heart` from three samples.

## Locked (layouts, 2026-10-02)

- The user confirmed sketch sheet v1 (`storyboard.html`, cells `#frame-01` … `#frame-09`) as drawn: "Looks right, build it". Placement, hierarchy and copy are settled; the build dresses these layouts and never redraws them.

## Frame 1 — Typed (0.0–2.6s, ~2.6s)

- scene: Ink-black frame; the real sample prompt types itself in big mono, filler phrases tinted faint violet, a token counter climbing to 150.
- voiceover: "You write prompts like this."
- duration: 2.4s
- transition_in: cut
- status: built
- src: compositions/frames/01-typed.html
- type: hook
- persuasion: Pain validation, by direct address
- beat: recognition + tension
- blueprint: typewriter-reveal
- asset_candidates:

**On screen:** full-bleed deep ink `#0F0E11`. A caret types, left-aligned in JetBrains Mono at hero size, the landing page's sample prompt, verbatim: "ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11". The first two lines are legible at hero scale; the rest streams faster and smaller. As they land, the phrases the real pipeline dropped tint faint violet: "ok so", "basically", "oh and", "actually", "like i said", "did i mention to skip empty files? yeah", "one more thing -", "use pandas like i said. thanks!!!". Top right, a mono counter "tokens" climbs to "150".
**Hero prop:** the sheet (here it is only text on ink; it becomes paper in 02).
**Motion:** caret typing, fast and human (a single backspace-retype on "basically" is allowed); slow push-in on the text (scale 1.00 → 1.04); counter ticks.
**Seam out:** hard cut into the fold.
**Audio cue:** soft key ticks under a low synth swell.
**Constraint:** no window chrome or app frame around the text; no glitch effects.
**Why:** the hook speaks the viewer's own habit before naming the product.

## Frame 2 — Folded (2.6–6.2s, ~3.6s)

- scene: The ink sheet folds like paper and the world turns to warm paper; the fold opens into clean structured Markdown while the prompt2md lockup settles above it.
- voiceover: "Prompt-to-M-D folds it into clean Markdown."
- duration: 3.2s
- transition_in: cut
- status: built
- src: compositions/frames/02-folded.html
- type: product_intro
- persuasion: Transformation reveal (value claim in beat 2)
- beat: relief + curiosity
- blueprint: logo-assemble-lockup
- asset_candidates: assets/logo-a2f26c0d.svg — the square crane badge; assets/logo-lockup.svg — the horizontal lockup with the serif tagline; assets/svg-34dff80a.svg — the site's sheet-to-crane fold illustration (facet geometry)

**On screen:** opens on 01's last frame. The text block accordion-folds in 3D (horizontal creases catching light) and, following the fold, the ground turns from ink to paper `#FAF9F6`. The fold opens out into the real output, verbatim, in JetBrains Mono on a paper card: "## Goal", "what i need is a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files", "## Requirements", "- the output should be a single parquet file", "- please use pandas", "## Constraints", "- python 3.11", "## Notes", "- merge them all into one parquet". Above it the crane badge assembles from its five facets (wing, neck, body, tail, then the ink beak) and the wordmark "prompt2md" lands with "A Markdown Magic" in serif italic.
**Hero prop:** the sheet, now paper; the crane is born here.
**Motion:** accordion fold (~0.7 s, power2.inOut), ink-to-paper wipe riding the fold, facets fly in on a short stagger (the site's FoldStory choreography), wordmark slide-up.
**Seam out:** crossfade, leftward drift.
**Audio cue:** paper fold whoosh and a crisp crease; the music opens up; one soft bell as the lockup lands.
**Constraint:** never rotate the badge; no sparkles; no gradient on the card.
**Truth:** the Markdown is the live `/api/convert` output for 01's prompt, verbatim (excerpt).
**Why:** lands the promise by the second beat: messy in, clean Markdown out, and this is the product.

## Frame 3 — Live (6.2–9.8s, ~3.6s)

- scene: The real product on a phone: the landing demo recorded on prompt2md.vercel.app; a tap on Fold it, "Folding…", the real result arrives.
- voiceover: "Paste the mess. Hit Fold it."
- duration: 2.8s
- transition_in: crossfade
- status: built
- src: compositions/frames/03-live.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: clarity + satisfaction
- blueprint: device-surface-showcase
- asset_candidates: assets/fold-demo-mobile.mp4 — REAL phone-size recording of the live landing demo: tap on Fold it at ~1.2 s, live result at ~2.3 s, ledger BEFORE 150 → AFTER 127 · OF ORIGINAL 85%

**On screen:** the recording plays inside a floating phone-shaped window (rounded 44 px corners, hairline border, one soft warm shadow) on paper, tilted a few degrees in 3D, then the camera pushes in toward the output pane as the result lands. Kicker above: "◣ LIVE ON PROMPT2MD.VERCEL.APP".
**Hero prop:** the sheet, as the real output pane.
**Motion:** window enters from the right with a gentle 3D tilt that flattens; slow push-in timed to the result (~2.3 s into the clip).
**Seam out:** cut on the ledger, into 04 where the numbers take over.
**Audio cue:** a soft tap; a light whoosh as the result lands.
**Constraint:** no rebuilt UI over the recording; no fake cursor (it is a phone, the tap is real).
**Truth:** real footage, unedited apart from framing.
**Why:** proof the promise is real, in the actual product.

## Frame 4 — Ledger (9.8–12.6s, ~2.8s)

- scene: The ledger becomes the hero: 150 → 127 tokens in serif display with mono units, "85% of original" in green, "no API key".
- voiceover: "Structured Markdown, an honest token count, and no API key."
- duration: 4.3s
- transition_in: cut
- status: built
- src: compositions/frames/04-ledger.html
- type: benefit_highlight
- persuasion: Statistical proof
- beat: trust + mild surprise
- blueprint: dataviz-countup
- asset_candidates:

**On screen:** on paper, a number lockup: "150" in EB Garamond at hero scale with the mono unit "tokens", an arrow, then "127" counting in beside it with the same unit; beneath, "85% of original" in green `#15803D`, then "no API key" in mono. A faint ghost of the output card sits behind.
**Hero prop:** the numbers lifted out of 03's ledger, same values, same order.
**Motion:** "127" counts up beside "150" on the word "count"; "85% of original" lands on a spring pop; "no API key" types on.
**Seam out:** zoom-through into the long document.
**Audio cue:** quiet counter ticks; a soft bell when "85% of original" lands.
**Constraint:** the percentage always names its unit ("of original"); never the word "saved" next to it.
**Truth:** the live API report for the sample: inputTokens 150, outputTokens 127, engine prompt-optimizer, no LLM gateway configured.
**Why:** the honest number is the brand; it must read as measured, not marketed.

## Frame 5 — Fit (12.6–16.2s, ~3.6s)

- scene: A long incident log folds down: each paragraph collapses to a one-line summary with an anchor; 1,449 → 475 tokens, 33% of input.
- voiceover: "Too long? Fold fourteen hundred tokens to under five hundred."
- duration: 3.7s
- transition_in: zoom-through
- status: built
- src: compositions/frames/05-fit.html
- type: benefit_highlight
- persuasion: Feature-to-benefit translation (fits the window)
- beat: confidence
- blueprint: grid-card-assemble
- asset_candidates:

**On screen:** a tall paper document, the studio's own sample: "# Incident 4417, full timeline", then paragraphs "Update 0: engineers investigated subsystem 0 and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail. …". Paragraph by paragraph each folds down to its real one-line summary, "Update 7: engineers investigated subsystem 7 and recorded observations. […]", with its anchor beneath in faint mono, "<!-- p2md:src=c6199e0698ecc214#2874-3278 -->". The stack accumulates as a list. A number lockup lands: "1,449" → "475" "tokens", "33% of input" in green.
**Hero prop:** the sheet, folding in place.
**Motion:** per-paragraph accordion collapse on a 0.1 s stagger; the list settles; number count-down on "under five hundred".
**Seam out:** push-slide LEFT into the contrast.
**Audio cue:** a ripple of soft paper folds; one low tick on the number.
**Constraint:** show the anchors; never imply the summary is the whole story.
**Truth:** `prompt2md compress incident.md -b 300` → "compressed 1449→475 tokens (33% of input)"; the summary lines and anchors are its real stdout.
**Why:** proves it scales from a prompt to real context.

## Frame 6 — Cuts vs folds (16.2–19.0s, ~2.8s)

- scene: Split stage. Top: "Everything else cuts." over a page sliced off at a line, the lower half falling away into grey. Bottom: "This folds." over the same page folded, its anchors lit violet.
- voiceover: "Other tools cut and hope. This folds."
- duration: 2.6s
- transition_in: push-slide LEFT
- status: built
- src: compositions/frames/06-cuts-vs-folds.html
- type: feature_showcase
- persuasion: Negative contrast
- beat: conviction
- blueprint: comparison-split
- asset_candidates:

**On screen:** the site's own section title split across the two halves: "Everything else cuts." (ink, upper half) and "This folds." (violet, lower half). Upper page: a hairline cut line snaps across it and the part below drops away and fades to grey. Lower page: the same page, folded into its summary lines, each anchor glowing violet.
**Hero prop:** the sheet, shown both ways.
**Motion:** mirrored book-open tilts as the halves enter; the cut line draws in one fast stroke; the falling half drops under gravity.
**Seam out:** cut to the terminal.
**Audio cue:** a sharp paper snip on the cut, then a gentle fold.
**Constraint:** no competitor names or logos; no red alarm colours; no scissors clip-art.
**Truth:** both lines are the site's own copy ("Everything else cuts. This folds." and "Other tools cut and hope").
**Why:** names the difference rivals can't claim: folding is reversible.

## Frame 7 — Unfold (19.0–23.4s, ~4.4s)

- scene: An ink terminal on paper runs prompt2md retrieve on one anchor; the summarized line unfolds into its full original paragraph; "Key finding f-7." lights; a green byte-exact stamp lands; everything holds.
- voiceover: "Unfold any summary. The exact original comes back."
- duration: 4.4s
- transition_in: cut
- status: built
- src: compositions/frames/07-unfold.html
- type: feature_showcase
- persuasion: Risk reversal (nothing is thrown away)
- beat: trust + peace of mind
- blueprint: prompt-type-submit-generate
- asset_candidates:

**On screen:** a terminal card (deep ink `#0F0E11`, title bar "COMMAND LINE", CLI palette: violet `$` prompt, paper text). It types `prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"`, Enter, and the output unfolds line by line, verbatim: "Update 7: engineers investigated subsystem 7 and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Key finding f-7." "Key finding f-7." lights green. A stamp "✓ byte-exact" lands in the title bar. Then everything holds.
**Hero prop:** the sheet, unfolded back to the original.
**Motion:** typing at a human pace; output unfolds as an accordion opening; the highlight sweeps; then the held frame.
**Seam out:** crossfade.
**Audio cue:** key clicks, an Enter thock, a soft unfold, a clear bell on the stamp, then a beat of near-silence for the hold.
**Constraint:** this is the held frame; nothing moves after the stamp.
**Truth:** real CLI command and stdout (`npx prompt2md@0.1.1 retrieve`), byte-identical to the source span.
**Why:** the guarantee that makes folding different from cutting.

## Frame 8 — Everywhere (23.4–26.4s, ~3.0s)

- scene: The crane badge at the centre; the tools prompt2md plugs into orbit it as text chips; the camera pushes in on the hub.
- voiceover: "It plugs into Claude Code, Cursor, and any MCP client."
- duration: 4s
- transition_in: crossfade
- status: built
- src: compositions/frames/08-everywhere.html
- type: social_proof
- persuasion: Friction reduction (works where you already work)
- beat: confidence + belonging
- blueprint: constellation-hub
- asset_candidates: assets/brand-icon.svg — the crane badge as the hub

**On screen:** the badge at centre on paper; seven pill chips (the site's tool-list style: hairline border, white fill, muted ink) spring into a ring around it: "Claude Code", "Claude Desktop", "Cursor", "Windsurf", "Gemini CLI", "Codex CLI", "any MCP client". Kicker: "◣ ONE COMMAND WIRES EVERY TOOL".
**Hero prop:** the crane badge.
**Motion:** chips spring in around the ring on the VO cues; slow push-in on the hub.
**Seam out:** zoom-through into the close.
**Audio cue:** a soft pluck per chip, in key.
**Constraint:** text chips only; no third-party logos.
**Truth:** the list is the site's install section, backed by `SUPPORTED_TOOLS = 6` in `apps/web/lib/facts.ts` plus "any MCP client".
**Why:** lowers the cost of trying it.

## Frame 9 — Command (26.4–31.0s, ~4.6s)

- scene: The 3D crane swings in soft light above the lockup; a terminal pill types npx prompt2md-skill; the URL holds; the crane keeps moving to the last frame.
- voiceover: "Open source. Try it at prompt-to-M-D dot vercel dot app."
- duration: 4.6s
- transition_in: zoom-through
- status: built
- src: compositions/frames/09-command.html
- type: cta
- persuasion: Friction reduction + risk reversal (free, open source)
- beat: motivation
- blueprint: logo-assemble-lockup
- asset_candidates: assets/crane-turntable.mp4 — the 3D crane, swinging loop on paper; assets/logo-lockup.svg — the horizontal lockup

**On screen:** the Blender crane (looping) in the upper half on paper; below it "prompt2md" and "A Markdown Magic"; a small ink terminal pill types "npx prompt2md-skill"; the URL "prompt2md.vercel.app" in an ink pill; "Open source, Apache-2.0" beneath.
**Hero prop:** the crane, the callback to 02's fold.
**Motion:** crane rises in; lockup slide-up; the command types; the URL lands on "vercel dot app"; the crane keeps swinging to the final frame.
**Seam out:** none, the film ends on moving footage.
**Audio cue:** the music resolves; a last soft bell on the URL; ring-out into silence.
**Constraint:** no static end card; the crane is still moving on the last frame.
**Truth:** `npx prompt2md-skill` is the README's real quick-start command; the package is published on npm.
**Why:** closes on the command and the address, the next action.
