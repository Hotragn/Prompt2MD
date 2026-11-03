# Writes one dispatch file per frame worker (.hyperframes/dispatch/<frame_id>.md), so a
# re-dispatch sends the identical context: role + packet paths, the shared dispatch
# context, and the frame's own notes.
import io, os

P = r"C:\Users\hotra\OneDrive\Documents\Claude Code\Prompt2MD\videos\prompt2md-launch"
TECH = r"C:\Users\hotra\.claude\skills\hyperframes-animation\techniques.md"
CUT = r"C:\Users\hotra\.claude\skills\product-launch-video\references\cut-catalog.md"


def common(fid, nn, sketch_extra, tech_sections):
    return f"""## Dispatch context
- PROJECT_DIR: {P}
- frame_id: {fid}
- Output: compositions/frames/{fid}.html (one bare <template>…</template> fragment). This is your only write.
- Canvas: 1080×1920 (portrait).
- Captions: enabled. Keep-out cutoff y ≤ 1594 px: nothing below it (the bottom ~17% is the caption band).
- Confirmed sketch: YES. storyboard.html (project root), cell id="frame-{nn}", user-confirmed on 2026-10-02 ("Looks right, build it"). Read that cell and the CSS rules it uses. Sketch units are cqw, where 1 cqw = 10.8 px on this canvas. Keep its composition, placement, hierarchy and copy.{sketch_extra} The sketch's `.keepout`, `.cap` and `.meta` elements are sketch-only: never build them (captions are a root track).
- GSAP: load it inside your <template> exactly as the project's index.html and compositions/captions.html do: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. That is the project convention; do not look for another copy.
- Fonts: local files in assets/fonts/. Paste the @font-face <style> from frame.md § "Font loading (auto-generated)" into your template. Never a network font.
- Design truth: frame.md (project root). Video-wide direction: read .hyperframes/video-direction.md in full (the verbatim `## Video direction` block of STORYBOARD.md; it is part of this dispatch).
- Extra references you may open (only these): {TECH} ({tech_sections}any section your packet cites) and {CUT}.
- Offline build: you fetch and install nothing (no `npx hyperframes add`, no CLI, no downloads). The `registry:` line in your block, when present, says what to hand-build.
- Never edit STORYBOARD.md, other frames, assets, or anything outside your output file.
- Work economically: read what you need once, write the file, re-read it once for the self-check, fix, done.
"""


