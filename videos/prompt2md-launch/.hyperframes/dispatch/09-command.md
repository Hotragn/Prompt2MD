You are a HyperFrames frame worker. Before anything else, read these two files in full. Together they are your complete role and your complete spec; follow them exactly:
1. ROLE: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\_role.md
2. PACKET: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\09-command.md

## Dispatch context
- PROJECT_DIR: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- frame_id: 09-command
- Output: compositions/frames/09-command.html (one bare <template>…</template> fragment). This is your only write.
- Canvas: 1080×1920 (portrait).
- Captions: enabled. Keep-out cutoff y ≤ 1594 px: nothing below it (the bottom ~17% is the caption band).
- Confirmed sketch: YES. storyboard.html (project root), cell id="frame-09", user-confirmed on 2026-10-02 ("Looks right, build it"). Read that cell and the CSS rules it uses. Sketch units are cqw, where 1 cqw = 10.8 px on this canvas. Keep its composition, placement, hierarchy and copy. Its crane image (sketch-assets/crane.jpg) is a stand-in for the real frames below. The sketch's `.keepout`, `.cap` and `.meta` elements are sketch-only: never build them (captions are a root track).
- GSAP: load it inside your <template> exactly as the project's index.html and compositions/captions.html do: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. That is the project convention; do not look for another copy.
- Fonts: local files in assets/fonts/. Paste the @font-face <style> from frame.md § "Font loading (auto-generated)" into your template. Never a network font.
- Design truth: frame.md (project root). Video-wide direction: read .hyperframes/video-direction.md in full (the verbatim `## Video direction` block of STORYBOARD.md; it is part of this dispatch).
- Extra references you may open (only these): C:\Users\hotra\.claude\skills\hyperframes-animation\techniques.md (§7 Character-by-Character Typing, §12 Clip-Path Reveal Masks; any section your packet cites) and C:\Users\hotra\.claude\skills\product-launch-video\references\cut-catalog.md.
- Offline build: you fetch and install nothing (no `npx hyperframes add`, no CLI, no downloads). The `registry:` line in your block, when present, says what to hand-build.
- Never edit STORYBOARD.md, other frames, assets, or anything outside your output file.
- Work economically: read what you need once, write the file, re-read it once for the self-check, fix, done.

## Frame notes (09-command)
- **The 3D crane arrives as an approved image sequence.** It is not a video: do not mount any .mp4. The files are assets/crane-seq/f01.png … f60.png (720×720, 24 fps, one seamless 2.5 s swing loop), described in assets/crane-seq/manifest.json (read it).
- Build the crane as a stack of all 60 <img> elements in one box, with `decoding="sync"`, inside a container that carries the entrance (fade + short rise). From the crane's entrance time t0 to the end of the frame (4.6 s), at each t = t0 + j/24, show image (j mod 60) and hide the one before, with `tl.set(..., {opacity: 1|0}, t)`. Exactly one image is visible at a time. Generate these sets in a loop from constants (deterministic).
- Display the crane at ≤ 760 px wide (the frames are 720 px), so it stays crisp. Its paper is baked in and matches #FAF9F6 within ±1 level, so place it directly on the paper ground: no blend mode, border or shadow on the image box.
- This is the last frame of the film. No exit, no fade-out, no end card: on the final frame (4.6 s) the crane is still moving. The URL is "prompt2md.vercel.app", the command is "npx prompt2md-skill", and the line beneath is "Open source, Apache-2.0", all exactly as written.
- When you are done, reply in at most three lines: the file written, and anything in the spec you could not honour.
