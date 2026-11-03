# Re-rendering the launch assets

Everything in `../` is built from this folder. The compositions load the site's real `globals.css` and `product.css` (copied verbatim from `apps/web/app/`). Every frame is a pure function of `t`, so a re-render gives the same pixels.

Needs Node 22+, ffmpeg on `PATH`, and Google Chrome. `puppeteer-core` is kept outside the repo so no `node_modules` lands in OneDrive. Point `P2MD_TOOL_DIR` at any folder where `npm i puppeteer-core` has been run.

```bash
# stills for review (writes PNGs to --dir)
node render.mjs vertical.html --w 450 --h 800 --dpr 2.4 --stills 2.0,4.1,12.9,19.2 --dir stills

# vertical video: frame 0 is the poster (t=4.1), then mux the score
node render.mjs vertical.html --w 450 --h 800 --dpr 2.4 --fps 30 --poster-t 4.1 --poster-out poster.png --out video-final.mp4
node audio/synth.mjs
ffmpeg -i video-final.mp4 -i audio/score.wav -filter_complex "[1:a]$(cat audio/loudnorm.filter)[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ../brag.mp4

# GIF and loop MP4, both from one lossless 1920x1080 master
node render.mjs loop.html --w 1200 --h 675 --dpr 1.6 --fps 30 --out /tmp/loop-master.mkv
ffmpeg -i /tmp/loop-master.mkv -vf "fps=15,scale=1200:675:flags=lanczos,palettegen=stats_mode=full" pal.png
ffmpeg -i /tmp/loop-master.mkv -i pal.png -lavfi "fps=15,scale=1200:675:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 ../prompt2md.gif

# HackerNoon featured still
node render.mjs feature.html --w 1400 --h 600 --dpr 1 --stills 0 --dir stills
```

`audio/loudnorm.filter` holds the measured values from a two-pass `loudnorm` (target -14 LUFS, -1.5 dBTP). Re-measure after changing the score. `synth.mjs` reads its cue times from the `T` object in `vertical.html`, so retiming the picture retimes the sound.

The on-screen text lives in `composition/content.js`, copied from real runs. Replace it only with output from a new run.
