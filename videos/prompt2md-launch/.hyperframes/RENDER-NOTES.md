# Render notes (2026-10-04)

## The 8 px black strip, and the workaround

On this machine (Windows 11 ARM64, Snapdragon X, hyperframes 0.8.101) a render of the
1080-wide composition comes out with columns 1072–1079 pure black in every frame. Hardware
and software GPU capture both do it; `hyperframes snapshot` does not. The renderer clips its
screenshot to the browser viewport (`captureBeyondViewport` defaults on only for macOS, or
for native video surfaces), and at 1080 wide that viewport comes out 8 px narrow.

What produced the clean `renders/video.mp4`:

1. Copy `index.html` aside, then widen the render canvas to 1088 in `index.html` only:
   `html, body` width, `#root` width, the root's `data-width`, and the viewport meta. The
   frames stay 1080 wide and left-aligned; the extra column is never shown.
2. `npx --yes hyperframes@0.8.101 render --skill=product-launch-video --quality high --output renders/video-1088.mp4`
3. Restore the 1080 `index.html`.
4. Crop to the composition and normalize loudness to -14 LUFS / -1.5 dBTP (two-pass
   loudnorm, measured values from the first pass):
   `ffmpeg -i video-1088.mp4 -vf crop=1080:1920:0:0 -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -af loudnorm=...:linear=true -c:a aac -b:a 192k -movflags +faststart video.mp4`

The cropped frames match the snapshots (mean absolute difference ~2 levels, encoding only).
The uncropped master is kept at `.hyperframes/render-master-1088.mp4`.

## Derived deliverables (all from `renders/video.mp4`)

- `poster.jpg`: the frame at 5.3 s (lockup + the complete real Markdown output).
- `prompt2md-loop-16x9.mp4` and `prompt2md-launch.gif`: film 0.5–8.4 s in a 342×608 window
  (`.hyperframes/stills/gif-frame.png`, drawn from `stills/gif-frame.html`) on a 1200×675
  paper canvas, 0.2 s fade in and 0.25 s fade out through paper so the loop point is clean.
  GIF: 15 fps, palettegen stats_mode=full, paletteuse sierra2_4a, diff_mode=rectangle.
- `hackernoon-featured-1400x600.png`: `stills/hackernoon.html` (crane render f12 + lockup).
