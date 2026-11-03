---
format: 1080x1920
duration: 32s
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
- **Format:** 1080×1920, about 32 s, AI voiceover, music, captions on. Captions run, so key content stays in the top ~83% of the frame (above y ≈ 1590 px).
- **The spine:** one sheet of paper. It is the typed prompt in the dark (01), it folds and turns the world into paper (02), it is every output after that, it is sliced in the contrast beat (06), it unfolds in the terminal (07), and it returns as the 3D crane in the last beat (09), which calls back to the fold in 02.
- **Brand, from the capture** (`capture/extracted/tokens.json`, `frame.md`): paper `#FAF9F6` canvas, ink `#17151A` text, deep ink `#0F0E11` for the dark register and the terminal, violet `#5B3DF5` as the single accent, green `#15803D` only on measured numbers, tile `#F4F2ED`. Type: EB Garamond display, Inter sans, JetBrains Mono. Radii 8 and 12 px. Easing: the site's own `cubic-bezier(0.2, 0.7, 0.3, 1)`.
- **Bans:** no glow, lens flare or sparkles; no fake product UI (03 is a real recording; 07 shows real CLI output); no invented numbers; no competitor names; no em dashes on screen; no savings percentage beside the word "lossless"; no static end card. Avoid the slideshow (every beat a fresh card) and the screensaver (motion that says nothing).
- **Held frame:** 07. When "Key finding f-7." lights and the byte-exact stamp lands, everything holds still for about a second and the line lands.
- **Seam direction:** leftward. New content arrives from the right; outgoing content leaves to the left.
- **Build notes (2026-10-02):** registry blocks are hand-built from each frame's blueprint and rule recipes (an install would fetch files over the network, and the recipes already carry the mechanics). The two real clips ride in as frame-exact image sequences, `assets/fold-demo-seq/` (03) and `assets/crane-seq/` (09), so they tilt, push and transition with their frames; a hoisted `<video>` would be pinned to fixed geometry above the frame.
- **Truthfulness:** every number and every line of product text is from a real run on 2026-09-30, recorded in `../../brag-output/brag-plan.md`. The prompt is the landing page's own sample; 150 → 127 is the live `/api/convert` result for it; 1,449 → 475 is `npx prompt2md@0.1.1 compress` on the studio's own incident-log sample (the live API agrees); the retrieved paragraph is the CLI's stdout, checked byte-for-byte against the source (404 characters).

## Locked (plan, 2026-10-01)

- The user approved the 9-frame plan as written, chose sketches first, and picked the Kokoro voice `af_heart` from three samples.

## Locked (layouts, 2026-10-02)

- The user confirmed sketch sheet v1 (`storyboard.html`, cells `#frame-01` … `#frame-09`) as drawn: "Looks right, build it". Placement, hierarchy and copy are settled; the build dresses these layouts and never redraws them.

## Video direction

