// Step 4: write the visual design onto the confirmed layouts in STORYBOARD.md.
// Adds the video-level `## Video direction` block once, and per frame: the
// instantiated blueprint (posture), focal + roles, sfx cues, and a time-coded
// shot sequence whose reveals land on the measured word cues (frame-local s).
import { readFileSync, writeFileSync } from "node:fs";

const path = "STORYBOARD.md";
let md = readFileSync(path, "utf8");

const DIRECTION = `## Video direction

- **Palette system (frame.md):** cream \`#FAF9F6\` is the ground for 02–09; navy \`#0F0E11\` is the ink register (01 full-bleed; the terminal surface in 07 and the command pill in 09); ink \`#17151A\` carries all text on paper. "Coral" is prompt2md violet \`#5B3DF5\`: the ONE voltage moment per frame (the "2md" of the wordmark, the "##" marks, lit anchors, "This folds."). \`savings\` green \`#15803D\` only on measured numbers (04's "85% of original", 05's "33% of input", 07's stamp). Tile \`#F4F2ED\` for inset surfaces. The terminal uses the CLI palette (\`cli-violet\` prompt, \`cli-paper\` text, \`cli-slate\` chrome).
- **Type roles (frame.md):** display = EB Garamond (headlines, hero numbers); body/UI = Inter (the wordmark at 700, chips, labels); mono = JetBrains Mono (the prompt, code, units, kickers). No other faces.
- **Motion grammar + reveal model:** long-tail \`power3\` settles (\`expo.out\` on fast arrivals), never bouncy, no overshoot. Every reveal lands on the word that names it; each frame lists its **word cues** in frame-local seconds, and nothing enters before its cue. Holds are still (subtle jitter at most, \`sine-wave-loop\` low register). No slow drift, pan or push in any frame's back half. The only camera move in the film is the motivated push in 03, landing on the real result.
- **The signature move, the paper fold:** an accordion of 6–8 horizontal strips hinged alternately, the creases catching light (per-strip shading), ~0.6–0.8 s on \`power2.inOut\`. It turns ink into paper (02), folds paragraphs into summaries (05), answers the cut (06), and runs in reverse to unfold the original (07). Same feel every time. Realize it with CSS-3D (\`techniques.md\` CSS-3D / \`css-3d-transforms\`) inside the paused timeline.
- **Rhythm / held frames:** 01 is fast (typing); 02 opens up; 03 is real-time footage; 04 ends on a 0.9 s held read; 05 and 06 are brisk; **07 is the held frame** (its last ~1.1 s, nothing moves, not even the caret); 08 resolves; 09 holds ~1.9 s with only the crane moving.
- **Continuity (one world):** the paper sheet persists. 02's Markdown card returns as the ghost card in 04; 05's document is the page in 06; 06's folded page hands off to 07's terminal output. The crane is born in 02 (the flat badge assembling), anchors 08 (the hub), and returns as the 3D crane in 09.
- **Caption band:** the bottom ~17% (below y ≈ 1594 px of 1920) stays clear of key content in every frame.
- **Negative list:** no glows, flares, sparkles, bokeh, gradients on content or purple-blue "AI" gradients; no bouncy or overshoot eases; no fake product UI (03 is real footage, 07 is real CLI output, the Markdown in 02/04/05 is verbatim pipeline output); no third-party logos; no em dashes on screen; never a savings percentage beside the word "lossless"; percentages always name their unit; no static end card. Neither failure mode: the slideshow (front-load then freeze) or the screensaver (many things floating independently).

`;

