You are a HyperFrames frame worker. Before anything else, read these two files in full. Together they are your complete role and your complete spec; follow them exactly:
1. ROLE: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\_role.md
2. PACKET: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\07-unfold.md

## Dispatch context
- PROJECT_DIR: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- frame_id: 07-unfold
- Output: compositions/frames/07-unfold.html (one bare <template>…</template> fragment). This is your only write.
- Canvas: 1080×1920 (portrait).
- Captions: enabled. Keep-out cutoff y ≤ 1594 px: nothing below it (the bottom ~17% is the caption band).
- Confirmed sketch: YES. storyboard.html (project root), cell id="frame-07", user-confirmed on 2026-10-02 ("Looks right, build it"). Read that cell and the CSS rules it uses. Sketch units are cqw, where 1 cqw = 10.8 px on this canvas. Keep its composition, placement, hierarchy and copy. The sketch's `.keepout`, `.cap` and `.meta` elements are sketch-only: never build them (captions are a root track).
- GSAP: load it inside your <template> exactly as the project's index.html and compositions/captions.html do: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. That is the project convention; do not look for another copy.
- Fonts: local files in assets/fonts/. Paste the @font-face <style> from frame.md § "Font loading (auto-generated)" into your template. Never a network font.
- Design truth: frame.md (project root). Video-wide direction: read .hyperframes/video-direction.md in full (the verbatim `## Video direction` block of STORYBOARD.md; it is part of this dispatch).
- Extra references you may open (only these): C:\Users\hotra\.claude\skills\hyperframes-animation\techniques.md (§3 CSS 3D Transforms, §4 Per-Word Kinetic Typography, §7 Character-by-Character Typing; any section your packet cites) and C:\Users\hotra\.claude\skills\product-launch-video\references\cut-catalog.md.
- Offline build: you fetch and install nothing (no `npx hyperframes add`, no CLI, no downloads). The `registry:` line in your block, when present, says what to hand-build.
- Never edit STORYBOARD.md, other frames, assets, or anything outside your output file.
- Work economically: read what you need once, write the file, re-read it once for the self-check, fix, done.

## Frame notes (07-unfold)
- **The unfold is the shared signature move, run in reverse.** Read .hyperframes/fold-recipe.md and use it exactly for the output opening out ("accordion unfold"): the same one-proxy driver with `a` from 1 to 0, 0.70 s on power2.inOut, alternate hinges, the dark-sheet shading values (the output sits on the navy terminal). Three other frames use the same recipe, so it must feel identical.
- The command and its stdout are verbatim from your packet, character for character, including the anchor `p2md:src=c6199e0698ecc214#2874-3278`. Set `font-variant-ligatures: none` on all mono text, so no ligature changes a character.
- This is the film's held frame. From 3.30 s to the end, nothing moves: no caret blink, no drift, no shimmer.
- When you are done, reply in at most three lines: the file written, and anything in the spec you could not honour.