- **Palette system (frame.md):** cream `#FAF9F6` is the ground for 02–09; navy `#0F0E11` is the ink register (01 full-bleed; the terminal surface in 07 and the command pill in 09); ink `#17151A` carries all text on paper. "Coral" is prompt2md violet `#5B3DF5`: the ONE voltage moment per frame (the "2md" of the wordmark, the "##" marks, lit anchors, "This folds."). `savings` green `#15803D` only on measured numbers (04's "85% of original", 05's "33% of input", 07's stamp). Tile `#F4F2ED` for inset surfaces. The terminal uses the CLI palette (`cli-violet` prompt, `cli-paper` text, `cli-slate` chrome).
- **Type roles (frame.md):** display = EB Garamond (headlines, hero numbers); body/UI = Inter (the wordmark at 700, chips, labels); mono = JetBrains Mono (the prompt, code, units, kickers). No other faces.
- **Motion grammar + reveal model:** long-tail `power3` settles (`expo.out` on fast arrivals), never bouncy, no overshoot. Every reveal lands on the word that names it; each frame lists its **word cues** in frame-local seconds, and nothing enters before its cue. Holds are still (subtle jitter at most, `sine-wave-loop` low register). No slow drift, pan or push in any frame's back half. The only camera move in the film is the motivated push in 03, landing on the real result.
- **The signature move, the paper fold:** an accordion of 6–8 horizontal strips hinged alternately, the creases catching light (per-strip shading), ~0.6–0.8 s on `power2.inOut`. It turns ink into paper (02), folds paragraphs into summaries (05), answers the cut (06), and runs in reverse to unfold the original (07). Same feel every time. Realize it with CSS-3D (`techniques.md` CSS-3D / `css-3d-transforms`) inside the paused timeline.
- **Rhythm / held frames:** 01 is fast (typing); 02 opens up; 03 is real-time footage; 04 ends on a 0.9 s held read; 05 and 06 are brisk; **07 is the held frame** (its last ~1.1 s, nothing moves, not even the caret); 08 resolves; 09 holds ~1.9 s with only the crane moving.
- **Continuity (one world):** the paper sheet persists. 02's Markdown card returns as the ghost card in 04; 05's document is the page in 06; 06's folded page hands off to 07's terminal output. The crane is born in 02 (the flat badge assembling), anchors 08 (the hub), and returns as the 3D crane in 09.
- **Caption band:** the bottom ~17% (below y ≈ 1594 px of 1920) stays clear of key content in every frame.
- **Negative list:** no glows, flares, sparkles, bokeh, gradients on content or purple-blue "AI" gradients; no bouncy or overshoot eases; no fake product UI (03 is real footage, 07 is real CLI output, the Markdown in 02/04/05 is verbatim pipeline output); no third-party logos; no em dashes on screen; never a savings percentage beside the word "lossless"; percentages always name their unit; no static end card. Neither failure mode: the slideshow (front-load then freeze) or the screensaver (many things floating independently).

## Frame 1 — Typed (0.0–2.4s, ~2.4s)

- scene: Ink-black frame; the real sample prompt types itself in big mono, filler phrases tinted faint violet, a token counter climbing to 150.
- voiceover: "You write prompts like this."
- duration: 2.4s
- transition_in: cut
- status: animated
- src: compositions/frames/01-typed.html
- type: hook
- persuasion: Pain validation, by direct address
- beat: recognition + tension
- blueprint: typewriter-reveal (Adapt)
- asset_candidates:
- focal: none (typography)
- roles: none
- sfx: typing
- handoff_out: the typed sheet on the last frame (2.40 s) is exactly the DOM + CSS in `.hyperframes/handoff-01-02.html`: navy ground, kicker, counter "150", the full typed prompt with its violet-tinted runs, the caret ON at the end of the hero line; scale 1, opacity 1, nothing moving at the cut. Type INTO that fixed layout (untyped characters hidden, so no line ever reflows)
- registry: none installed (offline build): hand-build the typed prompt from the `typewriter-reveal` blueprint (navy ground, cli-paper JetBrains Mono, violet-tinted filler spans, the one backspace-retype); the catalog has no paper-fold block, so the fold in 02 is hand-authored

**On screen:** full-bleed deep ink `#0F0E11`. A caret types, left-aligned in JetBrains Mono at hero size, the landing page's sample prompt, verbatim: "ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11". The first two lines are legible at hero scale; the rest streams faster and smaller. As they land, the phrases the real pipeline dropped tint faint violet: "ok so", "basically", "oh and", "actually", "like i said", "did i mention to skip empty files? yeah", "one more thing -", "use pandas like i said. thanks!!!". Top right, a mono counter "tokens" climbs to "150".
**Hero prop:** the sheet (here it is only text on ink; it becomes paper in 02).
**Motion:** caret typing, fast and human (a single backspace-retype on "basically" is allowed); counter ticks. No push-in: the video direction allows no slow push, and 02 opens on this exact frame.
**Seam out:** hard cut into the fold.
**Audio cue:** soft key ticks under a low synth swell.
**Constraint:** no window chrome or app frame around the text; no glitch effects.
**Why:** the hook speaks the viewer's own habit before naming the product.

**Adapt:** keep the live caret typing a relatable line, with one backspace-and-retype (Hook variant); change the payoff. Instead of collapsing to a brand pop, the typed block holds and becomes the sheet that 02 folds, so the fold is the payoff, handed across the cut.

**Word cues (frame-local s):** You 0.07 · write 0.30 · prompts 0.54 · like 0.78 · this 1.01 (line ends 1.25).

**Shot:**
- Scene 1 (0.00–0.35s): full-bleed navy ground. The kicker "◣ YOUR PROMPT" (top-left, `cli-slate`) and the counter label "tokens" with "0" (top-right, mono) are already in place; the caret blinks at the line start (left ~8%, top ~20% of frame). **type-on with caret** (`discrete-text-sequence` + `context-sensitive-cursor`) starts at 0.05 s.
- Scene 2 (0.35–1.25s): on "You write prompts", the hero line types at a fast human pace in `cli-paper` mono, hero size: "ok so what i need is basically a python script that takes a folder of csv files". One **backspace-and-retype** on "basically" (types "basicly", deletes two characters, retypes "ally"). Filler phrases tint faint violet as they land. The counter climbs in step with the characters (`counting-dynamic-scale`, the number only, no size growth). Asymmetric editorial layout: hero line ~84% width, upper half.
- Scene 3 (1.25–2.20s): on "like this", the rest of the prompt streams in below at small size, dimming toward the bottom (texture, not for reading); the counter lands on exactly "150" as the stream finishes (~2.0 s).
- Scene 4 (2.20–2.40s): hold, the caret blinks once and is ON from 2.30 s, so the last frame matches the handoff. Hard cut.

## Frame 2 — Folded (2.4–5.6s, ~3.2s)

- scene: The ink sheet folds like paper and the world turns to warm paper; the fold opens into clean structured Markdown while the prompt2md lockup settles above it.
- voiceover: "Prompt-to-M-D folds it into clean Markdown."
- duration: 3.2s
- transition_in: cut
- status: animated
- src: compositions/frames/02-folded.html
- type: product_intro
- persuasion: Transformation reveal (value claim in beat 2)
- beat: relief + curiosity
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/logo-a2f26c0d.svg — the square crane badge; assets/logo-lockup.svg — the horizontal lockup with the serif tagline; assets/svg-34dff80a.svg — the site's sheet-to-crane fold illustration (facet geometry)
- focal: assets/logo-a2f26c0d.svg
- roles: logo-a2f26c0d.svg = cutout (the badge, built from its five facets) · logo-lockup.svg = supporting (reference for the wordmark + tagline; build them as live type) · svg-34dff80a.svg = supporting (facet geometry and the site's fold choreography)
- sfx: whoosh-cinematic, chime
- handoff_in: opens on 01's last frame, exactly the DOM + CSS in `.hyperframes/handoff-01-02.html` (same geometry, scale 1, opacity 1, static at t = 0); the fold starts from that state

**On screen:** opens on 01's last frame. The text block accordion-folds in 3D (horizontal creases catching light) and, following the fold, the ground turns from ink to paper `#FAF9F6`. The fold opens out into the real output, verbatim, in JetBrains Mono on a paper card: the whole output, every line (an excerpt would make the fold look lossy): "## Goal", "what i need is a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files", "## Requirements", "- the output should be a single parquet file", "- please use pandas", "- it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO", "- add logging", "- skip those", "- if a file fails to parse dont crash, just log it and continue", "## Constraints", "- python 3.11", "## Notes", "- merge them all into one parquet". Above it the crane badge assembles from its five facets (wing, neck, body, tail, then the ink beak) and the wordmark "prompt2md" lands with "A Markdown Magic" in serif italic.
**Hero prop:** the sheet, now paper; the crane is born here.
**Motion:** accordion fold (~0.7 s, power2.inOut), ink-to-paper wipe riding the fold, facets fly in on a short stagger (the site's FoldStory choreography), wordmark slide-up.
**Seam out:** crossfade, leftward drift.
**Audio cue:** paper fold whoosh and a crisp crease; the music opens up; one soft bell as the lockup lands.
**Constraint:** never rotate the badge; no sparkles; no gradient on the card.
**Truth:** the Markdown is the live `/api/convert` output for 01's prompt, verbatim and complete.
**Why:** lands the promise by the second beat: messy in, clean Markdown out, and this is the product.

**Adapt:** keep the parts-assembly signature (the badge built from its five facets flying in and locking, the wordmark joining); change the opener and the payoff. It starts on 01's ink frame, the "clear" is the paper fold that turns the ground to paper, and the payoff is the clean Markdown card opening out below the lockup.

**Word cues (frame-local s):** prompt2md 0.00 · folds 1.00 · it 1.19 · into 1.39 · clean 1.79 · Markdown 1.99 (line ends 2.39).

**Shot:**
- Scene 1 (0.00–0.80s): opens on 01's last frame (navy ground, the typed text, counter 150). **The fold:** the text block accordion-folds upward in 3D, creases lit, and the navy ground folds away with it top to bottom, revealing the cream ground. The fold starts from rest on 01's exact last frame (handoff_in).
- Scene 2 (0.20–1.00s): on "prompt2md", the five crane facets fly in from scattered offsets with rotation and lock into the badge in the upper third, centered: wing, neck, body, tail, then the ink beak, a short stagger (`depth-scatter-assemble`, settle on `power3`). The violet badge square scales in behind the facets as they lock (`spring-pop-entrance`, smooth, no overshoot). The wordmark "prompt2md" (Inter 700, violet "2md") slides out from behind the badge (`techniques.md` clip-path reveal) by 1.0 s.
- Scene 3 (1.00–2.40s): on "folds it into clean Markdown", "A Markdown Magic" fades up under the wordmark (EB Garamond italic, wide tracking) at 1.0 s; the Markdown card opens out below as an accordion unfold (Scene 1 in reverse), its lines landing top to bottom on a quick stagger: "## Goal" on "clean" (1.79), "## Requirements" and its six bullets on "Markdown" (1.99–2.45), "## Constraints" and "## Notes" by 2.6. Centered lockup, card below at ~84% width; mono ~30 px so the complete output fits above the caption band (card bottom ≤ 1560 px).
- Scene 4 (2.60–3.20s): held read.

## Frame 3 — Live (5.6–8.4s, ~2.8s)

- scene: The real product on a phone: the landing demo recorded on prompt2md.vercel.app; a tap on Fold it, "Folding…", the real result arrives.
- voiceover: "Paste the mess. Hit Fold it."
- duration: 2.8s
- transition_in: crossfade
- status: animated
- src: compositions/frames/03-live.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: clarity + satisfaction
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/fold-demo-seq/ — the REAL phone recording of the live landing demo (assets/fold-demo-mobile.mp4, 1080×1920, 30 fps) reduced to its 9 distinct frames `s01.png`–`s09.png` (every other frame duplicates the one before it), each shown from its recorded time (`assets/fold-demo-seq/manifest.json`): the pasted prompt → the real tap on Fold it → "Folding…" → the live result with the ledger BEFORE 150 → AFTER 127 · OF ORIGINAL 85%
- focal: assets/fold-demo-seq/ (image sequence of the real recording)
- roles: fold-demo-seq = cutout (the real recording as a frame-exact image sequence, 1080×1920 PNGs; the hero surface inside the phone window). Do not mount the .mp4: a hoisted video is pinned to fixed geometry above the frame and cannot tilt or push with the phone
- sfx: click-soft, whoosh-short
- registry: none installed (offline build): hand-build the phone window (rounded 44 px, hairline border, one soft warm shadow); its screen holds the real frames, never reconstructed UI

**On screen:** the recording plays inside a floating phone-shaped window (rounded 44 px corners, hairline border, one soft warm shadow) on paper, tilted a few degrees in 3D, then the camera pushes in toward the output pane as the result lands. Kicker above: "◣ LIVE ON PROMPT2MD.VERCEL.APP".
**Hero prop:** the sheet, as the real output pane.
**Motion:** window enters from the right with a gentle 3D tilt that flattens; slow push-in timed to the result (~2.3 s into the clip).
**Seam out:** cut on the ledger, into 04 where the numbers take over.
**Audio cue:** a soft tap; a light whoosh as the result lands.
**Constraint:** no rebuilt UI over the recording; no fake cursor (it is a phone, the tap is real).
**Truth:** real footage, unedited apart from framing.
**Why:** proof the promise is real, in the actual product.

**Adapt:** keep the floating surface held as the hero while its screen advances through a real flow (the floating-window push-in); change the content. The screens ARE the real recording, never rebuilt, and the advance is the real tap and the real result. Clip timing: the sequence plays the recording from its 0.05 s mark at 1×. Image swaps at frame-local s: s01 0.000 · s02 1.217 · s03 1.350 · s04 1.383 · s05 1.417 · s06 2.283 · s07 2.317 · s08 2.350 · s09 2.383; each holds until the next, and s09 holds to the end. The real tap lands on "Hit Fold it" (1.22 s) and the real result at 2.28 s.

**Word cues (frame-local s):** Paste 0.00 · the 0.28 · mess 0.56 · Hit 1.00 · Fold 1.22 · it 1.44 (line ends 1.65).

**Shot:**
- Scene 1 (0.00–0.55s): on "Paste the mess", the phone-shaped window (rounded ~44 px, hairline border, one soft warm shadow) arrives from the right with a gentle 3D tilt that flattens to a few degrees (`3d-page-scroll` tilt framing + `css-3d-transforms`, `power3`), centered at ~62% frame width. The kicker "◣ LIVE ON PROMPT2MD.VERCEL.APP" sits above it from 0.1 s. The recording shows the prompt in its pane.
- Scene 2 (0.55–1.65s): the window holds. On "Hit Fold it" the real tap happens inside the recording (~1.15 s): "Folding…".
- Scene 3 (1.65–2.80s): the real result lands (~2.25 s). ONE quick eased push-in toward the output pane as it lands (`multi-phase-camera` push phase + `coordinate-target-zoom`), settling by 2.7 s. Hard cut; the ledger in view carries into 04.

## Frame 4 — Ledger (8.4–12.7s, ~4.3s)

- scene: The ledger becomes the hero: 150 → 127 tokens in serif display with mono units, "85% of original" in green, "no API key".
- voiceover: "Structured Markdown, an honest token count, and no API key."
- duration: 4.3s
- transition_in: cut
- status: animated
- src: compositions/frames/04-ledger.html
- type: benefit_highlight
- persuasion: Statistical proof
- beat: trust + mild surprise
- blueprint: dataviz-countup (Adapt)
- asset_candidates:
- focal: none (typography; the number lockup is the hero)
- roles: none
- sfx: ping
- registry: none installed (offline build): hand-build the count (EB Garamond figure, JetBrains Mono unit, counts DOWN 150 → 127 on a seek-safe tween, restrained landing, no overshoot)

**On screen:** on paper, a number lockup: "150" in EB Garamond at hero scale with the mono unit "tokens", an arrow, then "127" counting in beside it with the same unit; beneath, "85% of original" in green `#15803D`, then "no API key" in mono. A faint ghost of 02's output card (the same complete Markdown) sits behind.
**Hero prop:** the numbers lifted out of 03's ledger, same values, same order.
**Motion:** "127" counts up beside "150" on the word "count"; "85% of original" lands on a spring pop; "no API key" types on.
**Seam out:** zoom-through into the long document.
**Audio cue:** quiet counter ticks; a soft bell when "85% of original" lands.
**Constraint:** the percentage always names its unit ("of original"); never the word "saved" next to it.
**Truth:** the live API report for the sample: inputTokens 150, outputTokens 127, engine prompt-optimizer, no LLM gateway configured.
**Why:** the honest number is the brand; it must read as measured, not marketed.

**Adapt:** keep the hero-metric count-up landing dead-center with its unit; change the instrument. No ring or chart: the instrument is the ledger itself (EB Garamond figures + JetBrains Mono units) on paper, one number pair, camera static.

**Word cues (frame-local s):** Structured 0.00 · Markdown 0.56 · an 1.34 · honest 1.54 · token 1.93 · count 2.33 · and 2.82 · no 3.03 · API 3.23 · key 3.85 (line ends 4.05).

**Shot:**
- Scene 1 (0.00–1.30s): on "Structured Markdown", a faint ghost of 02's output card settles in the upper area at ~70% width (a plain fade with a short rise); the kicker "◣ THE LEDGER" at 0.1 s. Nothing else yet.
- Scene 2 (1.30–2.45s): on "an honest token count", "150" with its mono unit "tokens" lands center at hero size at 1.4 s (`spring-pop-entrance`, smooth); the arrow fades in 1.7–1.9 s; "127" counts down from 150 (`counting-dynamic-scale`) 1.9–2.45 s, landing on "count".
- Scene 3 (2.45–3.40s): "85% of original" pops in green under the pair at 2.5 s (`spring-pop-entrance`, no overshoot); on "no API key" the mono pill "no API key" types on (`discrete-text-sequence`) 3.0–3.4 s.
- Scene 4 (3.40–4.30s): held read; everything still.

## Frame 5 — Fit (12.7–16.4s, ~3.7s)

- scene: A long incident log folds down: each paragraph collapses to a one-line summary with an anchor; 1,449 → 475 tokens, 33% of input.
- voiceover: "Too long? Fold fourteen hundred tokens to under five hundred."
- duration: 3.7s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/05-fit.html
- type: benefit_highlight
- persuasion: Feature-to-benefit translation (fits the window)
- beat: confidence
- blueprint: grid-card-assemble (Adapt)
- asset_candidates:
- focal: none (the document is typeset live from the real excerpt)
- roles: none
- sfx: whoosh-short, ping
- registry: none installed (offline build): hand-build the count (EB Garamond figure, mono unit, counts DOWN 1,449 → 475 on a seek-safe tween)

**On screen:** a tall paper document, the studio's own sample: "# Incident 4417, full timeline", then paragraphs "Update 0: engineers investigated subsystem 0 and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail. …". Paragraph by paragraph each folds down to its real one-line summary, "Update 7: engineers investigated subsystem 7 and recorded observations. […]", with its anchor beneath in faint mono, "<!-- p2md:src=c6199e0698ecc214#2874-3278 -->". The stack accumulates as a list. A number lockup lands: "1,449" → "475" "tokens", "33% of input" in green.
**Hero prop:** the sheet, folding in place.
**Motion:** per-paragraph accordion collapse on a 0.1 s stagger; the list settles; number count-down on "under five hundred".
**Seam out:** push-slide LEFT into the contrast.
**Audio cue:** a ripple of soft paper folds; one low tick on the number.
**Constraint:** show the anchors; never imply the summary is the whole story.
**Truth:** `prompt2md compress incident.md -b 300` → "compressed 1449→475 tokens (33% of input)"; the summary lines and anchors are its real stdout.
**Why:** proves it scales from a prompt to real context.

**Adapt:** keep the accumulating vertical list (the Benefits vertical-list BUILD mode: lines land and stay lit); change the entrance. Each list line is a full paragraph folding down in place into its one-line summary and anchor (the paper fold), not a slide-in; one number lockup above.

**Word cues (frame-local s):** Too 0.00 · long 0.29 · Fold 0.82 · fourteen 1.02 · hundred 1.40 · tokens 1.79 · to 2.18 · under 2.37 · five 2.76 · hundred 2.96 (line ends 3.34).

**Text, verbatim from the real run:** heading "# Incident 4417, full timeline". Paragraph N: "Update N: engineers investigated subsystem N and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail." (that sentence four times) "Key finding f-N." Summary N: "Update N: engineers investigated subsystem N and recorded observations. […]" with its anchor "<!-- p2md:src=c6199e0698ecc214#START-END -->"; real offsets 0:32-436 · 1:438-842 · 2:844-1248 · 3:1250-1654 · 4:1656-2060 · 5:2062-2466 · 6:2468-2872 · 7:2874-3278 · 8:3280-3684 · 9:3686-4090 · 10:4092-4499 · 11:4501-4908 · 12:4910-5317 · 13:5319-5726. Closing line, kept verbatim by the compressor: "Resolution: root cause was a stale feature flag; fixed at 14:02 UTC."

**Shot:**
- Scene 1 (0.00–0.80s): on "Too long?", the tall paper document rises in from below, taller than the frame, its paragraphs running off the bottom (`gsap-effects` rise, `power3`); "1,449" + "tokens" appears above it at 0.3 s.
- Scene 2 (0.80–2.40s): on "Fold fourteen hundred tokens", the paragraphs fold down one by one, top to bottom, ~0.12 s apart, each collapsing (the paper fold) into its real summary line with the faint mono anchor beneath (`center-outward-expansion` short-path form for the line arrivals); the stack tightens upward until it fits the frame.
- Scene 3 (2.40–3.10s): on "under five hundred", the figure counts down 1,449 → 475 (`counting-dynamic-scale`), landing on "hundred" (2.96); "33% of input" pops in green at 3.0 s.
- Scene 4 (3.10–3.70s): held read.

## Frame 6 — Cuts vs folds (16.4–19.0s, ~2.6s)

- scene: Split stage. Top: "Everything else cuts." over a page sliced off at a line, the lower half falling away into grey. Bottom: "This folds." over the same page folded, its anchors lit violet.
- voiceover: "Other tools cut and hope. This folds."
- duration: 2.6s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-cuts-vs-folds.html
- type: feature_showcase
- persuasion: Negative contrast
- beat: conviction
- blueprint: comparison-split (Adapt)
- asset_candidates:
- focal: none (two typeset pages)
- roles: none
- sfx: click, whoosh-short

**On screen:** the site's own section title split across the two halves: "Everything else cuts." (ink, upper half) and "This folds." (violet, lower half). Upper page: a hairline cut line snaps across it and the part below drops away and fades to grey. Lower page: the same page, folded into its summary lines, each anchor glowing violet.
**Hero prop:** the sheet, shown both ways.
**Motion:** mirrored book-open tilts as the halves enter; the cut line draws in one fast stroke; the falling half drops under gravity.
**Seam out:** cut to the terminal.
**Audio cue:** a sharp paper snip on the cut, then a gentle fold.
**Constraint:** no competitor names or logos; no red alarm colours; no scissors clip-art.
**Truth:** both lines are the site's own copy ("Everything else cuts. This folds." and "Other tools cut and hope").
**Why:** names the difference rivals can't claim: folding is reversible.

**Adapt:** keep the mirrored book-open split-tilt entry of two equal-weight panels and one inner-edge badge each (the signature); change the axis to stacked top/bottom for the vertical canvas, and the panels are pages, not feature cards.

**Word cues (frame-local s):** Other 0.00 · tools 0.41 · cut 0.62 · and 0.82 · hope 1.03 · This 1.49 · folds 1.82 (line ends 2.15).

**Shot:**
- Scene 1 (0.00–0.45s): the two halves arrive with mirrored 3D tilts, top from above and bottom from below, opening like a book (`split-tilt-cards`); "Everything else cuts." (EB Garamond display, ink) slides down into the top half (`gsap-effects`, `power3`).
- Scene 2 (0.45–1.40s): on "cut" (0.62), a hairline cut line snaps across the top page in one fast stroke (`svg-path-draw`, ~0.12 s); the part below falls away under gravity and greys out (`gsap-effects` translate + rotate + desaturate, `power2.in`) by "hope"; the top badge "✕ the detail is gone" lands at the top half's inner (bottom) edge at 1.1 s (`spring-pop-entrance`).
- Scene 3 (1.40–2.25s): on "This folds", "This folds." (EB Garamond, violet) lands in the bottom half; the same page folds into its summary lines with the anchors lit violet (a quick paper fold); the bottom badge "✓ anchored to the source" lands at the bottom half's inner (top) edge at 2.0 s.
- Scene 4 (2.25–2.60s): held read.

## Frame 7 — Unfold (19.0–23.4s, ~4.4s)

- scene: An ink terminal on paper runs prompt2md retrieve on one anchor; the summarized line unfolds into its full original paragraph; "Key finding f-7." lights; a green byte-exact stamp lands; everything holds.
- voiceover: "Unfold any summary. The exact original comes back."
- duration: 4.4s
- transition_in: cut
- status: animated
- src: compositions/frames/07-unfold.html
- type: feature_showcase
- persuasion: Risk reversal (nothing is thrown away)
- beat: trust + peace of mind
- blueprint: prompt-type-submit-generate (Adapt)
- asset_candidates:
- focal: none (the terminal is the real CLI output, typeset)
- roles: none
- sfx: typing, key-press, chime
- registry: none installed (offline build): hand-build the terminal card (navy surface, CLI palette, the real command and stdout verbatim, then the held frame)

**On screen:** a terminal card (deep ink `#0F0E11`, title bar "COMMAND LINE", CLI palette: violet `$` prompt, paper text). It types `prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"`, Enter, and the output unfolds line by line, verbatim: "Update 7: engineers investigated subsystem 7 and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Key finding f-7." "Key finding f-7." lights green. A stamp "✓ byte-exact" lands in the title bar. Then everything holds.
**Hero prop:** the sheet, unfolded back to the original.
**Motion:** typing at a human pace; output unfolds as an accordion opening; the highlight sweeps; then the held frame.
**Seam out:** crossfade.
**Audio cue:** key clicks, an Enter thock, a soft unfold, a clear bell on the stamp, then a beat of near-silence for the hold.
**Constraint:** this is the held frame; nothing moves after the stamp.
**Truth:** real CLI command and stdout (`npx prompt2md@0.1.1 retrieve`), byte-identical to the source span.
**Why:** the guarantee that makes folding different from cutting.

**Adapt:** keep the command typed into a real product input (the CLI) and the machine answering progressively (sub-shape B, terminal skin); change the payoff. The answer is the byte-exact original span, highlighted and stamped, then the held frame.

**Word cues (frame-local s):** Unfold 0.00 · any 0.35 · summary 0.70 · The 1.61 · exact 1.80 · original 2.17 · comes 2.92 · back 3.11 (line ends 3.29).

**Shot:**
- Scene 1 (0.00–0.90s): on "Unfold any summary", the headline "Unfold any summary." reveals word by word in the top third (EB Garamond, a per-word stagger: fade + short rise, `power3`); the terminal card springs in at center-low (`spring-pop-entrance`, smooth) with its title bar "COMMAND LINE" and the prompt "$ " with a blinking caret.
- Scene 2 (0.30–1.50s): the command `prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"` types at a quick human pace (`discrete-text-sequence` + `context-sensitive-cursor`); Enter at ~1.45 s.
- Scene 3 (1.55–2.95s): on "The exact original", the output opens out line by line as an accordion unfold, verbatim; "Key finding f-7." lights at 2.6 s: a static green tint + hairline ring, no pulse, no glow loop.
- Scene 4 (2.95–3.30s): on "comes back", the stamp "✓ byte-exact" lands in the title bar at 3.1 s (`spring-pop-entrance`).
- Scene 5 (3.30–4.40s): **the held frame**: nothing moves, not even the caret.

## Frame 8 — Everywhere (23.4–27.4s, ~4.0s)

- scene: The crane badge at the centre; the tools prompt2md plugs into orbit it as text chips; the camera pushes in on the hub.
- voiceover: "It plugs into Claude Code, Cursor, and any MCP client."
- duration: 4s
- transition_in: crossfade
- status: animated
- src: compositions/frames/08-everywhere.html
- type: social_proof
- persuasion: Friction reduction (works where you already work)
- beat: confidence + belonging
- blueprint: constellation-hub (Adapt)
- asset_candidates: assets/brand-icon.svg — the crane badge as the hub
- focal: assets/brand-icon.svg
- roles: brand-icon.svg = cutout (the hub)
- sfx: pop, click-soft

**On screen:** the badge at centre on paper; seven pill chips (the site's tool-list style: hairline border, white fill, muted ink) spring into a ring around it: "Claude Code", "Claude Desktop", "Cursor", "Windsurf", "Gemini CLI", "Codex CLI", "any MCP client". Kicker: "◣ ONE COMMAND WIRES EVERY TOOL".
**Hero prop:** the crane badge.
**Motion:** chips spring in around the ring on the VO cues; slow push-in on the hub.
**Seam out:** zoom-through into the close.
**Audio cue:** a soft pluck per chip, in key.
**Constraint:** text chips only; no third-party logos.
**Truth:** the list is the site's install section, backed by `SUPPORTED_TOOLS = 6` in `apps/web/lib/facts.ts` plus "any MCP client".
**Why:** lowers the cost of trying it.

**Adapt:** keep the Social_Proof orbit finisher (the brand mark as the hub, satellites springing onto a ring around it) with text chips instead of logos; drop the continuous zoom-out. After the last chip lands the ring may turn a few degrees as ONE unit (finite), never independent floating.

**Word cues (frame-local s):** It 0.00 · plugs 0.22 · into 0.45 · Claude 0.90 · Code 1.12 · Cursor 1.61 · and 2.38 · any 2.56 · MCP 2.92 · client 3.46 (line ends 3.82).

**Shot:**
- Scene 1 (0.00–0.90s): on "It plugs into", the crane badge snaps in at center with a quick 3D rotate that decelerates and settles (`orbit-3d-entry`, entry form); a hairline dashed orbit ring draws around it (`svg-path-draw`); the kicker "◣ ONE COMMAND WIRES EVERY TOOL" at 0.1 s.
- Scene 2 (0.90–3.50s): chips spring onto the ring as they are named (`spring-pop-entrance`, smooth): "Claude Code" at 0.95 s, "Cursor" at 1.65 s, then "Claude Desktop", "Windsurf", "Gemini CLI", "Codex CLI" on a quick 0.12 s cascade from 2.3 s, and "any MCP client" at 2.95 s on "MCP".
- Scene 3 (3.50–4.00s): the completed ring holds.

## Frame 9 — Command (27.4–32.0s, ~4.6s)

- scene: The 3D crane swings in soft light above the lockup; a terminal pill types npx prompt2md-skill; the URL holds; the crane keeps moving to the last frame.
- voiceover: "Open source. Try it at prompt-to-M-D dot vercel dot app."
- duration: 4.6s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/09-command.html
- type: cta
- persuasion: Friction reduction + risk reversal (free, open source)
- beat: motivation
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/crane-seq/ — the 3D crane (Blender render): 60 PNG frames `f01.png`–`f60.png`, 720×720, 24 fps, one seamless 2.5 s swing loop on paper (`assets/crane-seq/manifest.json`); assets/logo-lockup.svg — the horizontal lockup
- focal: assets/crane-seq/ (image sequence)
- roles: crane-seq = cutout (the 3D crane, cycling f01 → f60 at 24 fps from its entrance to the last frame of the film, frame-locked to the timeline; its frames are baked on paper within ±1 level of #FAF9F6, so lay them on the paper ground with no blend mode) · logo-lockup.svg = supporting (wordmark + tagline reference; build them as live type). Do not mount the .mp4: a hoisted video is pinned above the frame and cannot rise in with the lockup
- sfx: whoosh-cinematic, chime

**On screen:** the Blender crane (looping) in the upper half on paper; below it "prompt2md" and "A Markdown Magic"; a small ink terminal pill types "npx prompt2md-skill"; the URL "prompt2md.vercel.app" in an ink pill; "Open source, Apache-2.0" beneath.
**Hero prop:** the crane, the callback to 02's fold.
**Motion:** crane rises in; lockup slide-up; the command types; the URL lands on "vercel dot app"; the crane keeps swinging to the final frame.
**Seam out:** none, the film ends on moving footage.
**Audio cue:** the music resolves; a last soft bell on the URL; ring-out into silence.
**Constraint:** no static end card; the crane is still moving on the last frame.
**Truth:** `npx prompt2md-skill` is the README's real quick-start command; the package is published on npm.
**Why:** closes on the command and the address, the next action.

**Adapt:** keep the settled-reveal lockup (it completes in place; an accent underline sweeps) plus the install-command end card (a terminal pill types the command and holds); change the hero. The moving 3D crane above the lockup is the footage that is still moving at the close.

**Word cues (frame-local s):** Open 0.00 · source 0.59 · Try 1.23 · it 1.41 · at 1.60 · prompt2md.vercel.app 1.79 (line ends 3.66).

**Shot:**
- Scene 1 (0.00–0.70s): the 3D crane rises into the upper half (fade + short rise, `power3`) and swings for the rest of the film (its 2.5 s loop, frame-locked to the timeline). On "Open source" the wordmark "prompt2md" and the tagline "A Markdown Magic" land below the crane (`spring-pop-entrance`, smooth); "Open source, Apache-2.0" fades in at the bottom of the stack at 0.6 s.
- Scene 2 (1.20–1.80s): on "Try it at", the small navy terminal pill springs in and `npx prompt2md-skill` types (`discrete-text-sequence`) 1.25–1.75 s.
- Scene 3 (1.80–2.70s): on "prompt2md.vercel.app", the URL ink pill reveals left to right (`techniques.md` clip-path reveal) 1.8–2.4 s; a hairline violet underline sweeps under the wordmark left to right at 2.4 s (a scaleX wipe from the left edge).
- Scene 4 (2.70–4.60s): hold. Only the crane keeps moving (and the command caret blinking); the film ends on moving footage.