const FRAMES = {
  1: {
    heading: "## Frame 1 — Typed (0.0–2.4s, ~2.4s)",
    blueprint: "typewriter-reveal (Adapt)",
    extra: ["- focal: none (typography)", "- roles: none", "- sfx: typing"],
    shot: `**Adapt:** keep the live caret typing a relatable line, with one backspace-and-retype (Hook variant); change the payoff. Instead of collapsing to a brand pop, the typed block holds and becomes the sheet that 02 folds, so the fold is the payoff, handed across the cut.

**Word cues (frame-local s):** You 0.07 · write 0.30 · prompts 0.54 · like 0.78 · this 1.01 (line ends 1.25).

**Shot:**
- Scene 1 (0.00–0.35s): full-bleed navy ground. The kicker "◣ YOUR PROMPT" (top-left, \`cli-slate\`) and the counter label "tokens" with "0" (top-right, mono) are already in place; the caret blinks at the line start (left ~8%, top ~20% of frame). **type-on with caret** (\`discrete-text-sequence\` + \`context-sensitive-cursor\`) starts at 0.05 s.
- Scene 2 (0.35–1.25s): on "You write prompts", the hero line types at a fast human pace in \`cli-paper\` mono, hero size: "ok so what i need is basically a python script that takes a folder of csv files". One **backspace-and-retype** on "basically" (types "basicly", deletes two characters, retypes "ally"). Filler phrases tint faint violet as they land. The counter climbs in step with the characters (\`counting-dynamic-scale\`, the number only, no size growth). Asymmetric editorial layout: hero line ~84% width, upper half.
- Scene 3 (1.25–2.20s): on "like this", the rest of the prompt streams in below at small size, dimming toward the bottom (texture, not for reading); the counter lands on exactly "150" as the stream finishes (~2.0 s).
- Scene 4 (2.20–2.40s): hold, caret blinking. Hard cut.`,
  },
  2: {
    heading: "## Frame 2 — Folded (2.4–5.6s, ~3.2s)",
    blueprint: "logo-assemble-lockup (Adapt)",
    extra: [
      "- focal: assets/logo-a2f26c0d.svg",
      "- roles: logo-a2f26c0d.svg = cutout (the badge, built from its five facets) · logo-lockup.svg = supporting (reference for the wordmark + tagline; build them as live type) · svg-34dff80a.svg = supporting (facet geometry and the site's fold choreography)",
      "- sfx: whoosh-cinematic, chime",
    ],
    shot: `**Adapt:** keep the parts-assembly signature (the badge built from its five facets flying in and locking, the wordmark joining); change the opener and the payoff. It starts on 01's ink frame, the "clear" is the paper fold that turns the ground to paper, and the payoff is the clean Markdown card opening out below the lockup.

**Word cues (frame-local s):** prompt2md 0.00 · folds 1.00 · it 1.19 · into 1.39 · clean 1.79 · Markdown 1.99 (line ends 2.39).

**Shot:**
- Scene 1 (0.00–0.80s): opens on 01's last frame (navy ground, the typed text, counter 150). **The fold:** the text block accordion-folds upward in 3D, creases lit, and the navy ground folds away with it top to bottom, revealing the cream ground. Matched upward velocity across the cut from 01.
- Scene 2 (0.20–1.00s): on "prompt2md", the five crane facets fly in from scattered offsets with rotation and lock into the badge in the upper third, centered: wing, neck, body, tail, then the ink beak, a short stagger (\`depth-scatter-assemble\`, settle on \`power3\`). The violet badge square scales in behind the facets as they lock (\`spring-pop-entrance\`, smooth, no overshoot). The wordmark "prompt2md" (Inter 700, violet "2md") slides out from behind the badge (\`techniques.md\` clip-path reveal) by 1.0 s.
- Scene 3 (1.00–2.40s): on "folds it into clean Markdown", "A Markdown Magic" fades up under the wordmark (EB Garamond italic, wide tracking) at 1.0 s; the Markdown card opens out below as an accordion unfold (Scene 1 in reverse), its lines landing top to bottom: "## Goal" on "clean" (1.79), the Requirements block by "Markdown" (2.0–2.3). Centered lockup, card below at ~84% width.
- Scene 4 (2.40–3.20s): held read.`,
  },
  3: {
    heading: "## Frame 3 — Live (5.6–8.4s, ~2.8s)",
    blueprint: "device-surface-showcase (Adapt)",
    extra: ["- focal: assets/fold-demo-mobile.mp4", "- roles: fold-demo-mobile.mp4 = cutout (the real recording; the hero surface)", "- sfx: click-soft, whoosh-short"],
    shot: `**Adapt:** keep the floating surface held as the hero while its screen advances through a real flow (the floating-window push-in); change the content. The screens ARE the real recording, never rebuilt, and the advance is the real tap and the real result. Clip timing: play the recording from its 0.05 s mark at 1×, so the real tap (clip ~1.2 s) lands at ~1.15 s on "Hit Fold it" and the real result (clip ~2.3 s) at ~2.25 s.

**Word cues (frame-local s):** Paste 0.00 · the 0.28 · mess 0.56 · Hit 1.00 · Fold 1.22 · it 1.44 (line ends 1.65).

**Shot:**
- Scene 1 (0.00–0.55s): on "Paste the mess", the phone-shaped window (rounded ~44 px, hairline border, one soft warm shadow) arrives from the right with a gentle 3D tilt that flattens to a few degrees (\`3d-page-scroll\` tilt framing + \`css-3d-transforms\`, \`power3\`), centered at ~62% frame width. The kicker "◣ LIVE ON PROMPT2MD.VERCEL.APP" sits above it from 0.1 s. The recording shows the prompt in its pane.
- Scene 2 (0.55–1.65s): the window holds. On "Hit Fold it" the real tap happens inside the recording (~1.15 s): "Folding…".
- Scene 3 (1.65–2.80s): the real result lands (~2.25 s). ONE quick eased push-in toward the output pane as it lands (\`multi-phase-camera\` push phase + \`coordinate-target-zoom\`), settling by 2.7 s. Hard cut; the ledger in view carries into 04.`,
  },
  4: {
    heading: "## Frame 4 — Ledger (8.4–12.7s, ~4.3s)",
    blueprint: "dataviz-countup (Adapt)",
    extra: ["- focal: none (typography; the number lockup is the hero)", "- roles: none", "- sfx: ping"],
    shot: `**Adapt:** keep the hero-metric count-up landing dead-center with its unit; change the instrument. No ring or chart: the instrument is the ledger itself (EB Garamond figures + JetBrains Mono units) on paper, one number pair, camera static.

**Word cues (frame-local s):** Structured 0.00 · Markdown 0.56 · an 1.34 · honest 1.54 · token 1.93 · count 2.33 · and 2.82 · no 3.03 · API 3.23 · key 3.85 (line ends 4.05).

**Shot:**
- Scene 1 (0.00–1.30s): on "Structured Markdown", a faint ghost of 02's output card settles in the upper area at ~70% width (\`gsap-effects\` fade + short rise); the kicker "◣ THE LEDGER" at 0.1 s. Nothing else yet.
- Scene 2 (1.30–2.45s): on "an honest token count", "150" with its mono unit "tokens" lands center at hero size at 1.4 s (\`spring-pop-entrance\`, smooth); the arrow draws (\`svg-path-draw\`) 1.7–1.9 s; "127" counts down from 150 (\`counting-dynamic-scale\`) 1.9–2.45 s, landing on "count".
- Scene 3 (2.45–3.40s): "85% of original" pops in green under the pair at 2.5 s (\`spring-pop-entrance\`, no overshoot); on "no API key" the mono pill "no API key" types on (\`discrete-text-sequence\`) 3.0–3.4 s.
- Scene 4 (3.40–4.30s): held read; everything still.`,
  },
  5: {
    heading: "## Frame 5 — Fit (12.7–16.4s, ~3.7s)",
    blueprint: "grid-card-assemble (Adapt)",
    extra: ["- focal: none (the document is typeset live from the real excerpt)", "- roles: none", "- sfx: whoosh-short, ping"],
    shot: `**Adapt:** keep the accumulating vertical list (the Benefits vertical-list BUILD mode: lines land and stay lit); change the entrance. Each list line is a full paragraph folding down in place into its one-line summary and anchor (the paper fold), not a slide-in; one number lockup above.

**Word cues (frame-local s):** Too 0.00 · long 0.29 · Fold 0.82 · fourteen 1.02 · hundred 1.40 · tokens 1.79 · to 2.18 · under 2.37 · five 2.76 · hundred 2.96 (line ends 3.34).

**Text, verbatim from the real run:** heading "# Incident 4417, full timeline". Paragraph N: "Update N: engineers investigated subsystem N and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail." (that sentence four times) "Key finding f-N." Summary N: "Update N: engineers investigated subsystem N and recorded observations. […]" with its anchor "<!-- p2md:src=c6199e0698ecc214#START-END -->"; real offsets 0:32-436 · 1:438-842 · 2:844-1248 · 3:1250-1654 · 4:1656-2060 · 5:2062-2466 · 6:2468-2872 · 7:2874-3278 · 8:3280-3684 · 9:3686-4090 · 10:4092-4499 · 11:4501-4908 · 12:4910-5317 · 13:5319-5726. Closing line, kept verbatim by the compressor: "Resolution: root cause was a stale feature flag; fixed at 14:02 UTC."

**Shot:**
- Scene 1 (0.00–0.80s): on "Too long?", the tall paper document rises in from below, taller than the frame, its paragraphs running off the bottom (\`gsap-effects\` rise, \`power3\`); "1,449" + "tokens" appears above it at 0.3 s.
- Scene 2 (0.80–2.40s): on "Fold fourteen hundred tokens", the paragraphs fold down one by one, top to bottom, ~0.12 s apart, each collapsing (the paper fold) into its real summary line with the faint mono anchor beneath (\`center-outward-expansion\` short-path form for the line arrivals); the stack tightens upward until it fits the frame.
- Scene 3 (2.40–3.10s): on "under five hundred", the figure counts down 1,449 → 475 (\`counting-dynamic-scale\`), landing on "hundred" (2.96); "33% of input" pops in green at 3.0 s.
- Scene 4 (3.10–3.70s): held read.`,
  },
  6: {
    heading: "## Frame 6 — Cuts vs folds (16.4–19.0s, ~2.6s)",
    blueprint: "comparison-split (Adapt)",
    extra: ["- focal: none (two typeset pages)", "- roles: none", "- sfx: click, whoosh-short"],
    shot: `**Adapt:** keep the mirrored book-open split-tilt entry of two equal-weight panels and one inner-edge badge each (the signature); change the axis to stacked top/bottom for the vertical canvas, and the panels are pages, not feature cards.

**Word cues (frame-local s):** Other 0.00 · tools 0.41 · cut 0.62 · and 0.82 · hope 1.03 · This 1.49 · folds 1.82 (line ends 2.15).

**Shot:**
- Scene 1 (0.00–0.45s): the two halves arrive with mirrored 3D tilts, top from above and bottom from below, opening like a book (\`split-tilt-cards\`); "Everything else cuts." (EB Garamond display, ink) slides down into the top half (\`gsap-effects\`, \`power3\`).
- Scene 2 (0.45–1.40s): on "cut" (0.62), a hairline cut line snaps across the top page in one fast stroke (\`svg-path-draw\`, ~0.12 s); the part below falls away under gravity and greys out (\`gsap-effects\` translate + rotate + desaturate, \`power2.in\`) by "hope"; the top badge "✕ the detail is gone" lands at the top half's inner (bottom) edge at 1.1 s (\`spring-pop-entrance\`).
- Scene 3 (1.40–2.25s): on "This folds", "This folds." (EB Garamond, violet) lands in the bottom half; the same page folds into its summary lines with the anchors lit violet (a quick paper fold); the bottom badge "✓ anchored to the source" lands at the bottom half's inner (top) edge at 2.0 s.
- Scene 4 (2.25–2.60s): held read.`,
  },
  7: {
    heading: "## Frame 7 — Unfold (19.0–23.4s, ~4.4s)",
    blueprint: "prompt-type-submit-generate (Adapt)",
    extra: ["- focal: none (the terminal is the real CLI output, typeset)", "- roles: none", "- sfx: typing, key-press, chime"],
    shot: `**Adapt:** keep the command typed into a real product input (the CLI) and the machine answering progressively (sub-shape B, terminal skin); change the payoff. The answer is the byte-exact original span, highlighted and stamped, then the held frame.

**Word cues (frame-local s):** Unfold 0.00 · any 0.35 · summary 0.70 · The 1.61 · exact 1.80 · original 2.17 · comes 2.92 · back 3.11 (line ends 3.29).

**Shot:**
- Scene 1 (0.00–0.90s): on "Unfold any summary", the headline "Unfold any summary." reveals word by word in the top third (EB Garamond, \`gsap-effects\` per-word stagger); the terminal card springs in at center-low (\`spring-pop-entrance\`, smooth) with its title bar "COMMAND LINE" and the prompt "$ " with a blinking caret.
- Scene 2 (0.30–1.50s): the command \`prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"\` types at a quick human pace (\`discrete-text-sequence\` + \`context-sensitive-cursor\`); Enter at ~1.45 s.
- Scene 3 (1.55–2.95s): on "The exact original", the output opens out line by line as an accordion unfold, verbatim; "Key finding f-7." lights (green tint + hairline ring, \`asr-keyword-glow\` static variant) at 2.6 s.
- Scene 4 (2.95–3.30s): on "comes back", the stamp "✓ byte-exact" lands in the title bar at 3.1 s (\`spring-pop-entrance\`).
- Scene 5 (3.30–4.40s): **the held frame**: nothing moves, not even the caret.`,
  },
  8: {
    heading: "## Frame 8 — Everywhere (23.4–27.4s, ~4.0s)",
    blueprint: "constellation-hub (Adapt)",
    extra: ["- focal: assets/brand-icon.svg", "- roles: brand-icon.svg = cutout (the hub)", "- sfx: pop, click-soft"],
    shot: `**Adapt:** keep the Social_Proof orbit finisher (the brand mark as the hub, satellites springing onto a ring around it) with text chips instead of logos; drop the continuous zoom-out. After the last chip lands the ring may turn a few degrees as ONE unit (finite), never independent floating.

**Word cues (frame-local s):** It 0.00 · plugs 0.22 · into 0.45 · Claude 0.90 · Code 1.12 · Cursor 1.61 · and 2.38 · any 2.56 · MCP 2.92 · client 3.46 (line ends 3.82).

**Shot:**
- Scene 1 (0.00–0.90s): on "It plugs into", the crane badge snaps in at center with a quick 3D rotate that decelerates and settles (\`orbit-3d-entry\`, entry form); a hairline dashed orbit ring draws around it (\`svg-path-draw\`); the kicker "◣ ONE COMMAND WIRES EVERY TOOL" at 0.1 s.
- Scene 2 (0.90–3.50s): chips spring onto the ring as they are named (\`spring-pop-entrance\`, smooth): "Claude Code" at 0.95 s, "Cursor" at 1.65 s, then "Claude Desktop", "Windsurf", "Gemini CLI", "Codex CLI" on a quick 0.12 s cascade from 2.3 s, and "any MCP client" at 2.95 s on "MCP".
- Scene 3 (3.50–4.00s): the completed ring holds.`,
  },
  9: {
    heading: "## Frame 9 — Command (27.4–32.0s, ~4.6s)",
    blueprint: "logo-assemble-lockup (Adapt)",
    extra: [
      "- focal: assets/crane-turntable.mp4",
      "- roles: crane-turntable.mp4 = cutout (the 3D crane, looping in the upper half; its frames are baked on paper #FAF9F6, so match that ground exactly and use no blend mode) · logo-lockup.svg = supporting (wordmark + tagline reference; build them as live type)",
      "- sfx: whoosh-cinematic, chime",
    ],
    shot: `**Adapt:** keep the settled-reveal lockup (it completes in place; an accent underline sweeps) plus the install-command end card (a terminal pill types the command and holds); change the hero. The moving 3D crane above the lockup is the footage that is still moving at the close.

**Word cues (frame-local s):** Open 0.00 · source 0.59 · Try 1.23 · it 1.41 · at 1.60 · prompt2md.vercel.app 1.79 (line ends 3.66).

**Shot:**
- Scene 1 (0.00–0.70s): the 3D crane rises into the upper half (fade + short rise, \`power3\`) and swings for the rest of the film (its 2.5 s loop, frame-locked to the timeline). On "Open source" the wordmark "prompt2md" and the tagline "A Markdown Magic" land below the crane (\`spring-pop-entrance\`, smooth); "Open source, Apache-2.0" fades in at the bottom of the stack at 0.6 s.
- Scene 2 (1.20–1.80s): on "Try it at", the small navy terminal pill springs in and \`npx prompt2md-skill\` types (\`discrete-text-sequence\`) 1.25–1.75 s.
- Scene 3 (1.80–2.70s): on "prompt2md.vercel.app", the URL ink pill reveals left to right (\`techniques.md\` clip-path reveal) 1.8–2.4 s; a hairline violet underline sweeps under the wordmark (\`css-marker-patterns\`) at 2.4 s.
- Scene 4 (2.70–4.60s): hold. Only the crane keeps moving (and the command caret blinking); the film ends on moving footage.`,
  },
};

// Video direction goes once, above the first frame.
if (!md.includes("## Video direction")) md = md.replace(/\n## Frame 1 — /, `\n${DIRECTION}## Frame 1 — `);
md = md.replace("duration: 31s", "duration: 32s").replace("1080×1920, about 31 s,", "1080×1920, about 32 s,");

const parts = md.split(/(?=^## Frame \d+ — )/m);
const out = parts.map((part) => {
  const m = /^## Frame (\d+) — /.exec(part);
  if (!m) return part;
  const f = FRAMES[Number(m[1])];
  let p = part.replace(/^## Frame \d+ — .*$/m, f.heading);
  p = p.replace(/^- blueprint: .*$/m, `- blueprint: ${f.blueprint}`);
  if (!p.includes("- focal:")) p = p.replace(/^(- asset_candidates:.*)$/m, `$1\n${f.extra.join("\n")}`);
  if (!p.includes("**Shot:**")) p = p.replace(/\s*$/, `\n\n${f.shot}\n\n`);
  return p;
});
writeFileSync(path, out.join("").replace(/\n{3,}/g, "\n\n"));
console.log("visual design written for", Object.keys(FRAMES).length, "frames");
