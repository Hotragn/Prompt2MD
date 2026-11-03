// Word timings without an ASR model (whisper is unavailable on this machine).
// The script text is known exactly, so only *where* each word sits in its take
// has to be found: measure the voiced span and the pauses with ffmpeg
// silencedetect, map sentence/comma breaks onto the measured pauses, then share
// each voiced run between its words by spoken syllables. Accuracy is about
// ±0.1 s, which is enough for word-by-word captions and VO-cued reveals.
//
// Words are stored in their WRITTEN form ("prompt2md", "MCP", the URL) so the
// captions read like the brand, while their timing follows the spoken form.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// One entry per display word: [written text, spoken syllables].
const LINES = {
  1: [["You", 1], ["write", 1], ["prompts", 1], ["like", 1], ["this.", 1]],
  2: [["prompt2md", 5], ["folds", 1], ["it", 1], ["into", 2], ["clean", 1], ["Markdown.", 2]],
  3: [["Paste", 1], ["the", 1], ["mess.", 1], ["Hit", 1], ["Fold", 1], ["it.", 1]],
  4: [["Structured", 2], ["Markdown,", 2], ["an", 1], ["honest", 2], ["token", 2], ["count,", 1], ["and", 1], ["no", 1], ["API", 3], ["key.", 1]],
  5: [["Too", 1], ["long?", 1], ["Fold", 1], ["fourteen", 2], ["hundred", 2], ["tokens", 2], ["to", 1], ["under", 2], ["five", 1], ["hundred.", 2]],
  6: [["Other", 2], ["tools", 1], ["cut", 1], ["and", 1], ["hope.", 1], ["This", 1], ["folds.", 1]],
  7: [["Unfold", 2], ["any", 2], ["summary.", 3], ["The", 1], ["exact", 2], ["original", 4], ["comes", 1], ["back.", 1]],
  8: [["It", 1], ["plugs", 1], ["into", 2], ["Claude", 1], ["Code,", 1], ["Cursor,", 2], ["and", 1], ["any", 2], ["MCP", 3], ["client.", 2]],
  9: [["Open", 2], ["source.", 1], ["Try", 1], ["it", 1], ["at", 1], ["prompt2md.vercel.app.", 10]],
};

const breakAfter = (w) => /[.,?!]$/.test(w);

function analyse(file) {
  // silencedetect reports on stderr.
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.06", "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "";
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  const silences = [];
  let start = null;
  for (const line of log.split(/\r?\n/)) {
    const s = /silence_start: (-?[\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) {
      silences.push([start, Number(e[1])]);
      start = null;
    }
  }
  if (start !== null) silences.push([start, dur]);
  // Voiced span: after a leading silence, before a trailing one.
  let v0 = 0, v1 = dur;
  if (silences.length && silences[0][0] <= 0.02) v0 = silences[0][1];
  if (silences.length && silences.at(-1)[1] >= dur - 0.02) v1 = silences.at(-1)[0];
  const inner = silences.filter(([a, b]) => a > v0 + 0.01 && b < v1 - 0.01);
  return { dur, v0, v1, inner };
}

function align(frame, file) {
  const words = LINES[frame];
  const { v0, v1, inner } = analyse(file);
  // Groups split at punctuation; pauses are matched to breaks longest-first.
  const groups = [[]];
  words.forEach((w, i) => {
    groups.at(-1).push(i);
    if (breakAfter(w[0]) && i < words.length - 1) groups.push([]);
  });
  const nBreaks = groups.length - 1;
  const pauses = [...inner].sort((a, b) => b[1] - b[0] - (a[1] - a[0])).slice(0, nBreaks).sort((a, b) => a[0] - b[0]);
  // Voiced runs between the chosen pauses.
  const runs = [];
  let cur = v0;
  for (const [a, b] of pauses) {
    runs.push([cur, a]);
    cur = b;
  }
  runs.push([cur, v1]);
  const out = [];
  if (runs.length === groups.length) {
    groups.forEach((g, gi) => place(g, runs[gi]));
  } else {
    // Fewer measured pauses than breaks: one run, syllable-proportional.
    place(words.map((_, i) => i), [v0, v1]);
  }
  function place(idxs, [a, b]) {
    const total = idxs.reduce((s, i) => s + words[i][1], 0);
    let t = a;
    for (const i of idxs) {
      const d = ((b - a) * words[i][1]) / total;
      out[i] = { id: `w${frame}-${i}`, text: words[i][0], start: Number(t.toFixed(3)), end: Number((t + d).toFixed(3)) };
      t += d;
    }
  }
  return { words: out, v0, v1, pauses: pauses.length, breaks: nBreaks };
}

const meta = JSON.parse(readFileSync("audio_meta.json", "utf8"));
for (const v of meta.voices) {
  const id = String(v.frame).padStart(2, "0");
  const r = align(v.frame, `.hyperframes/voice-raw/${id}.wav`);
  v.words = r.words;
  v.words_source = "heuristic-silencedetect (no ASR available); written forms, spoken timing";
  console.log(id, `voiced ${r.v0.toFixed(2)}–${r.v1.toFixed(2)}s`, `breaks ${r.breaks} matched ${r.pauses}`, r.words.map((w) => `${w.text}@${w.start}`).join(" "));
}
writeFileSync("audio_meta.json", JSON.stringify(meta, null, 2));
