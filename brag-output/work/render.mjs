// Frame-stepped renderer. Loads a composition, calls window.__render(t) for
// each frame, screenshots it, and pipes the PNGs straight into ffmpeg, so no
// frame ever touches the disk.
//
//   node render.mjs vertical.html --w 450 --h 800 --dpr 2.4 --fps 30 --out ../brag-silent.mp4
//   node render.mjs vertical.html --w 450 --h 800 --dpr 2.4 --stills 1,2.5,4 --dir stills
//   node render.mjs loop.html --w 1200 --h 675 --dpr 1 --fps 15 --png-seq frames-dir
//
// puppeteer-core lives outside the repo (P2MD_TOOL_DIR) so rendering never
// drops a node_modules tree into the working copy.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const toolDir = process.env.P2MD_TOOL_DIR;
if (!toolDir) throw new Error("set P2MD_TOOL_DIR to the folder holding puppeteer-core");
const require = createRequire(join(toolDir, "package.json"));
const puppeteer = require("puppeteer-core");

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const args = process.argv.slice(2);
const page = args[0];
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const W = Number(opt("w", 450));
const H = Number(opt("h", 800));
const DPR = Number(opt("dpr", 2.4));
const FPS = Number(opt("fps", 30));
const OUT = opt("out", null);
const STILLS = opt("stills", null);
const DIR = opt("dir", "stills");
const QUERY = opt("query", "");
const FROM = Number(opt("from", 0));
const TO = opt("to", null);
const CRF = opt("crf", "16");
// Frame 0 is what every platform grabs as the idle thumbnail, so it can be
// rendered from the strongest settled moment instead of t=0. Replacing that one
// frame (not adding one) keeps the duration and the audio sync unchanged.
const POSTER_T = opt("poster-t", null);
const POSTER_OUT = opt("poster-out", null);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "--disable-lcd-text",
    "--font-render-hinting=none",
    "--allow-file-access-from-files",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});

try {
  const tab = await browser.newPage();
  await tab.setViewport({ width: W, height: H, deviceScaleFactor: DPR });
  tab.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") console.error(`[page ${m.type()}] ${m.text()}`);
  });
  tab.on("pageerror", (e) => console.error(`[page error] ${e.message}`));
  const url = pathToFileURL(resolve(here, "composition", page)).href + (QUERY ? `?${QUERY}` : "");
  await tab.goto(url, { waitUntil: "load" });
  await tab.waitForFunction("window.__ready === true", { timeout: 60000 });
  const duration = await tab.evaluate("window.__duration");

  const snap = async (t) => {
    await tab.evaluate((tt) => window.__render(tt), t);
    // Two rAFs: style, layout and paint for this t have all landed before capture.
    await tab.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return tab.screenshot({ type: "png", optimizeForSpeed: false });
  };

  if (STILLS !== null) {
    const outDir = resolve(here, DIR);
    mkdirSync(outDir, { recursive: true });
    for (const s of STILLS.split(",")) {
      const t = Number(s);
      const buf = await snap(t);
      const file = join(outDir, `${page.replace(/\.html$/, "")}-${t.toFixed(2)}.png`);
      writeFileSync(file, buf);
      console.log(file);
    }
  } else {
    const end = TO === null ? duration : Number(TO);
    const frames = Math.round((end - FROM) * FPS);
    const outFile = resolve(here, OUT);
    const ff = spawn(
      "ffmpeg",
      [
        "-v", "error", "-y",
        "-f", "image2pipe", "-c:v", "png", "-framerate", String(FPS), "-i", "-",
        ...(outFile.endsWith(".mp4")
          ? [
              "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
              "-c:v", "libx264", "-preset", "slow", "-crf", CRF, "-tune", "animation",
              "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
              "-movflags", "+faststart",
            ]
          : ["-c:v", "ffv1"]),
        outFile,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
    const started = Date.now();
    for (let i = 0; i < frames; i++) {
      const poster = i === 0 && POSTER_T !== null;
      const buf = await snap(poster ? Number(POSTER_T) : FROM + i / FPS);
      if (poster && POSTER_OUT !== null) writeFileSync(resolve(here, POSTER_OUT), buf);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 30 === 0) {
        const secs = (Date.now() - started) / 1000;
        process.stderr.write(`frame ${i}/${frames}  ${(secs / (i + 1)).toFixed(3)} s/frame\r`);
      }
    }
    ff.stdin.end();
    await done;
    console.log(`\nwrote ${outFile} (${frames} frames)`);
  }
} finally {
  await browser.close();
}
