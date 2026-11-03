# Frame packet: 05-fit

## Project inputs

- Project: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- Design tokens: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\frame.md
- RULES_DIR: C:\Users\hotra\.claude\skills\hyperframes-animation\rules

## Assigned storyboard block

## Frame 5 — Fit (12.7–16.4s, ~3.7s)

- scene: A long incident log folds down: each paragraph collapses to a one-line summary with an anchor; 1,449 → 475 tokens, 33% of input.
- voiceover: "Too long? Fold fourteen hundred tokens to under five hundred."
- duration: 3.7s
- transition_in: zoom-through
- status: built
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

## Selected blueprint: grid-card-assemble

# grid-card-assemble — Grid / Card Assemble

**intent**: N items (tiles / cards / logos / list-lines) self-assemble in a staggered cascade into a grid or vertical list and hold — a "look how much / who / what it does" beat that enumerates breadth at once; an optional camera zoom-OUT pulls back to reveal the assembled array sitting inside a vaster whole.

**roles served**

- Key_Feature (from key-feature-card-grid-assemble): a grid of labeled feature tiles/pills (icon + label) cascades one-by-one into a 2-col-brick / 3×3 grid, then holds near-static with a slow push-in — enumerate many capabilities, no live UI, no cursor.
- Key_Feature (from key-feature-glass-card-camera-reveal): open TIGHT on 2–3 glowing icons; a camera zoom-OUT unfolds a row of glassmorphism cards that grow from behind the icons (icons shrink to card headers), center card scales forward, the group floats, then sweeps out — a "pillars revealed at once" reveal variant of the same assemble shape.
- Benefits (from benefits-vertical-list): short value phrases populate a single vertical list ~1 item/sec, co-resident and accumulating; each line enters via a spring marker-pop + check-draw + pill mask-wipe, OR the whole stack snaps up one slot per beat (slot-machine) so the newest lands in the bright focal slot.
- Social_Proof (from social-proof-logo-grid-zoom-out): a wall of partner/app logos builds into a center grid (whole-enter / randomized pop-in / column slide-up), an optional headline + accent-gradient proof-number fills in above, then a continuous camera zoom-OUT shrinks the array to reveal a vast ecosystem; optional fixed HUD/viewfinder brackets; optional grid slide-up fly-out exit.
- Key_Feature (from live-data-populate-board): the array assembles by POPULATING ITSELF — skeleton pills fill and swap to real data, cards spring in tethered to map markers — and its state keeps flipping live after assembly (status pills stepping through states); no cursor, locked frame. The "look how much" beat becomes "look, it's doing it right now."
- Benefits (from item-field-to-payoff-card): a breadth FIELD — a rapidly streaming list past a fixed focal slot, or a chip array with one highlighted hero — plays its breadth motion, then CLEARS to concise centered payoff text (claim / price / URL end card). The array is the argument's setup; the payoff line is its landing.

**duration**: 3.0–10.5s (Social_Proof 3.0–6s · live-populate 4.2–7.8s · Key_Feature grid 5.8–7.3s · Benefits stream/field-to-payoff 5.9–8.4s · Key_Feature glass-card 6.5s · Benefits list 6.5–10.5s, scaling ~1 item/sec with count)

**shot structure** (consolidated template — concrete motion verbs, [slots])

