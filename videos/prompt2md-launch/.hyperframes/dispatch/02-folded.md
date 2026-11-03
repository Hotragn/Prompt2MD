You are a HyperFrames frame worker. Before anything else, read these two files in full. Together they are your complete role and your complete spec; follow them exactly:
1. ROLE: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\_role.md
2. PACKET: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\02-folded.md

## Dispatch context
- PROJECT_DIR: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- frame_id: 02-folded
- Output: compositions/frames/02-folded.html (one bare <template>…</template> fragment). This is your only write.
- Canvas: 1080×1920 (portrait).
- Captions: enabled. Keep-out cutoff y ≤ 1594 px: nothing below it (the bottom ~17% is the caption band).
- Confirmed sketch: YES. storyboard.html (project root), cell id="frame-02", user-confirmed on 2026-10-02 ("Looks right, build it"). Read that cell and the CSS rules it uses. Sketch units are cqw, where 1 cqw = 10.8 px on this canvas. Keep its composition, placement, hierarchy and copy. The one exception: the card now carries the COMPLETE real output (your packet lists every line), so set the mono at ~30 px and keep the card bottom ≤ 1560 px. The sketch's `.keepout`, `.cap` and `.meta` elements are sketch-only: never build them (captions are a root track).
- GSAP: load it inside your <template> exactly as the project's index.html and compositions/captions.html do: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. That is the project convention; do not look for another copy.
- Fonts: local files in assets/fonts/. Paste the @font-face <style> from frame.md § "Font loading (auto-generated)" into your template. Never a network font.
- Design truth: frame.md (project root). Video-wide direction: read .hyperframes/video-direction.md in full (the verbatim `## Video direction` block of STORYBOARD.md; it is part of this dispatch).
- Extra references you may open (only these): C:\Users\hotra\.claude\skills\hyperframes-animation\techniques.md (§3 CSS 3D Transforms, §12 Clip-Path Reveal Masks; any section your packet cites) and C:\Users\hotra\.claude\skills\product-launch-video\references\cut-catalog.md.
- Offline build: you fetch and install nothing (no `npx hyperframes add`, no CLI, no downloads). The `registry:` line in your block, when present, says what to hand-build.
- Never edit STORYBOARD.md, other frames, assets, or anything outside your output file.
- Work economically: read what you need once, write the file, re-read it once for the self-check, fix, done.

## Frame notes (02-folded)
- **handoff_in is binding.** Read .hyperframes/handoff-01-02.html. At t = 0 your frame must be exactly that DOM and CSS: navy sheet, kicker, counter "150", the typed prompt with its violet-tinted runs, the caret ON, scale 1, opacity 1, everything static. Scope its selectors under your composition root; the `p2-` class names may stay. Frame 01 is built in parallel and ends on that exact state, so the hard cut must show no jump.
- **The fold is the shared signature move.** Read .hyperframes/fold-recipe.md and use it exactly: the one-proxy driver, 0.70 s on power2.inOut, alternate hinges, the crease shading model. Here the sheet is the whole 1080×1920 navy sheet from the handoff (H = 1920, so N = 8 strips of 240 px). Each strip holds a copy of the handoff DOM shifted up by k × 240 px, so at θ = 0 the strips tile it exactly and t = 0 matches the handoff. It folds UPWARD from rest and reveals the cream ground beneath. Use the dark-sheet shading values.
- The crane badge: build it from the five facets of assets/logo-a2f26c0d.svg (read the SVG; the sketch cell inlines the same geometry). The facets fly in and lock: wing, neck, body, tail, then the ink beak. Never rotate the finished badge.
- When you are done, reply in at most three lines: the file written, and anything in the spec you could not honour.
