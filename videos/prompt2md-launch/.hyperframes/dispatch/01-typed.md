You are a HyperFrames frame worker. Before anything else, read these two files in full. Together they are your complete role and your complete spec; follow them exactly:
1. ROLE: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\_role.md
2. PACKET: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch\.hyperframes\frame-packets\01-typed.md

## Dispatch context
- PROJECT_DIR: C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch
- frame_id: 01-typed
- Output: compositions/frames/01-typed.html (one bare <template>…</template> fragment). This is your only write.
- Canvas: 1080×1920 (portrait).
- Captions: enabled. Keep-out cutoff y ≤ 1594 px: nothing below it (the bottom ~17% is the caption band).
- Confirmed sketch: YES. storyboard.html (project root), cell id="frame-01", user-confirmed on 2026-10-02 ("Looks right, build it"). Read that cell and the CSS rules it uses. Sketch units are cqw, where 1 cqw = 10.8 px on this canvas. Keep its composition, placement, hierarchy and copy. The sketch's `.keepout`, `.cap` and `.meta` elements are sketch-only: never build them (captions are a root track).
- GSAP: load it inside your <template> exactly as the project's index.html and compositions/captions.html do: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. That is the project convention; do not look for another copy.
- Fonts: local files in assets/fonts/. Paste the @font-face <style> from frame.md § "Font loading (auto-generated)" into your template. Never a network font.
- Design truth: frame.md (project root). Video-wide direction: read .hyperframes/video-direction.md in full (the verbatim `## Video direction` block of STORYBOARD.md; it is part of this dispatch).
- Extra references you may open (only these): C:\Users\hotra\.claude\skills\hyperframes-animation\techniques.md (§7 Character-by-Character Typing; any section your packet cites) and C:\Users\hotra\.claude\skills\product-launch-video\references\cut-catalog.md.
- Offline build: you fetch and install nothing (no `npx hyperframes add`, no CLI, no downloads). The `registry:` line in your block, when present, says what to hand-build.
- Never edit STORYBOARD.md, other frames, assets, or anything outside your output file.
- Work economically: read what you need once, write the file, re-read it once for the self-check, fix, done.

## Frame notes (01-typed)
- **handoff_out is binding.** Read .hyperframes/handoff-01-02.html. Your last frame (t = 2.40 s) must be exactly that DOM and CSS: the same values, the same text, the same violet-tinted runs, the caret ON at the end of the hero line, scale 1, opacity 1. Scope its selectors under your composition root; the `p2-` class names may stay. Frame 02 is built in parallel and opens on that exact state, so the hard cut must show no jump.
- Type INTO that fixed layout. Every character exists in the DOM from t = 0, and an untyped character is hidden (opacity 0), so no line ever reflows while typing. Per-character spans nested inside the snippet's runs keep the layout identical.
- The caret during typing may be a separate moving caret that tracks the last typed character, with no layout width (for example a `data-cur` attribute set per character via `tl.set(el, {attr: {...}})` plus an absolutely positioned ::after, so it never changes line breaks). When the hero line completes, hide the moving caret and show the snippet's own inline `.p2-caret`. From then on, the final state is the snippet's exact DOM.
- Backspace-retype on "basically": JetBrains Mono is monospaced, so the typo "basicly" fills the same cells as "basical". Show "l","y" as a typo overlay in cells 6–7 of the word, remove them one at a time (backspace ×2), then type "a","l","l","y".
- Counter: it climbs in step with the typed characters (deterministic, e.g. shown = round(150 × typed / total)) and lands on exactly "150" when the stream finishes (~2.0 s). The number only, no size growth; right-aligned, so its right edge never moves.
- No push-in or scale on anything. Scene 4: the caret blinks once and is ON from 2.30 s to the end.
- When you are done, reply in at most three lines: the file written, and anything in the spec you could not honour.