- **Scene 1 (0.0–~1.0s) — open + first arrivals.** On a `[gradient / radial / dark background]` (optional `[dot-grid / drifting-watermark]` texture), an empty `[grid or list region]` is established and items begin to ASSEMBLE in a quick staggered cascade (~0.04–0.08s gap; list pacing ~1 item/sec). Each `[item: feature tile / pill / logo tile / benefit line]` fades + slides/scales a short distance directly into its slot (low drama — no scatter, no big bounce; spring overshoot reserved for accent markers). Camera static. An opening `[headline / hook]` may fill in line-by-line above the array, with any `[proof number]` counting up in an `[accent gradient]`.
- **Scene 2 (~1.0s–~Xs) — array resolves + holds.** Remaining items finish arriving; layout resolves into the final `[2-col-brick / 3×3 grid / dense mosaic / stacked list]`. The completed array HOLDS, alive but resting: a gentle continuous parallax/sine FLOAT on the tiles and/or a slow camera push-in (faint scale-up). Optional `[accent-color]` glow TRAVELS across/behind the tiles.
- **Scene 3 (~Xs–end) — settle / reveal / exit.** Everything settles and holds to the end, OR the optional camera modifier runs (see below), OR a `[closing line / CTA]` book-ends the array. OR the field CLEARS to payoff copy — the array exits and a concise centered `[claim / price / URL]` lands (price via a very fast character snap-build with a split-second partial state; URL via a left-to-right reveal, holding in `[accent]` and flipping to `[ink]` only in the final beat) — OR the camera PUSHES THROUGH one highlighted `[hero item]` (single rapid accelerating push-in) and crossfades into a second, vaster receding `[word-grid depth field]` that continuously scales down to reveal ever more items before fading to the payoff.

Variants (where roles diverge from the template):

- **Variant — Key_Feature grid**: items are labeled `[icon + feature-label]` tiles/pills assembling into a 2-col-brick / 3×3 grid; near-static hold with slow push-in + optional traveling-glow sweep; headline book-ends (`[hook]` → `[CTA]`). No camera reveal.
- **Variant — Key_Feature glass-card-reveal**: the assemble is CAMERA-DRIVEN, not element-stagger. Open tight on `[2–3 glowing icons]`; camera zoom-OUT grows `[N]` glass cards out from behind the icons (icons shrink ~50% to become card headers), `[center card]` scales ~105% and moves forward to overlap the sides (quick spring); cards hold side-by-side with continuous parallax float; exit = fast motion-blur SWEEP slides the cards off-frame.
- **Variant — Benefits vertical-list**: a single vertical `[benefit-line]` stack, ~1 item/sec, three sub-modes — (a) BUILD: each line stays fully lit; entry = `[marker]` spring-pop + `[check/icon]` draw-in + `[pill]` mask-wipe of the text; (b) SNAP: the whole stack steps up one slot per beat (~0.1s eased) so the newest line lands in the bright focal slot and lines leaving it dim by position; (c) STREAM: the list scrolls rapidly and continuously past the focal slot — center item opaque `[ink]` and slightly enlarged, neighbors faded/shrunk — then DECELERATES to stop on the `[chosen item]`; optionally split-framed against a fixed static `[label]` on the opposite side; the field then clears to a centered `[payoff line]`. Static camera; optional perpetual `[decorative orbit/disc]` on the opposite side. No camera reveal.
- **Variant — Key_Feature live-populate**: the assemble is a DATA-POPULATION wave, cursorless, frame locked (± one gentle opening zoom-out that makes room for the `[headline]`). Two board shapes — (a) ANCHORED: `[white data cards]` spring in one-by-one, each tethered by a thin line to its `[marker]` on a `[map/board surface]` whose markers pulse (expanding fading rings); (b) TABULAR: new `[columns]` appear as grey skeleton pills, progress fills run left→right staggered top-to-bottom (colored fill with a leading tip), each bar SWAPPING to its real `[value/avatar chip]` on completion. After assembly the array stays LIVE: `[status pills]` flip states in quick snappy swaps (color-coded, several in succession), or the `[headline]` crossfades and a second population wave runs on a newly revealed region — the table content scrolling horizontally beneath a sticky first column to expose it. Hold lands on the fully populated, fully updated final state.
- **Variant — Social_Proof logo-wall-zoom-out**: intro beat (`[trusted-by headline]` card OR a `[product screenshot]`) crossfades/cuts to a center logo grid that builds (whole-enter / randomized pop-in / column slide-up); a continuous camera zoom-OUT then shrinks the whole grid toward center to reveal a vast ecosystem and holds; optional fixed HUD/viewfinder brackets; optional exit = whole grid SLIDES UP and flies out through the top.

