# Frame packet: 02-folded

## Project inputs

- Project: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- Design tokens: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\frame.md
- RULES_DIR: C:\Users\hotra\.claude\skills\hyperframes-animation\rules

## Assigned storyboard block

## Frame 2 — Folded (2.4–5.6s, ~3.2s)

- scene: The ink sheet folds like paper and the world turns to warm paper; the fold opens into clean structured Markdown while the prompt2md lockup settles above it.
- voiceover: "Prompt-to-M-D folds it into clean Markdown."
- duration: 3.2s
- transition_in: cut
- status: built
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

## Selected blueprint: logo-assemble-lockup

# logo-assemble-lockup — Logo Assemble → Lockup

**intent**: A brand mark / wordmark comes to exist on screen and resolves into a centered logo lockup — built from parts (elements assemble or orbit in, letters cascade, an outline draws on, or a camera pushes through negative space), spring-BLOOMED whole from zero on a cleared stage, MORPHED in one unbroken chain out of the preceding phrase / glyph, absorbed from a kinetic streak, or already assembled and settling as decorations clear — optionally extended into a final URL / CTA / end card.

**roles served**

- Product_Intro (from product-intro-logo-system-assemble): A wordless, premium brand STING — an abstract system of elements pulses / grows / orbits and assembles around a FIXED central logo, carried by one cinematic camera tilt; no copy, no UI.
- CTA (from cta-camera-push-lockup): The logo build is a LEAD-IN to the final ask — a 3D mark assembles + wordmark cascades, then a fast camera PUSH-THROUGH the mark's negative space streaks giant CTA letters past the lens and resolves on a `[url]` / `[CTA verb]` lockup.
- CTA (from cta-button-wordmark-build): The "draws-its-own-outline → wordmark-builds-letter-by-letter" sub-shape — a `[CTA button]` pill strokes its own glowing border, a diagonal-band WIPE flips the frame, and the `[wordmark]` types in beside a slash to land the lockup. Camera static.
- Brand_Outro (from brand-outro-assemble-logo-lockup): The closing mark — a formation of `[feature pills / UI elements]` CLEARS the stage off all four edges, then on the empty frame the `[logo mark]` draws itself on stroke-by-stroke and the `[wordmark]` reveals to complete the lockup, then fades out.
- Product_Intro (from brand-reveal-assemble-zoom): a context-then-focus reveal — a companion tagline TYPES out to set context, the hero mark pops in beside it, then the companion exits as the layout recenters and the camera pushes IN to a held close-up on the mark (wide composition narrowing to a tight focus).
- Product_Intro (from logo-parts-lockup-assembly): the literal parts build — `[icon parts]` (a glowing dot traces a circle, semi-circles scale up and overlap, strokes rotate in) converge into the `[brand icon]` center-frame on a flat / gradient field, the `[wordmark]` joins (± a `[badge pill]` pops onto the lockup), then a payoff beat: a stepped bottom `[subtitle rail]`, a big `[count-up stat]` over a faint asset grid, or the lockup clears and a `[product UI window]` scales in. Static frame, all element-level.
- CTA (from text-clears-mark-blooms-lockup): the text-clear BLOOM — centered `[serif tagline]` beats (word-by-word staggered fades) hold, then CLEAR themselves to a blank frame; the `[brand mark]` spring-blooms from ZERO at dead center, slides left as the `[wordmark]` reveals to its right, and the balanced lockup holds (near-)still. Constant warm flat bg, static frame.
- Brand_Outro (from phrase-morphs-into-lockup): the MORPH chain — a centered `[phrase]` mutates in place, then collapses / swaps into an `[intermediate glyph]` whose line panels fan-and-flip around a central pivot with visible motion blur (page-flip feel) and interlock into the `[geometric mark]`, which slides apart into the lockup. One unbroken chain of transformation, never a cut-and-replace assembly; the finished lockup holds dead static for the final ~40–50% of runtime.
- Brand_Outro (from lead-text-then-mark-assembles): the parts-arrive build — a `[hand-off line]` holds and departs, then the mark is BUILT from arriving parts (`[icon]` drops in, letters slide in one by one, terminal punctuation lands, a confetti burst pops and instantly shrinks) OR a `[pixel stack]` streaks into full-width multicolor stripes whose tail retracts and is ABSORBED into the pixel mark — finishing as a lockup or a full end card (`[icon tile]` + `[title]` + `[URL pill]` + store badges) held static.
- Brand_Outro (from `settled-lockup-reveal`): the null-assembly boundary — the `[lockup]` is on stage from frame one; `[satellite shapes]` drift outward and fade, an accent underline sweeps beneath the wordmark, and the `[tagline]` wipes in to complete it. Settle-and-reveal: no predecessor beat, no morph, no relay.

**duration**: ~4.4–11.0s (Brand_Outro ~4.4–7.3s · brand-reveal ~5s · CTA text-clear bloom 6.0–8.9s · Product_Intro ~7s orbit sting, 7.0–9.8s parts-assembly · CTA push/build 5.4–11.0s)

**shot structure** (one consolidated time-coded template; `[slots]` are product-agnostic)

