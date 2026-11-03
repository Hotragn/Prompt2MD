# Frame packet: 07-unfold

## Project inputs

- Project: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- Design tokens: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\frame.md
- RULES_DIR: C:\Users\hotra\.claude\skills\hyperframes-animation\rules

## Assigned storyboard block

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

## Selected blueprint: prompt-type-submit-generate

# prompt-type-submit-generate — Prompt, Submit, Generate

**intent**: The AI-era demo shot — a `[prompt / query / command]` types character-by-character into a REAL product input (chat composer, search bar, terminal prompt, URL bar, sidebar assistant) and the machine answers: status theater into a streaming answer / agent action log / diff cards / chart / generated artifact — or the clip cuts at the submit and the ask itself is the show. The keyboard is the actor and the product is the responder. Distinct from `typewriter-reveal` (a line typed as bare typography on an empty field — no product surface, nothing answers) and from `cursor-ui-demo` (a cursor clicking a reconstructed UI through states — there the pointer drives every change; here any cursor work only primes the input or lands the submit, and every state change after that is the machine's own doing).

**roles served**

- Hook (from `app-window-push-in-prompt-typing`): when the opener is "watch me ask" — typed headline beat(s), ONE eased push-in lands tight on the product's input, the prompt types and the clip ends at / just after submission (sub-shape A).
- Hook (from `typed-command-output-scroll`): when the demo loop ITSELF is the hook — command in, output builds and scrolls, and a second command / retype starts before the cut, ending mid-action (sub-shapes B/C with the restart ending).
- Product_Intro (from `prompt-typing-composer`): when the first look at the product IS its composer — a brand beat opens onto the input surface, a long prompt types with hovers / attachments / dropdown picks, and the camera steers gently toward the input or the confirming control (sub-shape A, occasionally running through to an agent-log payoff).
- Product_Intro (from `search-query-walkthrough`): when the product is introduced through its search affordance — a short `[query]` types with a blinking caret, autocomplete / results populate LIVE, and a confirm click settles the result state (sub-shape C, search skin).
- Key_Feature (from `prompt-type-submit-generate`): when the capability is demoed as ONE prompt→response round trip — submit into thinking/status states, then a streaming answer, action-log rows with brand icons, green diff cards, a chart drawing itself, or an instant generated-app reveal (sub-shapes A/B/C — the family's widest role).
- CTA (from `install-command-end-card`): the install-command end card — the closing `[headline]` DEMOTES (shrinks, grays, lifts) to make room for a `[terminal pill]` that springs in and stretches wide, the `[install command]` types out with a blinking cursor, flanking metadata and a `[tool-icon row]` pop in, and the finished card holds long. No submit, no response — the typed command IS the ask (sub-shape A, terminal skin).

**duration**: 5.2–12s (A prompt-as-hook 5.2–12s, incl. the ~7.4s CTA end card; B full generate loop 5.45–11.9s; C instant-result surface 5.7–11.9s — a long-form family: most members run 7–12s because the response needs room to arrive)

**shot structure** (a `[product input]` on/inside a `[product surface — app window, web page, terminal, browser chrome, sidebar]` over `[bg color]`; the input is the gravitational center — the camera makes at most one or two purposeful moves toward or away from it and is otherwise LOCKED; typing is character-by-character behind a visible caret, and response content arrives progressively, never dumped; three folded sub-shapes — **(A) prompt-as-hook**: the clip ends at / just after the submit (or mid-word), the ask is the show; **(B) full generate loop**: submit → status theater → the output builds block by block; **(C) instant-result surface**: the machine answers with a finished surface, often re-queried before the cut)

- **Scene 0 (optional, 0.0–~2s) — lead-in beat.** ONE establishing move before the input owns the shot: a `[headline]` types on centered and clears; a `[title card]` hard-cuts away; a brand beat (`[logo/mascot]` centered, `[serif title]` building in word groups, logo shrinking-and-rising to dock top-center); an `[orb / mark]` forms with a glowing rim; the `[app window]` flies in with motion blur and settles; or a full-frame `[thumbnail grid]` parts at its vertical centerline to clear the stage. Keep it ≤2s — the input is the star.
  - _Variant — Hook_: typed headline beats carry the intro — "[Introducing X]" types on, holds, is replaced by the `[tagline]` typing in the identical style; the typing register is established before the product ever appears.
  - _Variant — Key_Feature_: the capability claim types as a bare title ("[Run a task across multiple models.]") then hard-cuts to the surface — or skip Scene 0 entirely and open on the live surface mid-workflow.
  - _Variant — CTA_: the `[closing line]` types on in two steps ("[Designed.] [Not generated.]") and holds — it will demote in Scene 2.

- **Scene 1 (~1–3s) — the input takes focus.** The `[product input]` arrives or is primed: a `[pill bar]` EXPANDS sideways from the mark/chip; a `[prompt palette / card]` SPRINGS in at center with a soft shadow; ONE smooth eased/accelerating push-in crops tight onto the composer inside the `[app window]` (headline chrome slides out of frame); a `[⌘K search modal]` springs to center while the page blurs behind it; a cursor clicks a `[menu row / Assistant button]` and the prompt block appears; or a `[✕ clear button]` empties the previous query back to `[placeholder]`. Optional composer ritual (pick 1–2, before or during typing): an `[attachment]` drags in and settles in a tray below the input; a `[model / option dropdown]` opens beneath the selector, rows hover-highlight, a checkmark lands and the toolbar label updates.
  - _Variant — Product_Intro_: the ritual is the introduction — a `[chip grid]` fades in and the cursor arcs across 2–3 hover highlights before clicking the one that opens the composer; the affordances are the tour.
  - _Variant — Key_Feature_: the surface already carries an old `[query]` and its previous `[result panel]` — clearing it says "this is a working tool, not a mockup".

- **Scene 2 (~2–6s) — the prompt types (the engine).** The `[prompt text]` types rapidly character-by-character behind a blinking caret; the input card GROWS downward / wraps as text fills, pushing footer controls and attachments down; a typed `[token]` may convert into an inline `[brand pill]` mid-typing (`[@browser]` → a colored `[Browser]` chip, typing continues around it); the camera may run ONE slow continuous push-in toward the input, decelerating to a near-hold on the typed ask. Sub-shape (A) may END here — cut mid-word with the caret blinking, or held on the finished prompt.
  - _Variant — Hook (A)_: the typed ask is the cliffhanger — end on the completed prompt, or on the submit click as the interface DIMS at the cut.
  - _Variant — Product_Intro (A)_: the camera dives toward the bottom input while `[option pills]` cascade in above it; the prompt is still mid-word at the cut — the product is introduced as something you talk to.
  - _Variant — CTA (A, install end card)_: the Scene-0 headline DEMOTES — scales ~50%, desaturates to gray, lifts upward — as a small `[$ chip]` spring-pops below and STRETCHES horizontally into a wide `[terminal pill]`; the `[install command]` types out inside it; a faint `[repo link]` and a "[Works with]" label fade in quietly; a row of `[tool icons]` pops in one after another with soft spring scale; the finished composition holds long, only the caret blinking.

- **Scene 3 (~4–7s) — submit + machine theater.** The `[submit control]` is clicked (cursor glide + press dip; the button may have MORPHED state on first keystroke — waveform → up-arrow — and may flip to a `[stop]` control while streaming) or the retype implies enter. The surface answers instantly with a working state: prior content VANISHES (chip grid gone, panel collapses to its slim header, whole layout swaps); then the theater — `[status phrases]` cross-dissolve with a left-to-right shimmer sweep ("[Thinking]" → "[Modeling…]" → "[Planning…]"), a `[spinner]` rotates over a loading strip, a row of `[loading cards]` lines up, or a `[checklist]` populates and its items flip one by one to green checks with strikethrough while a `[status heading]` flips tense ("[Using X]" → "[Used X]").
  - _Variant — (A) status-flare exit_: end the clip ON the theater — "[Generating…]" / the rotating spinner — the flare is the button; the answer is left to the imagination.

- **Scene 4 (rest) — the answer arrives.** Choose by sub-shape:
  - **Sub-shape B (full generate loop)**: the output BUILDS progressively, each block pushing content down — `[answer text]` streams paragraph by paragraph; `[action-log rows]` pop in sequentially, each with a `[brand icon]`; `[diff cards]` expand with green-highlight added lines; `[chart lines]` draw staggered left-to-right from a shared origin; an `[ASCII / summary table]` draws in; live counters tick; the surface auto-scrolls vertically to follow the newest line (page, terminal, or in-card scroll) — often under ONE slow continuous push-in on the result window.
  - **Sub-shape C (instant-result surface)**: the machine answers with a finished surface — the matching `[result / article]` renders in place; `[autocomplete chips]` stagger-pop below the bar WHILE the query types (the machine answers every keystroke), then a hover fills the `[Search button]` solid and a click confirms; the `[generated page]` rises as a rounded card and SCROLLS continuously beneath the pinned prompt; a blur-whip resolves onto the `[artifact window]` and a tab click FLIPS code → preview; or a zoom-out reveals the prompt pill was inside a full `[workspace]` where the `[content]` rewrites itself live.

- **Scene 5 (final beat) — resolve.** Diverges by role and sub-shape:
  - _Variant — Key_Feature (hold)_: HOLD on the completed output — chart finished, diff cards + `[action buttons]` fully rendered; no fade-out, no blank end frame.
  - _Variant — Product_Intro (confirm)_: the cursor lands the confirming click (`[Create PR]` / `[Generate]` / `[Search]`) as the clip ends, or extras fade and a final push-in leaves the clean end state; one member hard-cuts to a minimal `[end card]` — the submit button alone at dead center with a settle pop.
  - _Variant — Hook (restart — the signature)_: a SECOND `[prompt / command]` starts typing at a fresh prompt line, or the query BACKSPACES-AND-RETYPES and the output swaps wholesale to `[result 2]` — the clip ends MID-ACTION, mid-scroll or mid-word: the loop is endless, and that is the point.
  - _Variant — CTA_: the end card from Scene 2 simply holds to the last frame; the blinking cursor is the only motion.

**motion vocabulary**: character-by-character typing with blinking caret / block cursor; typed-headline beats replacing each other; input pill grows / wraps downward into a multi-line box; prompt palette / card springs in; pill bar expands sideways from a mark or chip; orb formation with glowing rim; typed token → inline brand-pill morph mid-typing; placeholder clear; ✕-click query clear; backspace-and-retype query swap; attachment drag-in and tray settle; dropdown open + row hover-highlight + checkmark select + toolbar label update; chip-grid hover dance; cursor glide / arc with hover highlight fills; click press dip; submit-button state morph (waveform→up-arrow, submit→stop); hover fill-state swap on a Search button; content vanish / panel collapse / layout swap on submit; status-phrase cross-dissolves with left-to-right shimmer sweep; pulsing "Thinking"; spinner rotation; loading strip; animated trailing dots; loading model-card row; status-heading tense flip (Using→Used); checklist squares flipping to green checks with strikethrough; action-log rows popping in sequentially with brand icons; streaming text blocks pushing content down; green-highlight diff cards expanding; staggered left-to-right chart line-draws; ASCII / summary table draw-in; count-up ticker; vertical output scroll (page / terminal / in-card) following the newest line; generated page rising as a rounded card and scrolling beneath a pinned prompt; autocomplete chips rapid stagger-pop; code↔preview instant flip on tab click; blur-whip transition; prompt jumps to a heading on submit; zoom-out reveal from prompt pill to full UI window; single eased / accelerating push-in landing on the input; slow continuous push-in on the result window; window fly-in with motion blur; zoom + pan cropping browser chrome; ⌘K modal spring-in with background blur; full-frame grid parting at the vertical centerline; headline demotion (scale-down + desaturate + lift); chip horizontal-stretch into a wide terminal pill; quiet low-contrast metadata fade-ins; sequential spring pop-ins of an icon row; second prompt typing at the cut; interface dim / fade at the cut; long static end hold with blinking cursor.

**rule mapping**

- character-by-character typing, placeholder clear, backspace-and-retype, second prompt at the cut, typed-headline beats → `discrete-text-sequence` (typing / typos / holds / backspace) backed by `gsap-effects` (typewriter recipe)
- blinking caret / block cursor (persisting through holds) → `context-sensitive-cursor`
- prompt / status / output phrase windows, script-driven beat durations → `dynamic-content-sequencing`
- input card grows downward / wraps as text fills → `anchored-layout-expand` (top-anchored downward growth, stepped at wrap boundaries)
- typed token → inline brand-pill morph mid-typing → composition: `scale-swap-transition` (token→chip swap at the conversion threshold) + `card-morph-anchor` (the reflow around the chip)
- prompt palette / modal / dropdown springs in; loading cards, log rows, diff cards, autocomplete chips, icon rows arriving staggered → `spring-pop-entrance` (single hero or staggered group)
- pill bar expands sideways from a mark; chip stretches into a wide terminal pill → `card-morph-anchor` (container morph)
- cursor glide to a control, press, ripple → `cursor-click-ripple`; the press dip + recovery → `press-release-spring` (or `physics-press-reaction` for cursor+button compressed together)
- hover highlight fills, Search-button instant solid fill, UI keyword accents → `asr-keyword-glow` (static-timeline glow variant) or `press-release-spring` (color-transition variation)
- attachment drag-in with cursor → `context-sensitive-cursor` (pointer↔grab) + `spring-pop-entrance` (tray settle)
- content vanish / layout swap / panel collapse on submit; code↔preview instant flip → `scale-swap-transition` (paired same-center swap) or a hard `tl.set` state swap via `discrete-text-sequence` semantics
- prompt jumps to a heading on submit → FLIP reposition — see `hyperframes-keyframes` (FLIP); the travel itself via `nudge-curve` (slow-fast-slow group slide)
- status-phrase cross-dissolves with shimmer sweep → `discrete-text-sequence` (phrase swaps) + `ambient-glow-bloom` (Shimmer sweep variation — single-pass traveling sheen, clipped to the text)
- spinner rotation, animated trailing dots, pulsing loader glyphs → `svg-icon-enrichment` (rotating / pulsing internal SVG elements); the bounded "Thinking" pulse → `sine-wave-loop` (finite repeats — this pulse PERFORMS status, it is not idle wobble)
- checklist state flips, status-heading tense flip, status-pill swaps → `discrete-text-sequence` (discrete state stepping); the checkmark stamp → `svg-path-draw` or `spring-pop-entrance`
- streaming text blocks / log rows pushing content down → `dynamic-content-sequencing` (per-block windows) + `spring-pop-entrance` (per-row arrival)
- vertical output scroll following the newest line (page / terminal / in-card) → composition: content translateY keyed to the same timeline as the content windows + a matched `viewport-change` counter-pan when the frame itself travels
- generated page as a rounded card whose internal content scrolls → `3d-page-scroll` (flat variant — internal scroll of a page card)
- staggered chart line-draws → `svg-path-draw` (stroke-dashoffset, staggered starts)
- count-up ticker / live counters → `counting-dynamic-scale`; result bars / fills → `stat-bars-and-fills`
- single eased push-in landing on the input; slow continuous push-in on the result → `multi-phase-camera` (push phase) with the destination framed via `coordinate-target-zoom`
- zoom-out reveal from prompt pill to full workspace; zoom + pan cropping chrome → `viewport-change` (composite pan+scale on the `.world` wrapper)
- window fly-in with motion blur; blur-whip transition → `motion-blur-streak`
- ⌘K modal with background blur → `depth-of-field-blur` (blur the page plane, keep the modal sharp) + `spring-pop-entrance`
- full-frame grid parting at the vertical centerline → `center-outward-expansion` (halves glide outward in lockstep)
- orb formation with glowing rim → `ambient-glow-bloom` + `spring-pop-entrance`
- headline demotion (scale-down + desaturate + lift) → `gsap-effects` (plain composite tween; no dedicated rule needed)
- interface dim at the cut, hard cut to a minimal end card, end mid-word / mid-scroll → exit conventions, no rule needed
- long static end hold with only the caret blinking → `context-sensitive-cursor` (the blink is the sanctioned residual motion)

**camera modifier** (the camera always serves the ask or the answer; many members are fully camera-static — typing, submit theater, and streaming carry the shot)

- ONE smooth eased / accelerating push-in that lands tight on the input and LOCKS (Hook, Product_Intro) → `multi-phase-camera` (push) + `coordinate-target-zoom` (target the input) — the defining move of the "watch me ask" opener.
- ONE slow continuous push-in running under the typing or under the output build, decelerating to a near-hold (Product_Intro, Key_Feature) → `multi-phase-camera` — gives the response weight without stealing from it.
- ONE zoom-out reveal — the prompt pill turns out to live inside a full workspace (Key_Feature, sub-shape C) → `viewport-change` (pull-back) — the inverse move; the ask was closer to the product than you thought.
- Entry-only flourishes: window fly-in with motion blur (`motion-blur-streak`), zoom + pan cropping browser chrome (`viewport-change`) — both settle before typing starts.
- Never more than two real viewport moves per shot; the frame is LOCKED during submit theater and streaming (the content scrolls, the camera does not).

## Selected motion rule: context-sensitive-cursor

---
name: context-sensitive-cursor
description: Cursor color and styling that adapt to the current text segment being typed — accent color on highlights, dim on placeholders, etc.
metadata:
  tags: cursor, color, context, typewriter, styling, segment
---

# Context-Sensitive Cursor

In a typewriter sequence, the cursor's color (and optionally height / blink behavior) matches the **active text segment** — brand accent while typing the brand name, dim on placeholders, success color on the completion mark. The eye lands on the keyword being typed because the cursor shifts with it; a fixed single-color cursor is visual noise by comparison. Layers on top of [discrete-text-sequence](discrete-text-sequence.md)'s SEQUENCE pattern.

## How It Works

The text is authored as a SEQUENCE of `{ t, text, segment, color }` entries; a linear driver's `onUpdate` reverse-searches for the current entry and writes both the visible text and the cursor's `background` (the cursor is a colored block, so `background`, NOT `color`). A second linear tween sweeps a phase `p` through `2π × BLINK_CYCLES_PER_SCENE` and gates cursor opacity on `sin(p) > 0` — a deterministic square-wave blink on the timeline.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="terminal">
  <div class="prompt">$</div>
  <div class="text-wrap">
    <span class="text" id="text"></span><span class="cursor" id="cursor">_</span>
  </div>
</div>
```

```css
.terminal {
  font-family: {monoFont}; /* proportional fonts drift the cursor mid-segment */
  display: flex;
  align-items: baseline;
  white-space: pre; /* preserve trailing spaces — cursor sits at segment end */
}
.text {
  white-space: pre;
}
.cursor {
  display: inline-block; /* inline ignores width/height */
  width: {cursorWidth}px;
  height: {cursorHeight}px;
  background: {textColor}; /* default — overridden per segment in onUpdate */
  vertical-align: {cursorBaselineFix}px; /* small negative — anchor to baseline, not line-height */
}
```

```js
// Adjacent entries usually share a text prefix but may differ in `segment` —
// that's what shifts the cursor color mid-line.
const SEQUENCE = [
  { t: 0, text: "", segment: "main", color: "{mainColor}" },
  { t: T_LEADIN_END, text: "{leadInChunk}", segment: "main", color: "{mainColor}" },
  { t: T_BRAND_IN, text: "{leadInBrandPrefix}", segment: "brand", color: "{brandColor}" },
  { t: T_BRAND_OUT, text: "{leadInBrandFull}", segment: "main", color: "{mainColor}" },
  { t: T_CMD_IN, text: "{leadInCmdPrefix}", segment: "cmd", color: "{cmdColor}" },
  { t: T_SUCCESS, text: "{leadInDone}", segment: "success", color: "{successColor}" },
];

function entryAt(time) {
  for (let i = SEQUENCE.length - 1; i >= 0; i--) {
    if (time >= SEQUENCE[i].t) return SEQUENCE[i];
  }
  return SEQUENCE[0];
}

const textEl = document.getElementById("text");
const cursorEl = document.getElementById("cursor");

const driver = { t: 0 };
tl.to(
  driver,
  {
    t: DURATION,
    duration: DURATION,
    ease: "none",
    onUpdate: () => {
      const entry = entryAt(driver.t);
      textEl.textContent = entry.text;
      cursorEl.style.background = entry.color;
    },
  },
  0,
);

// Deterministic square-wave blink
const blink = { p: 0 };
tl.to(
  blink,
  {
    p: Math.PI * 2 * BLINK_CYCLES_PER_SCENE,
    duration: DURATION,
    ease: "none",
    onUpdate: () => {
      cursorEl.style.opacity = Math.sin(blink.p) > 0 ? "1" : "0";
    },
  },
  0,
);
```

## Variations

- **Non-blinking during active typing** — suppress blink while letters are appearing (solid cursor), resume on idle. This MUST be a pure function of the driver's time: tracking a mutable `lastChangeTime` in `onUpdate` is not reverse-seek-safe (scrubbing backwards leaves the stale forward-pass value behind and the cursor blinks — or holds solid — at the wrong frames). Bake the change times from the SEQUENCE instead — every entry whose `text` differs from its predecessor is a typing event:

```js
// Baked once at build time — no runtime state.
const CHANGE_TIMES = SEQUENCE.filter((e, i) => i > 0 && e.text !== SEQUENCE[i - 1].text).map(
  (e) => e.t,
);
// In onUpdate — identical result at any seek, either direction:
const isTyping = CHANGE_TIMES.some((t) => t <= driver.t && driver.t - t < TYPING_GRACE);
cursorEl.style.opacity = isTyping ? "1" : Math.sin(blink.p) > 0 ? "1" : "0";
```

- **Cursor HEIGHT shifts on segment** — larger cursor on the brand segment: `cursorEl.style.height = entry.segment === "brand" ? cursorHeightEmphasis : cursorHeight` (1.1–1.25×; more reads as glitch).
- **Contrast reversal** — a dark-text-on-light segment needs a dark cursor too; keep `entry.color` as the single source of truth and read from it.

## Values

| token                  | range                       | notes                                                                                           |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| DURATION               | 4–8s per typed line         | `≥ SEQUENCE[last].t + closing dwell`                                                            |
| entry `t` spacing      | 0.2–0.5s micro-additions    | ascending, non-uniform — slow down on highlights                                                |
| segment palette        | 3–4 colors max              | more reads as random; brand vs success should differ in saturation/luminance                    |
| cursorWidth / Height   | 8–24px / 0.85–1.0× fontSize | too thin vanishes in render compression; too tall outranks the text                             |
| cursorBaselineFix      | small negative px           | drop the block to the text baseline                                                             |
| BLINK_CYCLES_PER_SCENE | period ≈ 0.6–1.2s           | **whole number** — otherwise the sin sweep ends mid-cycle and the cursor pops on the last frame |
| TYPING_GRACE           | 0.15–0.3s                   | **< shortest dwell between adjacent entries** — otherwise the cursor never blinks               |

## Critical Constraints

- **Cursor color goes on `background`** — it's a colored block, not a glyph.
- **Blink is timeline-driven sin, pure of any mutable tracker** — the typing-grace variation shows the seek-safe form.
- **`white-space: pre` on text and container** — collapsed trailing spaces park the cursor in the wrong column.
- **Monospace font + `display: inline-block` cursor** — proportional faces drift the cursor mid-segment; inline ignores the block geometry.
- **BLINK_CYCLES_PER_SCENE is a whole number** for the fixed DURATION.

## See also

`discrete-text-sequence` (the underlying SEQUENCE pattern) · `camera-cursor-tracking` (camera follows the cursor) · `press-release-spring` (post-typing confirm press).

## Selected motion rule: discrete-text-sequence

---
name: discrete-text-sequence
description: Replace entire text states at frame thresholds for non-linear typing effects — typos, bulk additions, pauses, backspaces, simulated thinking.
metadata:
  tags: text, typing, discrete, threshold, non-linear, sequence
---

# Discrete Text Sequence

Instead of character-by-character typewriter, replace entire string states at time thresholds — enabling non-linear effects (typos, backspaces, bulk paste, "thinking" gaps) that smooth per-char typing can't achieve. If your effect is "type each character, no edits", this rule is overkill — use the smooth-slice variation below.

## How It Works

The typing is authored as a sparse array of `{ t, text }` states; on every `onUpdate` a **reverse search** finds the latest entry whose `t` has passed and renders its text. Display jumps between states with no animation between them — the realism comes from the schedule shape: fast keystroke clusters (0.06–0.20s apart), pauses at word breaks (0.3–0.6s), a typo, backspaces peeling back to the fork, then a bulk paste replacing many chars in one entry. A block cursor blinks via a deterministic sin square wave on the same timeline.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="terminal">
  <div class="prompt">$</div>
  <div class="text-wrap">
    <span class="text" id="text"></span><span class="cursor" id="cursor">_</span>
  </div>
</div>
```

```css
.terminal {
  font-family: {monoFont}; /* monospace required — proportional jitters even in a fixed box */
  display: flex;
  align-items: baseline;
  font-size: TERMINAL_FONT_SIZE;
}
.text-wrap {
  display: inline-flex;
  align-items: baseline;
  min-width: TEXT_WRAP_MIN_WIDTH; /* ≥ widest state — stops right-edge jitter */
  white-space: nowrap;
}
.cursor {
  display: inline-block; /* inline ignores width */
  width: CURSOR_WIDTH;
}
```

```js
// Each entry shows from its t until the NEXT entry's t.
// Shape: keystrokes → typo → backspace to the fork → bulk paste → completion mark.
const SEQUENCE = [
  { t: 0.0, text: "" },
  { t: T_K1, text: "{p1}" }, // first keystrokes (~3-5 chars, 0.1-0.2s apart)
  { t: T_K2, text: "{p1 + ' ' + p2_typo}" }, // continuation containing a typo
  { t: T_BS, text: "{p1 + ' ' + p2_partial}" }, // backspace(s) — peel back to the fork
  { t: T_BULK, text: "{fullCorrectedText}" }, // bulk paste — many chars in one jump
  { t: T_DONE, text: "{fullCorrectedText + ' ✓'}" }, // completion marker
];

// Reverse-search for the latest entry whose t has passed
function textAt(time) {
  for (let i = SEQUENCE.length - 1; i >= 0; i--) {
    if (time >= SEQUENCE[i].t) return SEQUENCE[i].text;
  }
  return "";
}

const textEl = document.getElementById("text");
const cursorEl = document.getElementById("cursor");

const driver = { t: 0 };
tl.to(
  driver,
  {
    t: TOTAL_DURATION,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      textEl.textContent = textAt(driver.t);
    },
  },
  0,
);

// Cursor blink — deterministic sin square wave, never a CSS animation
const blink = { p: 0 };
tl.to(
  blink,
  {
    p: Math.PI * 2 * BLINK_CYCLES,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      cursorEl.style.opacity = Math.sin(blink.p) > 0 ? "1" : "0";
    },
  },
  0,
);
```

## Variations

- **Smooth character slice** (continuous typewriter — no pauses, no edits): faster to author but uniformly "machine-typed", missing the human realism:

```js
const fullText = "{fullPhrase}";
const len = { v: 0 };
tl.to(
  len,
  {
    v: fullText.length,
    duration: TYPE_DUR,
    ease: "power1.inOut",
    onUpdate: () => {
      textEl.textContent = fullText.substring(0, Math.floor(len.v));
    },
  },
  0,
);
```

- **Thinking pause** — hold one state for `THINK_HOLD_DUR` (0.8–2.0s; under 0.5s reads as a stutter, not thought) simply by leaving a gap before the next entry's `t`.
- **State pulse on completion** — when the final state lands, `tl.to(".text", { scale: 1.03–1.08, duration: 0.15–0.3, yoyo: true, repeat: 1 }, T_DONE)`.
- **Per-state color shift** — in `onUpdate`, branch on `driver.t` vs the milestones: success color after `T_DONE`, dim mid-edit, normal while typing.

## Values

| token               | range                                        | notes                                                                  |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| TERMINAL_FONT_SIZE  | 48–96px                                      | full-bleed comps; smaller for terminal-style detail                    |
| TEXT_WRAP_MIN_WIDTH | ≥ widest state                               | measure with a hidden probe after `document.fonts.ready` if unsure     |
| milestone `t`s      | keystrokes 0.06–0.20s apart; pauses 0.3–0.6s | monotonically increasing; `T_DONE ≤ TOTAL_DURATION − ~1s` climax dwell |
| TYPE_DUR (smooth)   | `chars × 0.06–0.12s`                         | fast → relaxed                                                         |
| BLINK_CYCLES        | one cycle per 0.5–0.8s                       | `TOTAL_DURATION / 0.8 ≤ BLINK_CYCLES ≤ TOTAL_DURATION / 0.5`           |
| CURSOR_WIDTH        | ~0.3× font size                              | gap to text single-digit px so the cursor feels attached               |

## Critical Constraints

- **Reverse-search the array each frame** — O(n) with small n (≤30 typical); don't index by frame, the sequence is sparse.
- **`min-width` on the text wrap is mandatory** — without it the right edge jitters as state length changes.
- **Discrete jumps must be INSTANT** — any transition on the text turns the jump into a smear and kills the "typing" feel.
- **Cursor blink is sin/sequence-driven on the timeline**, `display: inline-block`, monospace font, `white-space: nowrap` (wrapping mid-state breaks the illusion; trailing spaces must survive).
- **Discrete vs smooth** — use discrete only for non-linear states (typos, pauses, bulk paste); plain typing takes the smooth-slice variation.

## See also

`context-sensitive-cursor` (same SEQUENCE pattern + segment-colored cursor) · `3d-text-depth-layers` (discrete text with layered depth) · `counting-dynamic-scale` (discrete label beside a smooth counter) · `press-release-spring` (post-completion press beat).

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