**motion vocabulary**: item stagger-assemble (fade + short slide/scale into slot) · brick/grid/list layout resolve · randomized pop-in · column slide-up · vertical-list step (slot-machine snap-and-hold) · spring-overshoot marker pop · check/icon draw-in · pill/label mask-wipe reveal · dim-by-position de-emphasis · line-by-line headline fill · accent-gradient number count-up · near-static hold · gentle parallax/sine float on hold · slow camera push-in · camera zoom-OUT reveal (continuous OR phased pull-back) · cards-grow-from-behind-icons · icon-shrink-to-header · center-card scale-up + forward overlap (spring) · traveling-glow sweep · fixed HUD/viewfinder brackets · motion-blur slide-out sweep (exit) · grid slide-up fly-out (exit) · book-end headline fade · perpetual decorative orbit/loop · skeleton-pill progress fill (left→right, leading tip, color transition) · fill-completes-swap-to-real-data · staggered top-to-bottom fill cascade · live status-pill state flips (color-coded, post-assembly) · tethered-card spring-in (thin line to an anchor marker) · pulsing marker rings · two-wave populate with headline crossfade · sticky-column internal horizontal scroll · rapid vertical stream past a fixed focal slot + deceleration stop · split fixed-label layout · pill-widens-as-label-fills arrival · highlighted hero chip · push-through-the-hero-item exit · receding word-grid depth field · clear-to-payoff coda · price snap-build (split-second partial state) · left-to-right URL reveal + final-beat color flip.

**rule mapping** (motion verb → `rule-id`)