- Scene 1 — clear / ignite (0.0–~1.0s): the stage is prepared for the mark to build into.
  - _Variant — Product_Intro_: opens on a clean `[light bg]` with faint concentric guide rings under a flat top-down view; rings PULSE and expand from center; mid-beat the bg crossfades `[light]→[dark gradient: hero→secondary]`, tiny seed dots appear along the rings, and the central `[logo mark]`'s glow IGNITES (mark is present from t=0, fixed, front-facing).
  - _Variant — CTA push_: on a `[bg gradient]`, the `[logo mark]` is settling in object space (a 3D mark with thin wireframe edge-guides + a faint bracket motif behind center); a very slow continuous camera push-in may already be creeping.
  - _Variant — CTA button-build_: on a `[dark grid bg]`, a rounded `[CTA button "label"]` pill rises / scales into center (a prior headline clearing off the top); its thin border DRAWS ON as an animated glowing outline STROKE, with a small `[accent]` comet / spark icon at its left edge.
  - _Variant — Brand_Outro_: a PRE-ARRANGED formation of `[feature pills / element grid]` (each `[icon]`+`[label]`) DISPERSES — elements slide outward from their laid-out positions and fly off all four frame edges (edge-clearing drift, NOT a center-origin burst), emptying the frame onto a clean `[bg]`.
  - _Variant — Product_Intro parts-assembly_ (from logo-parts-lockup-assembly): optional text hook — a centered "`[Meet product]`" line wipes away right→left — or straight into the build; on a flat / gradient `[bg]`, the first `[icon parts]` arrive: a glowing dot traces a clockwise circle, a gradient semi-circle scales up inside it, or the mark scales-up-with-rotate into center.
  - _Variant — CTA text-clear bloom_ (from text-clears-mark-blooms-lockup): a centered `[serif tagline / question]` (± an outlined `[badge pill]`) finishes a left→right word-staggered reveal in the first ~0.5–1s (each word passing light-grey→dark) and HOLDS; optional rolling word-by-word swap to a second `[availability line]`. Then the CLEAR: text exits — shrink-toward-center + fade, or word-by-word left-first fade-out — leaving a blank frame for a beat.
  - _Variant — Brand_Outro morph-chain_ (from phrase-morphs-into-lockup): a centered `[phrase]` completes or mutates in place (a vertical slot-machine word swap — one word exits up as its replacement rises from below, rest of the line fixed — or a word-by-word landing) and holds. Nothing clears: the phrase IS the raw material for the mark.
  - _Variant — Brand_Outro parts-arrive_ (from lead-text-then-mark-assembles): a centered `[hand-off line: tagline / "Brought to you by"]` holds on a flat canvas, then exits — slides straight down off-frame with fade, or fades away behind the incoming flourish.
  - _Variant — Brand_Outro settled-reveal_ (from settled-lockup-reveal): the `[lockup]` is already centered at t=0; `[satellite shapes]` drift slowly outward around it — an INVERTED clear: the decorations leave, the mark stays.

- Scene 2 — assemble the mark (~1.0–~Ys): the mark builds itself from parts.
  - _Variant — Product_Intro_: seed dots SCALE UP into flat `[accent]` shapes arranged on the rings; concentric bands ripple outward (tunneling feel) and the shapes begin to ORBIT / drift around the still-fixed center.
  - _Variant — CTA push_: the `[wordmark]` CASCADES out from behind the mark (letters left→right with overshoot) into the full `[brand lockup]`; the 3D mark may assemble in beats (a terminal detaches + pops as a spring dot, a part hinges-open-and-snaps-shut elastic). Optional beat: a `[cursor]` arcs in and "clicks" the wordmark, OR a frosted-glass pill holding an intermediate `[CTA line]` springs in while layered mark shells fan to the edges.
  - _Variant — CTA button-build_: a graphic WIPE flips the frame to `[contrast bg]` — a thin `[accent]` diagonal line sweeps in, swells into a full-frame diagonal BAND, then collapses to a small `[accent]` slash.
  - _Variant — Brand_Outro_: on the now-clear frame, the `[logo mark]` DRAWS ON via stroke (built arc-by-arc / segment-by-segment).
  - _Variant — Product_Intro parts-assembly_: the overlapping parts COMPLETE the `[brand icon]` (a second circle overlaps to close the orb; strokes interlock); the `[wordmark]` slides out from behind the icon or in from its right; a small `[badge pill]` pops onto the lockup.
  - _Variant — CTA text-clear bloom_: on the blank frame the `[brand mark]` scales up from ZERO at dead center with a snappy spring ease (slight overshoot, hint of rotation as it grows) — the whole mark at once, no parts.
  - _Variant — Brand_Outro morph-chain_: the phrase collapses / wipes horizontally into the mark, OR is instantly swapped at the same center for a line-art `[intermediate icon]` whose strokes split into panels that fan-and-flip around a central pivot with visible motion blur, interlock-settling into the `[geometric mark]`. Never a cut to the finished logo — the transformation must stay unbroken.
  - _Variant — Brand_Outro parts-arrive_: the mark is BUILT from arriving parts — the `[icon]` drops in from above, letters slide in one by one, terminal punctuation lands, a tiny confetti burst pops and instantly shrinks — OR a colored `[pixel stack]` pops in at a text edge, shoots horizontally stretching into full-width multicolor stripes, then the stripe tail retracts and is ABSORBED into the `[pixel mark]` (mask retraction).
  - _Variant — Brand_Outro settled-reveal_: an accent underline sweeps left→right beneath the `[wordmark]` — the only "build" this variant performs.