NOTES = {
    "01-typed": ("01", "", "§7 Character-by-Character Typing; ", """- **handoff_out is binding.** Read .hyperframes/handoff-01-02.html. Your last frame (t = 2.40 s) must be exactly that DOM and CSS: the same values, the same text, the same violet-tinted runs, the caret ON at the end of the hero line, scale 1, opacity 1. Scope its selectors under your composition root; the `p2-` class names may stay. Frame 02 is built in parallel and opens on that exact state, so the hard cut must show no jump.
- Type INTO that fixed layout. Every character exists in the DOM from t = 0, and an untyped character is hidden (opacity 0), so no line ever reflows while typing. Per-character spans nested inside the snippet's runs keep the layout identical.
- The caret during typing may be a separate moving caret that tracks the last typed character, with no layout width (for example a `data-cur` attribute set per character via `tl.set(el, {attr: {...}})` plus an absolutely positioned ::after, so it never changes line breaks). When the hero line completes, hide the moving caret and show the snippet's own inline `.p2-caret`. From then on, the final state is the snippet's exact DOM.
- Backspace-retype on "basically": JetBrains Mono is monospaced, so the typo "basicly" fills the same cells as "basical". Show "l","y" as a typo overlay in cells 6–7 of the word, remove them one at a time (backspace ×2), then type "a","l","l","y".
- Counter: it climbs in step with the typed characters (deterministic, e.g. shown = round(150 × typed / total)) and lands on exactly "150" when the stream finishes (~2.0 s). The number only, no size growth; right-aligned, so its right edge never moves.
- No push-in or scale on anything. Scene 4: the caret blinks once and is ON from 2.30 s to the end."""),
    "02-folded": ("02", " The one exception: the card now carries the COMPLETE real output (your packet lists every line), so set the mono at ~30 px and keep the card bottom ≤ 1560 px.", "§3 CSS 3D Transforms, §12 Clip-Path Reveal Masks; ", """- **handoff_in is binding.** Read .hyperframes/handoff-01-02.html. At t = 0 your frame must be exactly that DOM and CSS: navy sheet, kicker, counter "150", the typed prompt with its violet-tinted runs, the caret ON, scale 1, opacity 1, everything static. Scope its selectors under your composition root; the `p2-` class names may stay. Frame 01 is built in parallel and ends on that exact state, so the hard cut must show no jump.
- **The fold is the shared signature move.** Read .hyperframes/fold-recipe.md and use it exactly: the one-proxy driver, 0.70 s on power2.inOut, alternate hinges, the crease shading model. Here the sheet is the whole 1080×1920 navy sheet from the handoff (H = 1920, so N = 8 strips of 240 px). Each strip holds a copy of the handoff DOM shifted up by k × 240 px, so at θ = 0 the strips tile it exactly and t = 0 matches the handoff. It folds UPWARD from rest and reveals the cream ground beneath. Use the dark-sheet shading values.
- The crane badge: build it from the five facets of assets/logo-a2f26c0d.svg (read the SVG; the sketch cell inlines the same geometry). The facets fly in and lock: wing, neck, body, tail, then the ink beak. Never rotate the finished badge."""),
    "03-live": ("03", " Its phone image (sketch-assets/demo-result.jpg) is a stand-in for the real frames below.", "§3 CSS 3D Transforms; ", """- **The real recording arrives as an approved image sequence.** It is not a video: do not mount any .mp4. The files are assets/fold-demo-seq/s01.png … s09.png (1080×1920 each), timed by assets/fold-demo-seq/manifest.json (read it). Open s01.png and s09.png to see the screens: the pasted prompt, then the live result with the ledger near the bottom.
- The phone window's screen is a stack of all 9 <img> elements, all in the DOM from the start, sharing one box at the images' 9:16 aspect, with `decoding="sync"`. Only s01 is visible at t = 0. At each manifest `local_s`, do `tl.set(next, {opacity: 1}, t)` and `tl.set(prev, {opacity: 0}, t)`. Exactly one image is visible at any time, and s09 holds to the end. Nothing is drawn over the screen: no rebuilt UI, no fake cursor (the tap is real, inside the recording).
- The push-in (Scene 3) moves the window and its screen as one unit: one eased camera move, landing on the output pane as the result lands (~2.28 s) and settled by ~2.7 s. The result's ledger row (BEFORE 150 → AFTER 127 · OF ORIGINAL 85%) must stay fully in frame, above y = 1594. Measure its position in s09.png."""),
    "04-ledger": ("04", "", "", """- The count is hand-built and seek-safe: tween one proxy (`{v: 150}` → `{v: 127}`) on the paused timeline, and in `onUpdate` write `Math.round(v)` into the figure's text. Set `font-variant-numeric: lining-nums tabular-nums` on the EB Garamond figures, so the digits neither jump nor shift while counting.
- The faint ghost card behind is 02's output card with the same complete Markdown (your packet has it). Keep it faint enough that the numbers own the frame.
- Every percentage names its unit ("85% of original"). Never put the word "lossless" near a percentage."""),
    "05-fit": ("05", "", "§3 CSS 3D Transforms; ", """- **The fold is the shared signature move.** Read .hyperframes/fold-recipe.md and use it exactly wherever this frame folds paragraphs into summaries: the one-proxy driver, 0.70 s on power2.inOut, alternate hinges, the paper shading values. Three other frames use the same recipe, so it must feel identical.
- The count is hand-built and seek-safe: tween one proxy (`{v: 1449}` → `{v: 475}`) on the paused timeline, and in `onUpdate` write the rounded value with a thousands comma ("1,449"). Use `font-variant-numeric: lining-nums tabular-nums` on the figures.
- All document text is verbatim from your packet (the real compress output and its anchor offsets). Never invent lines or numbers. Every percentage names its unit."""),
    "06-cuts-vs-folds": ("06", "", "§1 SVG Path Drawing, §3 CSS 3D Transforms; ", """- **The fold is the shared signature move.** Read .hyperframes/fold-recipe.md and use it exactly for the half that folds: the one-proxy driver, 0.70 s on power2.inOut, alternate hinges, the paper shading values. Three other frames use the same recipe, so it must feel identical. If your beat needs a shorter window, keep the mechanism and the ease, and say so in your reply.
- The contrast is generic ("other tools cut"). Never name or depict a competitor, a product or a logo."""),
    "07-unfold": ("07", "", "§3 CSS 3D Transforms, §4 Per-Word Kinetic Typography, §7 Character-by-Character Typing; ", """- **The unfold is the shared signature move, run in reverse.** Read .hyperframes/fold-recipe.md and use it exactly for the output opening out ("accordion unfold"): the same one-proxy driver with `a` from 1 to 0, 0.70 s on power2.inOut, alternate hinges, the dark-sheet shading values (the output sits on the navy terminal). Three other frames use the same recipe, so it must feel identical.
- The command and its stdout are verbatim from your packet, character for character, including the anchor `p2md:src=c6199e0698ecc214#2874-3278`. Set `font-variant-ligatures: none` on all mono text, so no ligature changes a character.
- This is the film's held frame. From 3.30 s to the end, nothing moves: no caret blink, no drift, no shimmer."""),
    "08-everywhere": ("08", "", "§1 SVG Path Drawing, §3 CSS 3D Transforms; ", """- The hub is assets/brand-icon.svg (read it), shown as-is: never recoloured and never rotated once it settles.
- Chips are text only, in the site's tool-list pill style. No third-party logos or brand colours.
- The ring's motion is finite. After the last chip lands it may turn a few degrees as ONE unit, then still. No independent floating."""),
    "09-command": ("09", " Its crane image (sketch-assets/crane.jpg) is a stand-in for the real frames below.", "§7 Character-by-Character Typing, §12 Clip-Path Reveal Masks; ", """- **The 3D crane arrives as an approved image sequence.** It is not a video: do not mount any .mp4. The files are assets/crane-seq/f01.png … f60.png (720×720, 24 fps, one seamless 2.5 s swing loop), described in assets/crane-seq/manifest.json (read it).
- Build the crane as a stack of all 60 <img> elements in one box, with `decoding="sync"`, inside a container that carries the entrance (fade + short rise). From the crane's entrance time t0 to the end of the frame (4.6 s), at each t = t0 + j/24, show image (j mod 60) and hide the one before, with `tl.set(..., {opacity: 1|0}, t)`. Exactly one image is visible at a time. Generate these sets in a loop from constants (deterministic).
- Display the crane at ≤ 760 px wide (the frames are 720 px), so it stays crisp. Its paper is baked in and matches #FAF9F6 within ±1 level, so place it directly on the paper ground: no blend mode, border or shadow on the image box.
- This is the last frame of the film. No exit, no fade-out, no end card: on the final frame (4.6 s) the crane is still moving. The URL is "prompt2md.vercel.app", the command is "npx prompt2md-skill", and the line beneath is "Open source, Apache-2.0", all exactly as written."""),
}

os.makedirs(os.path.join(P, ".hyperframes", "dispatch"), exist_ok=True)
for fid, (nn, extra, tech, notes) in NOTES.items():
    body = (
        "You are a HyperFrames frame worker. Before anything else, read these two files in full. "
        "Together they are your complete role and your complete spec; follow them exactly:\n"
        f"1. ROLE: {P}\\.hyperframes\\frame-packets\\_role.md\n"
        f"2. PACKET: {P}\\.hyperframes\\frame-packets\\{fid}.md\n\n"
        + common(fid, nn, extra, tech)
        + f"\n## Frame notes ({fid})\n" + notes
        + "\n- When you are done, reply in at most three lines: the file written, and anything in the spec you could not honour.\n"
    )
    with io.open(os.path.join(P, ".hyperframes", "dispatch", f"{fid}.md"), "w", encoding="utf-8") as f:
        f.write(body)
print("written", len(NOTES))