- item stagger-assemble into slot → `center-outward-expansion` (per-item stagger + short-path slide variant; for a wall too dense for a true center burst, use it in its "starting partially-spread"/direct-into-slot form — see merge tension)
- brick/grid/list layout resolve → `center-outward-expansion` (target positions = final layout slots)
- randomized pop-in stagger → `gsap-effects` (stagger recipe; randomized `from`/order)
- column slide-up into grid → `gsap-effects` (per-column staggered slide-up)
- vertical-list step / slot-machine snap-and-hold → `vertical-spring-ticker` (STEPS = number of line advances)
- spring-overshoot marker pop → `spring-pop-entrance` (back.out spring) — also `gsap-effects` for the staggered pop chain
- check / icon draw-in inside marker → `svg-path-draw`
- live line-art icon in a tile (internal parts) → `svg-icon-enrichment`
- pill / label mask-wipe text reveal → `techniques.md` (clip-path reveal)
- dim-by-position de-emphasis → `gsap-effects` (per-line opacity by slot position; no dedicated rule)
- line-by-line headline fill → `discrete-text-sequence`
- accent-gradient proof number count-up → `counting-dynamic-scale`
- gentle parallax / sine float on hold → `sine-wave-loop` (apply the concurrent-elements amplitude `/√N` rule for a held grid)
- slow camera push-in → `multi-phase-camera` (steady-push phase pattern)
- center-card scale-up + forward overlap → `spring-pop-entrance` (the quick spring) + `techniques.md` CSS-3D (z-depth overlap)
- cards-grow-from-behind-icons / icon-shrink-to-header → driven by the camera reveal (`multi-phase-camera`) — the grow/shrink are scale tweens chorded to the pull-back phase; no separate rule
- fixed HUD / viewfinder brackets → `ai-tracking-box` (static-bracket variant — overlay frame, not tracking)
- book-end headline fade → `discrete-text-sequence` (or `gsap-effects` fade)
- perpetual decorative orbit / disc / loop → `sine-wave-loop` (or `orbit-3d-entry` if it's an orbiting badge ring)
- traveling-glow sweep across/behind tiles → `ambient-glow-bloom` (one-pass traveling glow sweep across the tiles)
- motion-blur slide-out sweep (glass-card exit) → `motion-blur-streak` (directional velocity blur on the fast sweep that carries the cards off-frame)
- grid slide-up fly-out exit → `gsap-effects` (plain staggered translate-off-frame; no dedicated rule needed — a basic exit tween, not a missing capability)
- skeleton-pill progress fill → `stat-bars-and-fills` (progress-fill `scaleX` form; the leading tip is a chorded child element)
- fill-completes-swap-to-real-data / live status-pill flips / headline crossfade between waves → `discrete-text-sequence` (whole-state replacement at time thresholds — the pill's states are text states)
- staggered top-to-bottom fill cascade → `gsap-effects` (per-row stagger on the fill tweens)
- tethered-card spring-in → `spring-pop-entrance` (the card) + `avatar-cloud-network` (the thin connection-line-to-anchor layout; anchor coordinates must match the marker exactly) + `svg-path-draw` if the tether draws in
- pulsing marker rings → `cursor-click-ripple` (its expanding-ring + attack-decay opacity envelope, minus the cursor/click, on a bounded repeat)
- sticky-column internal horizontal scroll → `viewport-change` (PAN form on the inner column layer; the sticky column sits outside the panned layer) — mark the moving layer `data-layout-allow-overflow` and clip at the table card
- rapid vertical stream past a focal slot + deceleration stop → `vertical-spring-ticker` (continuous form: one long decelerating translate instead of its stepped tweens; focal-slot emphasis reuses the dim-by-position mapping above)
- pill-widens-as-label-fills → `card-morph-anchor`'s substitution law (uniform `scaleX`/clip-path — never tween `width`) + `discrete-text-sequence` for the label fill
- push-through-the-hero-item exit → `multi-phase-camera` (single accelerating push phase) aimed via `coordinate-target-zoom` at the highlighted chip, crossfading at peak
- receding word-grid depth field → `viewport-change` (one `.world` wrapper, `cam.scale` ↓ continuously — the zoom-OUT reveal grammar pointed at a word field; size/opacity tiers fake the depth)
- price snap-build (split-second partial state) → `discrete-text-sequence` (non-linear typing with bulk additions — exactly its typo/partial-state mechanic)
- left-to-right URL reveal → `techniques.md` (clip-path reveal — same mapping as the pill mask-wipe); the final-beat color flip → `gsap-effects` (a `tl.set` at the beat — basic, no rule needed)

**camera modifier — zoom-OUT reveal** (optional; the role-defining move for the glass-card and logo-wall variants): a camera wrapper around the whole array scales DOWN over the hold, revealing the assembled grid/cards sitting inside a larger environment (ecosystem scale, or a row of cards unfolding from tight icons).

- Continuous single-pass zoom-out (Social_Proof ecosystem pull-back) → `viewport-change` (one wrapper, `cam.scale` ↓ via onUpdate — single source of truth)
- Phased pull-back → focus → settle, with built-in drift (Key_Feature tight-icons → cards-unfold) → `multi-phase-camera` (use the "Dramatic reveal: push → neutral → pull" / pull-back phase pattern; grow/shrink of cards chords to the pull-back phase)

---

```
BLUEPRINT: grid-card-assemble — serves Key_Feature, Benefits, Social_Proof (folded 4 drafts + 2 mined clusters: live-data-populate-board, item-field-to-payoff-card)
RULE COVERAGE: complete, no gaps — traveling-glow sweep → ambient-glow-bloom; motion-blur slide-out sweep (exit) → motion-blur-streak; grid slide-up fly-out (exit) → gsap-effects (plain translate); skeleton-fill populate → stat-bars-and-fills + discrete-text-sequence; push-through-hero exit → multi-phase-camera + coordinate-target-zoom
```

Merge tension: `center-outward-expansion` (the natural backing for stagger-assemble) caps cleanly at 3–8 items and explicitly warns 8+ causes mid-flight overlap chaos — but a Social_Proof logo wall is deliberately dense (12+ tiles), so for that variant the items must NOT burst from a shared center; they slide a short distance directly into their own slot (the rule's "starting partially-spread"/short-path form, or a `gsap-effects` per-item stagger), which the consolidated Scene-1 verb already specifies as "short distance directly into its slot."

## Selected motion rule: center-outward-expansion

---
name: center-outward-expansion
description: Elements start clustered at screen center and expand outward to their final positions, driven by a shared progress value.
metadata:
  tags: expansion, scatter, center, reveal, layout, sync, burst
---

# Center-Outward Expansion

Elements begin at one shared center point and radiate outward to their final positions — the entry beat itself, or motion driven by another animation's progress (a counting number, a beat). Flat 2D cousin of [depth-scatter-assemble.md](depth-scatter-assemble.md) (per-element 3D cloud): here every element shares the SAME origin.

## How It Works

Each element carries its final offset as `data-target-x/y`. Its position lerps between center and target: `x = targetX × progress`. Self-centering is baked as `xPercent/yPercent: -50` so the tweened `x`/`y` are pure offsets from the stage center. Standalone burst = per-item staggered `fromTo`; driven burst = one shared proxy (see Variations).

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="burst-wrap">
  <div class="burst-item" data-target-x="-360" data-target-y="-180">{itemA}</div>
  <div class="burst-item" data-target-x="360" data-target-y="-180">{itemB}</div>
  <div class="burst-item" data-target-x="0" data-target-y="360">{itemC}</div>
</div>
```

```css
.burst-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}
.burst-item {
  position: absolute;
  top: 50%;
  left: 50%; /* GSAP xPercent/yPercent -50 bakes the centering; x/y tween the offset */
  will-change: transform;
}
```

```js
document.querySelectorAll(".burst-item").forEach((el, i) => {
  tl.fromTo(
    el,
    { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.6, opacity: 0 },
    {
      x: Number(el.dataset.targetX),
      y: Number(el.dataset.targetY),
      scale: 1,
      opacity: 1,
      duration: EXPAND_DUR,
      ease: EXPAND_EASE,
    },
    ENTRY_AT + i * STAGGER,
  );
});
```

## Variations

- **Synced to a driver (chord)**: when the burst shadows a counter / beat, drop the stagger and drive all items from ONE 0→1 proxy tween with the driver's exact duration AND ease; `onUpdate` writes `translate(-50%,-50%) translate(targetX*p, targetY*p)` per item — the two read as one beat.
- **Partially-spread start**: with 6+ items the full cluster piles up — start from `{ x: targetX * START_PROGRESS, ... }`.
- **Idle micro-float**: hand off to [sine-wave-loop.md](sine-wave-loop.md) after landing instead of freezing.

## Values

| token          | range                | notes                                                            |
| -------------- | -------------------- | ---------------------------------------------------------------- |
| ITEM_COUNT     | 3–8                  | > 8 = visual chaos mid-expansion; low counts want wider spread   |
| EXPAND_DUR     | 1.0–1.8s             | must equal the driver's duration in the synced variant           |
| EXPAND_EASE    | `power3.out` default | `power2.out` gentler, `expo.out` dramatic stop; NEVER `in` eases |
| STAGGER        | 0.04–0.08s           | tighter = chord; looser = lazy arpeggio                          |
| ENTRY_AT       | 0–0.5s               | a beat of compositional quiet before the burst                   |
| START_PROGRESS | 0–0.5                | 0 = dramatic full cluster; ~0.3 avoids the pile-up               |

## Critical Constraints

- **Tween `x`/`y` over the baked `xPercent/yPercent: -50`** — mutating `left`/`top` fights the centering and causes pixel jitter.
- **Out-easing only** — `in` easings read as items being sucked back mid-air.
- **No other absolute-positioned siblings inside `.burst-wrap`** — they'd steal the centered baseline.
- **❗ The burst IS the beat** — don't park a "real headline" label below it (the eye snaps to the label and ignores the burst). If a label is needed, reveal it post-burst in the same stack.
- Synced variant: identical duration + ease as the driver, or the chord falls apart.

## See also

`counting-dynamic-scale` (the classic chord driver) · `depth-scatter-assemble` (3D per-element cloud) · `card-morph-anchor` (burst out of a morphed card) · `sine-wave-loop` (post-landing life).

## Selected motion rule: counting-dynamic-scale

---
name: counting-dynamic-scale
description: Counter animation where the value counts up while transform scale grows to its final size, creating escalating visual weight without per-frame text reflow.
metadata:
  tags: counter, counting, scale, transform, number, dynamic, emphasis
---

# Counting with Dynamic Scale

A number counts from A → B while its transform scale grows to the final size — escalating visual weight ("this is impressive") without tweening `font-size` or forcing text layout on every frame. The final font size is static CSS; only the transform changes.

## How It Works

Two synchronized tweens at the SAME timeline position with the SAME ease: (1) a proxy value rendered as text via `onUpdate` (`Math.round(...).toLocaleString()`), (2) the counter's transform `scale: START_SCALE → 1`, where `START_SCALE = START_SIZE / END_SIZE`. A suffix (`%`, `×`, `+`) slides in AFTER the count lands — the number gets its own beat — and a label fades in early.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="counter-wrap">
  <span class="counter" id="counter">0</span><span class="counter-suffix">{suffix}</span>
</div>
<div class="counter-label">{label}</div>
```

```css
.counter-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  width: {counterContainerWidth}; /* fixed width — no layout shift as digit count changes */
}
.counter {
  font-variant-numeric: tabular-nums; /* MANDATORY — digits keep equal width */
  display: inline-block;
  font-size: {endSize}; /* final size is static; GSAP animates scale, not font-size */
  transform-origin: center center;
}
.counter-suffix {
  opacity: 0;
  transform: translateY(20px);
}
```

```js
const counter = document.getElementById("counter");
const state = { value: 0 };
const START_SCALE = START_SIZE / END_SIZE;

// Count value — onUpdate changes text only
tl.to(
  state,
  {
    value: TARGET_VALUE,
    duration: COUNT_DUR,
    ease: COUNT_EASE,
    onUpdate: () => {
      counter.textContent = Math.round(state.value).toLocaleString();
    },
  },
  0,
);

// Visual growth — compositor transform sharing the count's timing + ease
tl.fromTo(counter, { scale: START_SCALE }, { scale: 1, duration: COUNT_DUR, ease: COUNT_EASE }, 0);

// Suffix slides in AFTER the count completes
tl.to(
  ".counter-suffix",
  { opacity: 1, y: 0, duration: SUFFIX_DUR, ease: `back.out(${SUFFIX_BOUNCE_FACTOR})` },
  COUNT_DUR,
);

// Label fades in early
tl.from(".counter-label", { opacity: 0, y: 12, duration: LABEL_DUR, ease: "power2.out" }, LABEL_AT);
```

## Variations

- **Direct `innerText` tween (no proxy)** — GSAP can tween `innerText` directly for a number-only counter; keep the proxy form when you need locale formatting or suffix logic. The scale tween stays separate either way:

```js
tl.to(
  counter,
  { innerText: TARGET_VALUE, duration: COUNT_DUR, ease: COUNT_EASE, snap: { innerText: 1 } },
  0,
);
```

- **3D depth entry** — add a `tl.from(".counter", { z: -300, ... }, 0)` push-in; requires `perspective` on `.counter-wrap` and `transform-style: preserve-3d` on the counter.
- **Multi-stat coordinated reveal** — 3 stats counting in parallel share the SAME ease, duration, and start position so they finish together (a chord, not an arpeggio). Each stat usually also needs a paired graphic (bar / ring / stars) — don't stop at the number; see [stat-bars-and-fills.md](stat-bars-and-fills.md).

## Values

| token                 | range                                       | notes                                                                         |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| TARGET_VALUE          | 2–3 digits ideal                            | 4+ digits needs a wider container; must fit at END_SIZE without clipping      |
| START_SIZE / END_SIZE | START ≈ 40–60% of END                       | design inputs used once for START_SCALE; never tween either                   |
| COUNT_DUR             | 1.2–2.5s                                    | below ~0.8s reads as a flash — the eye must read the digits scrolling past    |
| COUNT_EASE            | `power2.out` / `power3.out` ⭐ / `expo.out` | shared by value + scale; more `.out` = more dramatic deceleration at the peak |
| SUFFIX_DUR            | 0.3–0.6s                                    | fires at `COUNT_DUR`, never during the count                                  |
| SUFFIX_BOUNCE_FACTOR  | 1.4–2.0                                     | overshoot is fine on the suffix (it's punctuation, not data)                  |
| LABEL_AT / LABEL_DUR  | AT < COUNT_DUR/2; 0.4–0.7s                  | label arrives before the count peaks                                          |

## Critical Constraints

- **`tabular-nums` mandatory** + fixed-width container as belt-and-suspenders — without them digit-count transitions (9 → 10 → 100) jitter as glyph widths change.
- **Never set `fontSize` in `onUpdate`** — final type size is static CSS; only the transform changes per frame. Keep `onUpdate` O(1): set text only, no style writes or DOM creation.
- **`Math.round`, not `Math.floor`** — halfway through the final integer should already display the final value.
- **Avoid `back.out` / `elastic.out` on the counter itself** — overshoot makes the number look unstable (it's data, not decoration). Grow in place, don't bounce.
- **Label is BIG TEXT, not a page-style caption** — a tiny paragraph under a hero-size number reads as visual noise in video. Display-size, uppercase, tracked: the label is part of the headline.

## See also

`stat-bars-and-fills` (the paired graphic — give it the same ease/duration so number and fill land as one beat) · `svg-path-draw` (icons drawing in around the number) · `center-outward-expansion` (icons bursting outward at the count peak).

## Selected motion rule: gsap-effects

# GSAP Effects for HyperFrames

Drop-in animation patterns. Snippets show mechanism only, inside a standard scene clip (hyperframes-core); assume `tl` exists.

- [Typewriter](#typewriter) — character-by-character reveal with optional cursor / backspace / word rotation
- [Audio Visualizer](#audio-visualizer) — pre-extract audio data, drive Canvas/DOM rendering from the timeline

## Typewriter

Requires GSAP's TextPlugin alongside the core script:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/TextPlugin.min.js"></script>
<script>
  gsap.registerPlugin(TextPlugin);
</script>
```

### Basic

```js
const text = "Hello, world!";
const cps = 10; // chars per second — see timing table
tl.to(
  "#typed-text",
  { text: { value: text }, duration: text.length / cps, ease: "none" },
  startTime,
);
```

### Blinking Cursor

Three rules: **one cursor visible at a time** (hide previous before showing next); **cursor must blink when idle** (after typing, during holds); **no gap between text and cursor** (elements flush in HTML).

```html
<span id="typed-text"></span><span id="cursor" class="cursor-blink">|</span>
```

```css
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
.cursor-blink {
  animation: blink 0.8s step-end infinite;
}
.cursor-solid {
  animation: none;
  opacity: 1;
}
.cursor-hide {
  animation: none;
  opacity: 0;
}
```

Pattern: blink → solid (typing starts) → type → blink (typing done):

```js
tl.call(() => cursor.classList.replace("cursor-blink", "cursor-solid"), [], startTime);
tl.to("#typed-text", { text: { value: text }, duration: dur, ease: "none" }, startTime);
tl.call(() => cursor.classList.replace("cursor-solid", "cursor-blink"), [], startTime + dur);
```

Multi-line handoff: hide previous cursor → blink new → brief pause (~0.5s) → solid when typing. Never go `hidden → solid` (skips the idle blink).

### Backspacing

TextPlugin removes from the front — wrong for backspace. Use manual substring removal:

```js
function backspace(tl, selector, word, startTime, cps) {
  const el = document.querySelector(selector);
  const interval = 1 / cps;
  for (let i = word.length - 1; i >= 0; i--) {
    tl.call(
      () => (el.textContent = word.slice(0, i)),
      [],
      startTime + (word.length - i) * interval,
    );
  }
  return word.length * interval;
}
```

### Spacing With Static Text

A typewriter word next to static text (`<span>Ship something</span><span style="margin-left:14px"><span id="word"></span><span id="cursor">|</span></span>` in a baseline-aligned flex row): use `margin-left` on the wrapper span. Don't use flex `gap` (it spaces the cursor from the text) and don't put a trailing space in the static text (it collapses when the dynamic span is empty).

### Word Rotation

Type → hold → backspace → next word; cursor blinks during every idle moment:

```js
let offset = 0;
words.forEach((word, i) => {
  const typeDur = word.length / 10;
  // cursor: solid while typing, blink during holds (same call pattern as above)
  tl.to("#typed-text", { text: { value: word }, duration: typeDur, ease: "none" }, offset);
  offset += typeDur + 1.5; // hold
  if (i < words.length - 1) offset += backspace(tl, "#typed-text", word, offset, 20) + 0.3;
});
```

### Appending Words

Build a sentence word-by-word into the same element: keep an `accumulated` string, each step tweens `text: { value: accumulated + " " + word }` with `duration: newChars / cps`, then advances the offset.

### Timing Guide

| CPS   | Feel             | Good for                   |
| ----- | ---------------- | -------------------------- |
| 3-5   | Slow, deliberate | Dramatic reveals, suspense |
| 8-12  | Natural typing   | Dialogue, narration        |
| 15-20 | Fast, energetic  | Tech demos, code           |
| 30+   | Near-instant     | Filling long blocks        |

## Audio Visualizer

Pre-extract audio data, drive Canvas / DOM rendering from the timeline. **Do not use the Web Audio API at render time** — there's no playback during seek.

### Extract Audio Data

Bundled extractor (requires `ffmpeg` + Python `numpy`):

```bash
python skills/hyperframes-creative/scripts/extract-audio-data.py audio.mp3 -o audio-data.json
python skills/hyperframes-creative/scripts/extract-audio-data.py video.mp4 --fps 30 --bands 16 -o audio-data.json
```

Output: `{ "fps": 30, "totalFrames": 5415, "frames": [{ "time": 0.0, "rms": 0.42, "bands": [0.8, 0.6, 0.3] }] }` — `rms` (0-1) is overall loudness; `bands[]` (0-1) are frequency magnitudes, index 0 = bass, each band normalized independently.

### Loading (Synchronously)

Inline the JSON for small files (< ~500 KB), or sync XHR for large ones:

```js
const xhr = new XMLHttpRequest();
xhr.open("GET", "audio-data.json", false); // synchronous — deliberate
xhr.send();
const AUDIO_DATA = JSON.parse(xhr.responseText);
```

**Do NOT use async `fetch()`** — HyperFrames reads `window.__timelines` synchronously after page load; building the timeline inside `.then()` means it isn't ready when capture starts.

### Driving the Timeline

Canvas 2D is the workhorse (bars, waveforms, circles, gradients) — one `tl.call` per frame:

```js
const ctx = document.getElementById("viz").getContext("2d");
for (let f = 0; f < AUDIO_DATA.totalFrames; f++) {
  tl.call(
    () => {
      const frame = AUDIO_DATA.frames[f];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw using frame.rms and frame.bands
    },
    [],
    f / AUDIO_DATA.fps,
  );
}
```

WebGL / Three.js: HyperFrames patches `THREE.Clock` for deterministic time — update uniforms from audio data each frame. DOM elements: fine under ~20 elements, slower than Canvas beyond that.

### Smoothing

```js
let prev = null;
const smoothing = 0.25; // 0.1-0.2 snappy, 0.3-0.5 flowing
function smooth(f) {
  const raw = AUDIO_DATA.frames[f];
  if (!prev) prev = { rms: raw.rms, bands: [...raw.bands] };
  else {
    prev = {
      rms: prev.rms * smoothing + raw.rms * (1 - smoothing),
      bands: raw.bands.map((b, i) => prev.bands[i] * smoothing + b * (1 - smoothing)),
    };
  }
  return prev;
}
```

### Design Guide

- **Spatial mapping** — horizontal: bass left, treble right; vertical: bass bottom; circular: bass at 12 o'clock, wrap clockwise (mirror for a full circle).
- **Bass drives big moves** (scale, glow, position); **treble drives detail** (shimmer, flicker, edges); **RMS drives globals** (background brightness, overall energy).
- Pick 2-3 animated properties — more looks noisy. Keep minimums above zero so quiet sections still have life.
- **Band count**: 4 = background glow/pulse, 8 = bar charts, 16 = detailed EQ (default), 32 = dense radial layouts.
- **Layering**: stack canvases with `z-index` — a background layer driven by bass/rms under a foreground layer driven by individual bands gives depth without per-element complexity.