- Scene 3 — resolve to lockup (~Ys–end): the lockup completes and holds (Product_Intro / Brand_Outro) or is flown into / extended to a CTA (CTA variants).
  - _Variant — Product_Intro (the ONE camera move)_: the whole system smoothly TILTS from flat top-down into an angled isometric perspective (ease-in-out) with a slight zoom-out — flat shapes become luminous 3D forms, bands become glowing orbit lines, while the central `[logo mark]` does NOT tilt (stays 2D, front-facing, fixed). Camera eases to a stop; elements keep continuous orbit/drift (inner faster than outer); the mark holds its steady glow. Final settled frame.
  - _Variant — CTA push (the signature)_: a single fast CAMERA PUSH-THROUGH the mark's negative space / through the glass pill — heavy horizontal motion-blur, giant `[CTA]` letters streaking past the lens (cursor drops out). Resolves to the final lockup on a saturated `[bg]`: a `[url badge]` / `[CTA line]` revealed by a left→right WIPE carrying an `[accent]` leading edge (or a clean fade), with solid mark-shapes parallax-sliding in behind. Settles to a dead-static hold (slow zoom-out / settle).
  - _Variant — CTA button-build_: the `[wordmark]` BUILDS letter-by-letter to the right of the slash, landing on the final "`[slash] [WORDMARK]`" lockup centered on the new bg. Slow settle to static.
  - _Variant — Brand_Outro_: the `[wordmark]` reveals beside the drawn mark (slide / fade) to complete the `[lockup]`; the lockup holds, then fades to `[black / bg]`.
  - _Variant — Product_Intro parts-assembly (the payoff beat)_: the finished lockup holds while a bottom `[subtitle box]` steps through `[tagline fragments]` (swap-in-place); or a big `[count-up stat]` line lands over a faint background asset grid; or the lockup scales-down / fades and a `[product UI window]` scales up on the flat bg (its panel content may swap once). The build hands off to product proof.
  - _Variant — CTA text-clear bloom_: the mark slides a short distance LEFT while the `[wordmark]` reveals to its right (letter-by-letter / slide-out wipe with visible partial states); the balanced "`[mark] + [wordmark]`" lockup centers and holds, one member continuing an almost imperceptible slow scale-up through the hold.
  - _Variant — Brand_Outro morph-chain_: the mark slides left as the `[wordmark]` is pulled out rightward trailing a motion-blur streak, the pair decelerating into the centered lockup (± a `[sub-line]` fades in below). The hold is LONG — dead static for the final ~40–50% of runtime.
  - _Variant — Brand_Outro parts-arrive_: the lockup rests centered and holds; or the full end card completes — a rounded-square `[icon tile]` scales up behind the mark, the `[title]` fades in word-by-word, and a bottom row (`[URL pill]` + `[store badges]`) fades / slides up — then holds static.
  - _Variant — Brand_Outro settled-reveal_: the `[tagline]` reveals left→right below the wordmark; the satellites finish drifting out and fade; the lockup holds centered (at most a very slow global zoom-out, no pan).

**motion vocabulary**: ring pulse / expand; background crossfade (light→dark); glow ignite; seed-dot scale-up; continuous orbit / drift (inner faster than outer); single 3D perspective tilt (flat→isometric) + slight zoom-out around a fixed 2D anchor; 3D logo assemble (part detach + spring dot, clapperboard hinge / snap, shell fan-out); wordmark cascade with overshoot (letters left→right); button pill rise / scale-in; animated stroke-outline DRAW + glow (button border AND logo mark); comet / spark accent; diagonal-band wipe (sweep → swell → collapse-to-slash); letter-by-letter wordmark build; pre-formed grid DISPERSE off all four edges; logo-mark stroke-draw (sequential arcs / segments); fast CAMERA PUSH-THROUGH with motion-blur (CTA spine); continuous slow push-in / push-out; cursor arc-in + click; parallax shape slide-in; left→right URL/badge wipe with glowing leading edge; static / fade-out end-lockup hold; optional idle breathe on the held mark; glowing-dot circular path trace; part-overlap icon completion (semi-circles scale up + overlap); scale-up-with-rotate mark entrance; wordmark slide-out-from-behind-icon; badge pill pop onto the lockup; stepped subtitle swap-in-place (bottom rail); count-up stat tick over a faint asset grid; lockup shrink / fade → UI-window scale-up payoff; word-by-word staggered fade-through-grey (in, and left-first out); rolling word-by-word line swap; shrink-toward-center + fade clearing exit; whole-mark spring BLOOM from zero (overshoot + slight rotation); near-imperceptible continuous scale-up through the hold; vertical slot-machine word swap; horizontal phrase collapse / wipe into the mark; instant same-center text→icon swap; line-panel fan-and-flip morph around a central pivot with motion blur (page-flip feel); interlock-settle into the geometric mark; wordmark pull-out trailing a motion-blur streak; lead-line slide-down-off-bottom exit; icon drop-in from above; sequential per-letter slide-in + terminal punctuation landing; confetti burst pop-then-instant-shrink; pixel-stack pop at a text edge; horizontal streak-stretch into full-width stripes; stripe-tail retraction absorbed into the mark (mask retraction); rounded-tile scale-up enclosing the mark; bottom metadata row fade / slide-up (URL pill + store badges); satellite shapes outward drift + fade; left→right underline sweep; left→right tagline wipe-in.

