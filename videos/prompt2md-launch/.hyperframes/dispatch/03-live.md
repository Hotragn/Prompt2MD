You are a HyperFrames frame worker. Before anything else, read these two files in full. Together they are your complete role and your complete spec; follow them exactly:
1. ROLE: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\_role.md
2. PACKET: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\03-live.md

## Dispatch context
- PROJECT_DIR: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- frame_id: 03-live
- Output: compositions/frames/03-live.html (one bare <template>…</template> fragment). This is your only write.
- Canvas: 1080×1920 (portrait).
- Captions: enabled. Keep-out cutoff y ≤ 1594 px: nothing below it (the bottom ~17% is the caption band).
- Confirmed sketch: YES. storyboard.html (project root), cell id="frame-03", user-confirmed on 2026-10-02 ("Looks right, build it"). Read that cell and the CSS rules it uses. Sketch units are cqw, where 1 cqw = 10.8 px on this canvas. Keep its composition, placement, hierarchy and copy. Its phone image (sketch-assets/demo-result.jpg) is a stand-in for the real frames below. The sketch's `.keepout`, `.cap` and `.meta` elements are sketch-only: never build them (captions are a root track).
- GSAP: load it inside your <template> exactly as the project's index.html and compositions/captions.html do: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. That is the project convention; do not look for another copy.
- Fonts: local files in assets/fonts/. Paste the @font-face <style> from frame.md § "Font loading (auto-generated)" into your template. Never a network font.
- Design truth: frame.md (project root). Video-wide direction: read .hyperframes/video-direction.md in full (the verbatim `## Video direction` block of STORYBOARD.md; it is part of this dispatch).
- Extra references you may open (only these): C:\Users\hotra\.claude\skills\hyperframes-animation\techniques.md (§3 CSS 3D Transforms; any section your packet cites) and C:\Users\hotra\.claude\skills\product-launch-video\references\cut-catalog.md.
- Offline build: you fetch and install nothing (no `npx hyperframes add`, no CLI, no downloads). The `registry:` line in your block, when present, says what to hand-build.
- Never edit STORYBOARD.md, other frames, assets, or anything outside your output file.
- Work economically: read what you need once, write the file, re-read it once for the self-check, fix, done.

## Frame notes (03-live)
- **The real recording arrives as an approved image sequence.** It is not a video: do not mount any .mp4. The files are assets/fold-demo-seq/s01.png … s09.png (1080×1920 each), timed by assets/fold-demo-seq/manifest.json (read it). Open s01.png and s09.png to see the screens: the pasted prompt, then the live result with the ledger near the bottom.
- The phone window's screen is a stack of all 9 <img> elements, all in the DOM from the start, sharing one box at the images' 9:16 aspect, with `decoding="sync"`. Only s01 is visible at t = 0. At each manifest `local_s`, do `tl.set(next, {opacity: 1}, t)` and `tl.set(prev, {opacity: 0}, t)`. Exactly one image is visible at any time, and s09 holds to the end. Nothing is drawn over the screen: no rebuilt UI, no fake cursor (the tap is real, inside the recording).
- The push-in (Scene 3) moves the window and its screen as one unit: one eased camera move, landing on the output pane as the result lands (~2.28 s) and settled by ~2.7 s. The result's ledger row (BEFORE 150 → AFTER 127 · OF ORIGINAL 85%) must stay fully in frame, above y = 1594. Measure its position in s09.png.
- When you are done, reply in at most three lines: the file written, and anything in the spec you could not honour.