**rule mapping** (per motion verb → `rules/<id>.md`)

- ring pulse / expand from center → `center-outward-expansion` (radiate from a shared center; reuse the 0→1 progress driver)
- background crossfade (light→dark gradient) → plain opacity/background tween via `gsap-effects` (no dedicated rule needed)
- glow ignite on the mark → `asr-keyword-glow` (envelope-driven glow on the brand element)
- seed-dot scale-up into shapes → `spring-pop-entrance` (scale-in pop; alt `scale-swap-transition` if dots morph into shapes)
- continuous orbit / drift around fixed center → `orbit-3d-entry` (flip-in then continuous elliptical orbit; center label = the fixed mark)
- single 3D perspective tilt (flat→isometric) + slight zoom-out → `multi-phase-camera` (scripted scale phases on a scene-wrapping camera, for the zoom-out) — see camera modifier; the FLAT→ISOMETRIC plane tilt of the whole stage is a CSS-3D perspective move (`techniques.md` CSS-3D, animating the stage's `rotateX`) — no exact camera rule for the plane-tilt, approximate via CSS-3D (closest reference is `orbit-3d-entry`'s "Tilted orbit plane" variation animated over time)
- fixed 2D anchor logo amid moving universe → no motion rule needed (static anchor; intentional — it's the absence of motion, the universe moves around it)
- 3D logo assemble — part detach + spring dot → `spring-pop-entrance` (spring pop, `back.out` overshoot)
- 3D logo assemble — hinge open / snap (clapperboard) → `hacker-flip-3d` (the 3D-rotate axis) + `techniques.md` CSS-3D (the elastic open-and-snap-shut hinge is an adaptation of the 3D-rotate)
- 3D logo assemble — shell fan-out to edges → `center-outward-expansion` (run outward from the mark center)
- wordmark cascade with overshoot (letters left→right) → recipe `gsap-effects` (per-element staggered slide) + `spring-pop-entrance` (the `back.out` overshoot per letter)
- button pill rise / scale-in → `spring-pop-entrance` (scale-in; alt `scale-swap-transition`)
- animated stroke-outline draw + glow (button border) → `svg-path-draw` (stroke-dashoffset draw) + `asr-keyword-glow` (the glow on the drawn stroke)
- comet / spark accent on button → `asr-keyword-glow` (small glow accent); motion path via `techniques.md` GSAP MotionPathPlugin (#9)
- diagonal-band wipe (sweep → swell → collapse-to-slash) → `techniques.md` clip-path reveal (#12, animate a `polygon(...)` diagonal across the frame; the swell-then-collapse-to-slash is the same clip-path reveal driven through grow→shrink keyframes)
- letter-by-letter wordmark build → `discrete-text-sequence` (smooth-slice / per-state build); recipe `gsap-effects` (typewriter / appending words)
- pre-formed grid disperse off all four edges → not a rule gap: a formation flying off-frame is an EXIT, and the pipeline forbids mid-video exits — the harness transition IS the exit (only the final frame may exit the stage). Treat this as transition-handled / final-frame-only rather than an in-scene motion rule. (If staged in-scene as a reveal-the-mark clear, it reuses `center-outward-expansion` run OUTWARD — center→target machinery interpolating formation→offscreen targets, out-easing.)
- logo-mark stroke-draw (sequential arcs / segments) → `svg-path-draw` (the canonical multi-segment stagger draw)
- wordmark slide / fade reveal beside drawn mark → `svg-path-draw` (its "brand-line fades in after stroke" tail) ; slide via `spring-pop-entrance`
- fast camera push-through with motion-blur → `multi-phase-camera` (a hard push phase) — see camera modifier; the heavy motion-blur streak itself → `motion-blur-streak` (directional velocity blur on the fast push-through)
- continuous slow push-in / push-out → `multi-phase-camera` (phase scale + drift)
- cursor arc-in + click on the wordmark → `cursor-click-ripple` (move → click → ripple); arc path via `techniques.md` MotionPathPlugin (#9)
- parallax shape slide-in behind lockup → `depth-scatter-assemble` (parallax depth slide-in of shapes at differing depths; pair with `3d-text-depth-layers` for the depth ordering)
- left→right URL / badge wipe with glowing leading edge → `techniques.md` clip-path reveal (#12, animate `inset()` left→right); the glowing leading edge → `asr-keyword-glow`
- static / fade-out end-lockup hold → no motion rule needed (terminal hold / opacity fade; intentional)
- idle breathe on held mark (optional) → `sine-wave-loop` (post-settle breathing)
- glowing-dot circular path trace → `svg-path-draw` (the traced circle draws on) + `techniques.md` MotionPathPlugin (#9) for the leading dot riding the path tip
- part-overlap icon completion / semi-circle scale-up → `spring-pop-entrance` (per-part scale-in; place parts at their final overlap positions from setup — the overlap IS the completed mark)
- scale-up-with-rotate mark entrance → `spring-pop-entrance` (add a rotation from-value to the pop)
- wordmark slide-out-from-behind-icon → recipe `gsap-effects` (x-slide) under a clip / overflow mask via `techniques.md` clip-path reveal (#12); z-order the icon above the sliding text
- badge pill pop onto the lockup → `spring-pop-entrance`
- stepped subtitle swap-in-place (bottom rail) → `discrete-text-sequence` (whole-state replacement at time thresholds); derive the windows via `dynamic-content-sequencing`
- count-up stat tick over a faint asset grid → `counting-dynamic-scale`; the faint grid is a plain opacity fade (no rule needed)
- lockup shrink / fade → UI-window payoff → `scale-swap-transition` (exit cluster shrinks + fades at center; window pops in with `back.out`)
- word-by-word staggered fade-through-grey (in / left-first out) → recipe `gsap-effects` (per-word staggered opacity + color tween). Deliberately a quiet FADE register — do NOT substitute `waterfall-entry` here; its binary-arrival doctrine is the wrong voice for this serif beat
- rolling word-by-word line swap → two overlapping `gsap-effects` word staggers at the same timeline position (old line out left-first, new line in left→right)
- shrink-toward-center + fade clearing exit → `scale-swap-transition` (its exit half; the entrance half is the bloom)
- whole-mark spring BLOOM from zero → `spring-pop-entrance` (single hero, `back.out` overshoot, slight rotation from-value)
- near-imperceptible continuous scale-up through the hold → no motion rule needed (one long linear micro-tween on the held lockup; intentional life-in-the-hold)
- vertical slot-machine word swap → `vertical-spring-ticker` (masked column, stepped tween — one word slot cycles, rest of the line fixed)
- horizontal phrase collapse / wipe into the mark → `scale-swap-transition` (same-center morph) with the collapse via `techniques.md` clip-path reveal (#12)
- instant same-center text→icon swap → no motion rule needed (`tl.set` hard swap; intentional — the chain's continuity lives in the NEXT beat's morph)
- line-panel fan-and-flip morph (page-flip, motion-blurred) → `hacker-flip-3d` (the per-panel 3D rotation axis) + `motion-blur-streak` (the blur) + `techniques.md` CSS-3D; true stroke-interpolation glyph morphs live in `hyperframes-keyframes` (SVG morph) — reach there if panels can't sell it
- interlock-settle into the geometric mark → `center-outward-expansion` machinery run INWARD (per-panel transform offsets tween to 0 in lockstep with one driver)
- wordmark pull-out trailing a motion-blur streak → `motion-blur-streak` (echo / ghost trail collapsing into the lead) on the x-slide
- lead-line slide-down-off-bottom exit → in-scene clearing beat; same doctrine as the grid-disperse row above (offscreen target + out-easing; prefer the harness transition when the exit IS the scene boundary)
- icon drop-in from above → `spring-pop-entrance` (y-offset from-value, overshoot on landing)
- sequential per-letter slide-in + terminal punctuation landing → `waterfall-entry` (staggered arrival cascade on a lateral axis; the punctuation is the cascade's final, heaviest beat)
- confetti burst pop-then-instant-shrink → `press-release-spring` ("release burst" variation) for a small deterministic burst; a true multi-particle confetti field → `particle-burst`
- pixel-stack pop at a text edge → `spring-pop-entrance` (tight stagger down the stack)
- horizontal streak-stretch into full-width stripes → plain `scaleX` stretch via `gsap-effects` (transform-origin at the stack) + `motion-blur-streak` for the streak read
- stripe-tail retraction absorbed into the mark → `techniques.md` clip-path reveal (#12) run in REVERSE (animated `inset()` retraction reading as mask absorption into the mark)
- rounded-tile scale-up enclosing the mark → `spring-pop-entrance` (scale-in BEHIND the mark; z-order only, mark never moves)
- bottom metadata row fade / slide-up → `spring-pop-entrance` (staggered group, ≤500ms cap)
- satellite shapes outward drift + fade → `center-outward-expansion` run OUTWARD (drift targets past frame edge) + opacity tail; if the drift must idle first, seed it with `sine-wave-loop`
- left→right underline sweep → `css-marker-patterns` (highlight sweep re-skinned as an underline) or `stat-bars-and-fills` progress-fill `scaleX`
- left→right tagline wipe-in → the existing "left→right URL / badge wipe" row applies unchanged (clip-path `inset()`)

**camera modifier** (the push / tilt)

- **CTA push-through** (the CTA spine): a scripted hard zoom phase on a scene-wrapping camera → `multi-phase-camera` ("Steady push" / "Bookend pull" pattern; push phase = the climax). When the mark is OFF-center and the camera must fly through a specific point of negative space, combine with `coordinate-target-zoom` (outer scales, inner counter-translates so the target negative-space point lands at viewport center as scale ramps; measure the offset at setup). The signature heavy horizontal MOTION-BLUR on the streak → `motion-blur-streak` (directional velocity blur on the push); realize with a CSS `filter: blur()` / duplicated-streak layer on the camera during the push window.
- **Product_Intro tilt** (the one cinematic move): the flat→isometric perspective tilt + slight zoom-out is a single scripted camera beat → `multi-phase-camera` (scale phase + the "Targeted zoom into off-center element" / drift machinery) for the zoom-out. `multi-phase-camera` is scale+translate+drift only, so the perspective-PLANE rotateX (flat top-down → angled isometric) of the whole stage is the CSS-3D move noted above — approximate via `techniques.md` CSS-3D, animating the stage's `rotateX` (closest reference is `orbit-3d-entry`'s "Tilted orbit plane" variation animated over time).
- **Static-frame variants**: the parts-assembly, text-clear bloom, morph-chain, parts-arrive, and settled-reveal variants are all COMPLETELY static-frame (element-level motion only; settled-reveal tolerates at most a very slow global zoom-out). The camera modifier applies only to the CTA push and the Product_Intro tilt.

## Selected motion rule: depth-scatter-assemble

---
name: depth-scatter-assemble
description: N elements scatter into / reassemble from a rotating 3D depth-cloud, each starting at a deterministic index-derived 3D offset and settling to a clean flat layout.
metadata:
  tags: 3d, scatter, assemble, depth, cloud, tumble, kinetic, letter, fragment, logo, reassemble
---

# Depth Scatter ↔ Assemble

N elements (glyphs, cards, logo fragments) fly in from a rotating 3D depth-cloud and lock into a flat layout — or the reverse. Each element has its OWN index-derived point in the cloud (translateZ depth + rotateX/Y tumble + x/y scatter). Distinct from `orbit-3d-entry` (flip-in then continuous orbit) and `center-outward-expansion` (flat burst from one shared center): here the resolve is a flat assembled layout.

## How It Works

Each element's flat target lives in `data-target-x/y`; its scattered state is pure trig on its index — golden-angle spread, stepped depth — so the cloud is byte-identical every render with no `Math.random`:

```js
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~2.39943 rad — even spread, no clumping
const a = i * GOLDEN;
const scatterX = Math.cos(a) * RADIUS;
const scatterY = Math.sin(a) * RADIUS;
const scatterZ = Z_NEAR - (i / (n - 1)) * (Z_NEAR - Z_FAR); // stepped depth
const rotX = Math.sin(a) * TUMBLE;
const rotY = Math.cos(a) * TUMBLE;
```

Elements are PARKED at their scatter points (`gsap.set`, opacity 0) before any tween, then each tweens to its flat target while the whole stage slowly rotates so the scatter has life before it locks. Requires `perspective` on the scene root and `preserve-3d` on the stage AND each element, or depth + tumble flatten to a 2D scale.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="cloud-stage">
  <div class="frag" data-target-x="-260" data-target-y="0">{glyph1}</div>
  <div class="frag" data-target-x="-130" data-target-y="0">{glyph2}</div>
  <!-- … one .frag per glyph / fragment … -->
</div>
```

```css
.scene-root {
  display: grid;
  place-items: center;
  perspective: 1400px; /* REQUIRED */
}
.cloud-stage {
  position: relative;
  display: grid;
  place-items: center;
  transform-style: preserve-3d;
  will-change: transform;
}
.frag {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-style: preserve-3d;
  backface-visibility: hidden; /* hides the mirrored face mid-tumble */
  will-change: transform, opacity;
}
```

```js
const frags = Array.from(document.querySelectorAll(".frag"));
const n = frags.length;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// 1) Park every fragment in the cloud BEFORE any tween fires
const scatter = frags.map((el, i) => {
  const a = i * GOLDEN;
  const depthT = n > 1 ? i / (n - 1) : 0;
  return {
    x: Math.cos(a) * RADIUS,
    y: Math.sin(a) * RADIUS,
    z: Z_NEAR - depthT * (Z_NEAR - Z_FAR),
    rotationX: Math.sin(a) * TUMBLE,
    rotationY: Math.cos(a) * TUMBLE,
  };
});
frags.forEach((el, i) => gsap.set(el, { xPercent: -50, yPercent: -50, ...scatter[i], opacity: 0 }));

// 2) The cloud rotates so the scatter has life during assembly
tl.to(
  ".cloud-stage",
  { rotationY: CLOUD_SPIN_DEG, duration: CLOUD_SPIN_DUR, ease: "power1.out" },
  0,
);

// 3) ASSEMBLE — cloud point → flat target, index stagger = cloud collapsing inward
frags.forEach((el, i) => {
  tl.to(
    el,
    {
      x: Number(el.dataset.targetX),
      y: Number(el.dataset.targetY),
      z: 0,
      rotationX: 0,
      rotationY: 0,
      opacity: 1,
      duration: ASSEMBLE_DUR,
      ease: ASSEMBLE_EASE,
    },
    i * STAGGER,
  );
});
```

## Variations

- **Tumble-swap** (the beat-change hand-off): two glyph sets share the cloud; ONE shared 0→1 progress tween drives both in its `onUpdate` — outgoing lerps layout→cloud with `opacity: 1−p`, incoming lerps cloud→layout with `opacity: p`. Two separate tweens drift out of phase under seek and the cross stops reading as one hand-off. Inject per-glyph spans per phrase at setup (measure advance widths after `document.fonts.ready` — single-scene only).
- **Radial letter-explode → resolve**: flat-plane special case — `Z_NEAR = Z_FAR = 0`, small `TUMBLE`; reverse the assemble for the explode. Pure in-plane.
- **Scatter-OUT**: reverse assemble (layout → cloud, opacity 1→0) ONLY as the composition's final beat — mid-shot it reads as the shot ending.
- **Parallax lockup**: back layers get deeper `|Z_FAR|` + longer `ASSEMBLE_DUR`, foreground shallower/shorter — depth-speeded slide-in that locks into the logo.

## Values

| token                  | range                 | notes                                                                         |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------- |
| n                      | 4–14 (fragments 4–9)  | above ~14 individual paths stop reading                                       |
| RADIUS                 | 250–700px             | keep the farthest scatter in frame or fragments pop in with no travel         |
| Z_NEAR / Z_FAR         | +150…+450 / −150…−500 | large `\|z\|` needs a wider `perspective` or fragments smear                  |
| TUMBLE                 | 40–110°               | past 90° glyphs show blank mid-tween (intended); cap ~80° for one-faced cards |
| ASSEMBLE_DUR           | 0.7–1.4s              |                                                                               |
| ASSEMBLE_EASE          | `power3.out` default  | `expo.out` snaps, `back.out(1.4)` seats with overshoot; never `in`            |
| STAGGER                | 0.03–0.09s            | `n × STAGGER < ASSEMBLE_DUR` — one collapsing motion, not a queue             |
| CLOUD_SPIN_DEG / \_DUR | 15–60° over ≥ dur     | gentle life; too fast competes with the assembly                              |
| SWAP_DUR               | 0.5–1.0s              | on the beat boundary; shorter = hard cross                                    |

## Critical Constraints

- **Every scattered value is index-derived** — `cos/sin(i × GOLDEN)` + stepped `z`. The golden angle spreads points evenly with no clumps and no `Math.random`.
- **`gsap.set` the cloud BEFORE adding tweens** — skipping it leaves frame 0 showing the assembled layout, then a teleport when the first tween starts.
- **`perspective` + `preserve-3d` on stage AND each fragment** — missing any one flattens the depth.
- **Resolve flat** — settled state is `z: 0`, rotations 0; a still-tilted resolve reads unfinished.
- **Tumble-swap: one shared progress for both glyph sets.**
- **Depth ordering is automatic** inside `preserve-3d` (paint order follows actual Z) — no manual z-index, unlike the orbit case's capped band.

## See also

`orbit-3d-entry` (settles into a continuous orbit instead) · `hacker-flip-3d` (glyphs decode on arrival) · `3d-text-depth-layers` (extrude the locked wordmark) · `center-outward-expansion` (flat 2D cousin) · `sine-wave-loop` (idle breathe on the resolved layout).

## Selected motion rule: spring-pop-entrance

---
name: spring-pop-entrance
description: The canonical entrance pop — an element (or staggered group) arrives by scaling 0 → 1 on a smooth long-tail settle (power3 default); bouncy overshoot is a rare, explicitly-playful exception. fromTo so it's correct at t=0 under seek.
metadata:
  tags: spring, entrance, pop, scale, power3, settle, stagger, reveal, arrival
---

# Spring-Pop Entrance

> **Smooth beats bouncy.** This entrance defaults to a smooth long-tail settle — `power3.out` (or `expo.out` for a faster front) — that decelerates cleanly into the resting size with **no overshoot**. Bouncy `back.out` is the **#1 instant turn-off** in agent-made videos and is almost never executed well; it is a rare, explicitly-playful exception (consumer / fun brand), never the default. When unsure, settle smoothly.

THE entrance primitive: an element (or staggered group) arrives by springing from nothing — `scale: 0 → 1`, optional small `y` rise — and settles without bouncing. This is **arrival**, not reaction: distinct from [press-release-spring.md](press-release-spring.md) (a click/press → release feedback chain on an element that already rests on screen). Many blueprints used to borrow that rule to fake an entrance; reach for this instead.

## How It Works

One `fromTo` carries the whole arrival: from `{ scale: 0, opacity: 0 }` (explicit, so t=0 is correct under seek) to `{ scale: 1, opacity: 1, ease: "power3.out" }`. For a **group**, the same `fromTo` runs per element at `i * STAGGER`, capped so the group reads as one arriving beat. The `scale` grow is load-bearing; the `y` rise is garnish — drop everything else and it must still read as a clean entrance. Let the ease produce the settle: never hand-key a `scale: 1.1` mid-state (it double-bounces against the curve).

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="pop-hero" id="hero">{heroLabel}</div>

<div class="pop-grid">
  <div class="pop-item">{itemA}</div>
  <div class="pop-item">{itemB}</div>
  <div class="pop-item">{itemC}</div>
</div>
```

```css
.pop-hero,
.pop-item {
  transform-origin: 50% 50%; /* in-place pop; move to the source point for the anchored variation */
  will-change: transform;
}
.pop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: GRID_GAP;
  place-items: center;
}
```

```js
// Single hero pop — smooth long-tail settle, no overshoot.
tl.fromTo(
  "#hero",
  { scale: 0, opacity: 0 },
  { scale: 1, opacity: 1, duration: POP_DUR, ease: "power3.out" },
  ENTRY_AT,
);

// Staggered group pop — one arriving beat.
gsap.utils.toArray(".pop-item").forEach((el, i) => {
  tl.fromTo(
    el,
    { scale: 0, opacity: 0, y: Y_RISE },
    { scale: 1, opacity: 1, y: 0, duration: POP_DUR, ease: "power3.out" },
    GROUP_ENTRY_AT + i * STAGGER,
  );
});
```

## Variations

- **Calm settle** (premium / enterprise): `power3.out`, no rotation, `Y_RISE` 0–12px — a weighted, confident landing for a hero wordmark or product shot.
- **Firm settle** (everyday default): `power3.out` or `expo.out` for a punchier front, `Y_RISE` ~24px — cards, icons, callouts.
- **Exact-physics settle**: when the settle IS the shot, swap the ease for `springEase({ response: 0.4 })` (critically damped) from `../adapters/gsap-easing-and-stagger.md` → Spring Eases; take `duration` from the helper.
- **Origin-anchored pop**: a callout growing out of a specific point (marker, pointer tip) sets `transform-origin` to that point (e.g. `0% 100%`) so `scale: 0 → 1` reads as "emerging from the source", not "inflating in place".
- **Pop into a held slot**: land the pop and hold still — no idle loop baked into the entrance. If the held frame genuinely needs life, hand off to [sine-wave-loop.md](sine-wave-loop.md) for subtle jitter on a separate later tween; prefer revealing the next element on its VO cue.
- **Bouncy pop (RARE — explicitly-playful only)**: swap the ease for `back.out(OVERSHOOT)` and optionally settle a small `rotation: ROT_FROM → 0` so elements look hand-placed. Only for a deliberately playful register — never product / enterprise / serious tone:

```js
tl.fromTo(
  el,
  { scale: 0, opacity: 0, rotation: ROT_FROM },
  { scale: 1, opacity: 1, rotation: 0, duration: POP_DUR, ease: `back.out(${OVERSHOOT})` },
  GROUP_ENTRY_AT + i * STAGGER,
);
```

Even here keep `OVERSHOOT ≤ ~2` — past that it reads as cartoon wobble. Better still: the baked spring at `dampingFraction: 0.6–0.7` (same adapters doc) gives ~5–10% overshoot that reads physical where `back.out` reads cartoon.

## Values

| token      | range                                     | notes                                                            |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------- |
| EASE       | `power3.out` default; `expo.out` punchier | `back.out(OVERSHOOT)` only in the playful variant                |
| POP_DUR    | 0.4–0.7s                                  | shorter = tight snap; hero must be visible by **t ≤ 0.5s**       |
| STAGGER    | 0.04–0.08s                                | `min(0.06, 0.5 / ITEM_COUNT)` — self-caps the window             |
| ITEM_COUNT | 3–9                                       | >9 makes the stagger vanish — switch to a wipe/sweep reveal      |
| Y_RISE     | 0–32px                                    | small; never large enough to read as a slide-up                  |
| ROT_FROM   | −10°–+10°                                 | playful variant only; alternate sign by index (`i % 2 ? 6 : -6`) |
| ENTRY_AT   | 0–0.4s                                    | a beat of quiet, but keep the subject landing by t ≤ 0.5s        |

## Critical Constraints

- Default ease `power3.out` (no overshoot); `back.out` only in the explicitly-playful variant, and there `OVERSHOOT ≤ ~2`.
- `ITEM_COUNT × STAGGER ≤ ~0.5s` — the group must land inside one beat.
- Entrances state the collapsed from-state in `fromTo` — never rely on a CSS-hidden start (it renders visible before the tween claims it under seek).
- `transform-origin: 50% 50%` for an in-place pop; the source point only for the anchored variation.
- This is a finite arrival — idle motion on a held element is a separate, later `sine-wave-loop` tween.

## See also

`center-outward-expansion` (pop while radiating to slots) · `press-release-spring` (the click-feedback counterpart) · `sine-wave-loop` (post-arrival jitter, sparingly).
